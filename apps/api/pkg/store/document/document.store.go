// Package document is the repository for sales documents and expenses.
//
// State changes (edit, issue, void, delete) each run in one transaction that
// starts by locking the document's row. That is what keeps two people from
// issuing the same draft twice, or editing a draft while it is being issued.
package document

import (
	"strings"
	"time"

	"go.uber.org/fx"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"

	"github.com/owldayhouse/odh-internal-api/pkg/docnumber"
	"github.com/owldayhouse/odh-internal-api/pkg/models"
)

type documentStoreService struct {
	db *gorm.DB
}

// New builds the document repository.
func New(db *gorm.DB) models.DocumentStore {
	return &documentStoreService{db: db}
}

// Module is the FX wiring for this repository.
var Module = fx.Module("store.document", fx.Provide(New))

func lockDocument(tx *gorm.DB, id uint) (*models.Document, error) {
	var doc models.Document
	if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(&doc, id).Error; err != nil {
		return nil, err
	}
	return &doc, nil
}

func positionItems(doc *models.Document) {
	for i := range doc.Items {
		doc.Items[i].ID = 0
		doc.Items[i].DocumentID = doc.ID
		doc.Items[i].Position = i + 1
	}
}

func (s *documentStoreService) CreateDraft(doc *models.Document, userID uint) error {
	return s.db.Transaction(func(tx *gorm.DB) error {
		doc.Status = models.DocStatusDraft
		doc.Code = ""
		doc.CreatedBy = userID
		items := doc.Items
		doc.Items = nil
		if err := tx.Omit(clause.Associations).Create(doc).Error; err != nil {
			return err
		}
		doc.Items = items
		positionItems(doc)
		if len(doc.Items) > 0 {
			if err := tx.Create(&doc.Items).Error; err != nil {
				return err
			}
		}
		return tx.Create(&models.DocumentEvent{DocumentID: &doc.ID, UserID: userID, Action: models.DocEventCreated}).Error
	})
}

// UpdateDraft replaces a draft's header and lines. The number, status and
// who created it never change here.
func (s *documentStoreService) UpdateDraft(doc *models.Document, userID uint) error {
	return s.db.Transaction(func(tx *gorm.DB) error {
		current, err := lockDocument(tx, doc.ID)
		if err != nil {
			return err
		}
		if current.Status != models.DocStatusDraft {
			return models.ErrDocumentNotDraft
		}
		doc.Status = models.DocStatusDraft
		doc.Code = ""
		doc.CreatedBy = current.CreatedBy
		doc.CreatedAt = current.CreatedAt
		doc.PeakSync = current.PeakSync

		items := doc.Items
		doc.Items = nil
		if err := tx.Omit(clause.Associations).Save(doc).Error; err != nil {
			return err
		}
		if err := tx.Where("document_id = ?", doc.ID).Delete(&models.DocumentItem{}).Error; err != nil {
			return err
		}
		doc.Items = items
		positionItems(doc)
		if len(doc.Items) > 0 {
			if err := tx.Create(&doc.Items).Error; err != nil {
				return err
			}
		}
		return tx.Create(&models.DocumentEvent{DocumentID: &doc.ID, UserID: userID, Action: models.DocEventEdited}).Error
	})
}

// DeleteDraft removes a draft that was never issued. An issued document is
// never deleted: it is voided and keeps its number.
func (s *documentStoreService) DeleteDraft(id uint) error {
	return s.db.Transaction(func(tx *gorm.DB) error {
		doc, err := lockDocument(tx, id)
		if err != nil {
			return err
		}
		if doc.Status != models.DocStatusDraft {
			return models.ErrDocumentNotDraft
		}
		// A document made from this draft would point at nothing.
		if err := tx.Model(&models.Document{}).Where("source_document_id = ?", id).
			Update("source_document_id", nil).Error; err != nil {
			return err
		}
		if err := tx.Where("document_id = ?", id).Delete(&models.DocumentEvent{}).Error; err != nil {
			return err
		}
		if err := tx.Where("document_id = ?", id).Delete(&models.DocumentItem{}).Error; err != nil {
			return err
		}
		return tx.Delete(&models.Document{}, id).Error
	})
}

func (s *documentStoreService) Issue(id, userID uint, check func(*models.Document) error) (*models.Document, error) {
	err := s.db.Transaction(func(tx *gorm.DB) error {
		doc, err := lockDocument(tx, id)
		if err != nil {
			return err
		}
		if doc.Status != models.DocStatusDraft {
			return models.ErrDocumentNotDraft
		}
		if check != nil {
			if err := tx.Preload("Items", func(db *gorm.DB) *gorm.DB { return db.Order("position") }).
				Preload("Contact").First(doc, id).Error; err != nil {
				return err
			}
			if err := check(doc); err != nil {
				return err
			}
		}

		code, err := docnumber.Reserve(tx, doc.DocType, doc.IssuedDate)
		if err != nil {
			return err
		}
		now := time.Now()
		if err := tx.Model(&models.Document{}).Where("id = ?", id).Updates(map[string]interface{}{
			"code":       code,
			"status":     models.DocStatusIssued,
			"issued_by":  userID,
			"issued_at":  now,
			"updated_at": now,
		}).Error; err != nil {
			return err
		}
		return tx.Create(&models.DocumentEvent{
			DocumentID: &doc.ID, UserID: userID, Action: models.DocEventIssued, Note: code,
		}).Error
	})
	if err != nil {
		return nil, err
	}
	return s.Find(id)
}

func (s *documentStoreService) Void(id, userID uint, reason string) (*models.Document, error) {
	err := s.db.Transaction(func(tx *gorm.DB) error {
		doc, err := lockDocument(tx, id)
		if err != nil {
			return err
		}
		if doc.Status != models.DocStatusIssued {
			return models.ErrDocumentNotIssued
		}
		now := time.Now()
		if err := tx.Model(&models.Document{}).Where("id = ?", id).Updates(map[string]interface{}{
			"status":      models.DocStatusVoided,
			"voided_by":   userID,
			"voided_at":   now,
			"void_reason": reason,
			"updated_at":  now,
		}).Error; err != nil {
			return err
		}
		return tx.Create(&models.DocumentEvent{
			DocumentID: &doc.ID, UserID: userID, Action: models.DocEventVoided, Note: reason,
		}).Error
	})
	if err != nil {
		return nil, err
	}
	return s.Find(id)
}

func (s *documentStoreService) Find(id uint) (*models.Document, error) {
	var doc models.Document
	err := s.db.
		Preload("Items", func(db *gorm.DB) *gorm.DB { return db.Order("position") }).
		Preload("Contact").
		Preload("SourceDocument").
		First(&doc, id).Error
	if err != nil {
		return nil, err
	}
	return &doc, nil
}

func (s *documentStoreService) List(filter models.DocumentFilter) ([]*models.Document, int64, error) {
	q := s.db.Model(&models.Document{})
	if filter.DocType != 0 {
		q = q.Where("documents.doc_type = ?", filter.DocType)
	}
	if filter.Status != "" {
		q = q.Where("documents.status = ?", filter.Status)
	}
	if filter.ContactID != 0 {
		q = q.Where("documents.contact_id = ?", filter.ContactID)
	}
	if filter.LeadID != 0 {
		q = q.Where("documents.lead_id = ?", filter.LeadID)
	}
	if filter.OwnerUserID != nil {
		q = q.Where("documents.lead_id IN (SELECT id FROM leads WHERE owner_user_id = ?)", *filter.OwnerUserID)
	}
	if filter.From != nil {
		q = q.Where("documents.issued_date >= ?", *filter.From)
	}
	if filter.To != nil {
		q = q.Where("documents.issued_date <= ?", *filter.To)
	}
	if search := strings.TrimSpace(filter.Search); search != "" {
		like := "%" + strings.ToLower(search) + "%"
		q = q.Where(`LOWER(documents.code) LIKE ? OR LOWER(documents.reference) LIKE ?
			OR documents.contact_id IN (SELECT id FROM billing_contacts WHERE LOWER(name) LIKE ?)`, like, like, like)
	}

	var total int64
	if err := q.Count(&total).Error; err != nil {
		return nil, 0, err
	}
	limit := filter.Limit
	if limit <= 0 || limit > 200 {
		limit = 50
	}
	page := filter.Page
	if page < 1 {
		page = 1
	}
	var rows []*models.Document
	err := q.Preload("Contact").
		Order("documents.issued_date DESC, documents.id DESC").
		Offset((page - 1) * limit).Limit(limit).
		Find(&rows).Error
	return rows, total, err
}

func (s *documentStoreService) AddEvent(event *models.DocumentEvent) error {
	return s.db.Create(event).Error
}

func (s *documentStoreService) ListEvents(documentID uint) ([]*models.DocumentEvent, error) {
	var rows []*models.DocumentEvent
	err := s.db.Preload("User").Where("document_id = ?", documentID).Order("created_at, id").Find(&rows).Error
	return rows, err
}

func (s *documentStoreService) FindContact(id uint) (*models.BillingContact, error) {
	var contact models.BillingContact
	if err := s.db.First(&contact, id).Error; err != nil {
		return nil, err
	}
	return &contact, nil
}
