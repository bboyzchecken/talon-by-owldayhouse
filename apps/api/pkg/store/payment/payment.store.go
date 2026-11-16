// Package payment is the repository for money received against documents.
//
// Recording a payment locks the document it pays first, so two people
// recording payments on one invoice at once cannot both push it past its
// total. When the payment comes with a receipt/tax invoice, the receipt is
// built, numbered and issued in that same transaction: either the money and
// its receipt are both recorded, or neither is.
package payment

import (
	"time"

	"github.com/shopspring/decimal"
	"go.uber.org/fx"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"

	"github.com/owldayhouse/odh-internal-api/pkg/docmath"
	"github.com/owldayhouse/odh-internal-api/pkg/docnumber"
	"github.com/owldayhouse/odh-internal-api/pkg/models"
)

type paymentStoreService struct {
	db *gorm.DB
}

// New builds the payment repository.
func New(db *gorm.DB) models.PaymentStore {
	return &paymentStoreService{db: db}
}

// Module is the FX wiring for this repository.
var Module = fx.Module("store.payment", fx.Provide(New))

func lockDocument(tx *gorm.DB, id uint) (*models.Document, error) {
	var doc models.Document
	if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(&doc, id).Error; err != nil {
		return nil, err
	}
	return &doc, nil
}

func lockPayment(tx *gorm.DB, id uint) (*models.Payment, error) {
	var p models.Payment
	if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(&p, id).Error; err != nil {
		return nil, err
	}
	return &p, nil
}

// sums returns, for a document's active payments: everything settled, what
// is settled by payments that already have a receipt, and the VAT on those
// receipts.
func sums(tx *gorm.DB, documentID uint) (settled, receiptedSettled, receiptedVat decimal.Decimal, err error) {
	var row struct {
		Settled, Receipted, Vat decimal.Decimal
	}
	err = tx.Raw(`
		SELECT COALESCE(SUM(p.settled_amount), 0) AS settled,
		       COALESCE(SUM(p.settled_amount) FILTER (WHERE p.receipt_id IS NOT NULL), 0) AS receipted,
		       COALESCE(SUM(d.vat_amount) FILTER (WHERE p.receipt_id IS NOT NULL), 0) AS vat
		  FROM payments p
		  LEFT JOIN documents d ON d.id = p.receipt_id
		 WHERE p.document_id = ? AND p.status = ?`, documentID, models.PaymentActive).Scan(&row).Error
	return row.Settled, row.Receipted, row.Vat, err
}

// issueReceipt builds the receipt for a payment on a locked source, takes a
// number and saves it issued, with the buyer as they are now.
func issueReceipt(tx *gorm.DB, source *models.Document, plan *models.ReceiptPlan, userID uint) (*models.Document, error) {
	_, receiptedSettled, receiptedVat, err := sums(tx, source.ID)
	if err != nil {
		return nil, err
	}
	// Everything the receipt is built from is read through this transaction:
	// a second connection here, while this one holds the lock, can exhaust a
	// small pool when several payments arrive at once and wait forever.
	if err := tx.Preload("Items", func(db *gorm.DB) *gorm.DB { return db.Order("position") }).
		First(source, source.ID).Error; err != nil {
		return nil, err
	}
	receipt, err := plan.Build(source, receiptedSettled, receiptedVat)
	if err != nil {
		return nil, err
	}
	var contact models.BillingContact
	if err := tx.First(&contact, receipt.ContactID).Error; err != nil {
		return nil, err
	}
	receipt.Contact = &contact
	if plan.Check != nil {
		if err := plan.Check(receipt); err != nil {
			return nil, err
		}
	}

	code, err := docnumber.Reserve(tx, receipt.DocType, receipt.IssuedDate)
	if err != nil {
		return nil, err
	}
	now := time.Now()
	receipt.Code = code
	receipt.Status = models.DocStatusIssued
	receipt.IssuedBy = &userID
	receipt.IssuedAt = &now
	receipt.CreatedBy = userID
	receipt.BuyerName = contact.Name
	receipt.BuyerContactType = contact.ContactType
	receipt.BuyerTaxNumber = contact.TaxNumber
	receipt.BuyerBranchCode = contact.BranchCode
	receipt.BuyerAddress = contact.FullAddress()

	items := receipt.Items
	receipt.Items = nil
	receipt.Contact = nil
	if err := tx.Omit(clause.Associations).Create(receipt).Error; err != nil {
		return nil, err
	}
	for i := range items {
		items[i].ID = 0
		items[i].DocumentID = receipt.ID
		items[i].Position = i + 1
	}
	if len(items) > 0 {
		if err := tx.Create(&items).Error; err != nil {
			return nil, err
		}
	}
	receipt.Items = items
	if err := tx.Create(&models.DocumentEvent{
		DocumentID: &receipt.ID, UserID: userID, Action: models.DocEventIssued,
		Note: code + " จากการรับเงินตาม " + source.Code,
	}).Error; err != nil {
		return nil, err
	}
	return receipt, nil
}

func (s *paymentStoreService) Record(payment *models.Payment, plan *models.ReceiptPlan) error {
	return s.db.Transaction(func(tx *gorm.DB) error {
		source, err := lockDocument(tx, payment.DocumentID)
		if err != nil {
			return err
		}
		if source.Status != models.DocStatusIssued {
			return models.ErrNotPayable
		}
		settled, _, _, err := sums(tx, source.ID)
		if err != nil {
			return err
		}
		if settled.Add(payment.SettledAmount).GreaterThan(source.NetAmount) {
			return models.ErrOverpaid
		}

		// The payment is saved before its receipt is built, so the receipt's
		// sums see it as "not yet receipted" and the balance closes correctly.
		if err := tx.Omit(clause.Associations).Create(payment).Error; err != nil {
			return err
		}
		if plan != nil {
			receipt, err := issueReceipt(tx, source, plan, payment.CreatedBy)
			if err != nil {
				return err
			}
			payment.ReceiptID = &receipt.ID
			if err := tx.Model(payment).Update("receipt_id", receipt.ID).Error; err != nil {
				return err
			}
		}
		return tx.Create(&models.DocumentEvent{
			DocumentID: &source.ID, UserID: payment.CreatedBy, Action: models.DocEventPayment,
			Note: moneyVerb(payment.Direction) + " " + docmath.Baht(payment.SettledAmount) + " บาท",
		}).Error
	})
}

func (s *paymentStoreService) IssueReceipt(paymentID, userID uint, plan *models.ReceiptPlan) (*models.Payment, error) {
	err := s.db.Transaction(func(tx *gorm.DB) error {
		payment, err := lockPayment(tx, paymentID)
		if err != nil {
			return err
		}
		if payment.Status != models.PaymentActive {
			return models.ErrPaymentVoided
		}
		if payment.ReceiptID != nil {
			return models.ErrReceiptExists
		}
		if payment.Direction != models.PaymentIn {
			// Paying a vendor issues nothing of ours.
			return models.ErrNotPayable
		}
		source, err := lockDocument(tx, payment.DocumentID)
		if err != nil {
			return err
		}
		receipt, err := issueReceipt(tx, source, plan, userID)
		if err != nil {
			return err
		}
		return tx.Model(payment).Update("receipt_id", receipt.ID).Error
	})
	if err != nil {
		return nil, err
	}
	return s.Find(paymentID)
}

// Void cancels a payment and the receipt issued for it. Both keep their rows
// and the receipt keeps its number.
func (s *paymentStoreService) Void(paymentID, userID uint, reason string) (*models.Payment, error) {
	err := s.db.Transaction(func(tx *gorm.DB) error {
		payment, err := lockPayment(tx, paymentID)
		if err != nil {
			return err
		}
		if payment.Status != models.PaymentActive {
			return models.ErrPaymentVoided
		}
		now := time.Now()
		if err := tx.Model(payment).Updates(map[string]interface{}{
			"status": models.PaymentVoided, "voided_by": userID, "voided_at": now, "void_reason": reason,
		}).Error; err != nil {
			return err
		}
		if payment.ReceiptID != nil {
			receipt, err := lockDocument(tx, *payment.ReceiptID)
			if err != nil {
				return err
			}
			if receipt.Status == models.DocStatusIssued {
				if err := tx.Model(receipt).Updates(map[string]interface{}{
					"status": models.DocStatusVoided, "voided_by": userID, "voided_at": now,
					"void_reason": "ยกเลิกการรับเงิน: " + reason,
				}).Error; err != nil {
					return err
				}
				if err := tx.Create(&models.DocumentEvent{
					DocumentID: &receipt.ID, UserID: userID, Action: models.DocEventVoided,
					Note: "ยกเลิกการรับเงิน: " + reason,
				}).Error; err != nil {
					return err
				}
			}
		}
		return tx.Create(&models.DocumentEvent{
			DocumentID: &payment.DocumentID, UserID: userID, Action: models.DocEventPayment,
			Note: "ยกเลิกการ" + moneyVerb(payment.Direction) + " " + docmath.Baht(payment.SettledAmount) + " บาท: " + reason,
		}).Error
	})
	if err != nil {
		return nil, err
	}
	return s.Find(paymentID)
}

// MarkWhtCert records that the withholding certificate is in hand. It needs
// the certificate itself: a ready file attached to the payment as such.
func (s *paymentStoreService) MarkWhtRequested(paymentIDs []uint, userID uint) ([]*models.Payment, error) {
	var marked []*models.Payment
	err := s.db.Transaction(func(tx *gorm.DB) error {
		var rows []*models.Payment
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
			Where("id IN ? AND status = ? AND direction = ? AND wht_cert_status = ?",
				paymentIDs, models.PaymentActive, models.PaymentOut, models.WhtCertPending).
			Order("id").Find(&rows).Error; err != nil {
			return err
		}
		now := time.Now()
		for _, p := range rows {
			if err := tx.Model(&models.Payment{}).Where("id = ?", p.ID).
				Update("wht_requested_at", now).Error; err != nil {
				return err
			}
			docID := p.DocumentID
			if err := tx.Create(&models.DocumentEvent{
				DocumentID: &docID, UserID: userID, Action: models.DocEventWhtRequested,
				Note: "ขอให้สำนักบัญชีออก 50 ทวิ ภาษีที่หัก " + docmath.Baht(p.WithholdingAmount) + " บาท",
			}).Error; err != nil {
				return err
			}
			p.WhtRequestedAt = &now
		}
		marked = rows
		return nil
	})
	return marked, err
}

func (s *paymentStoreService) MarkWhtCert(paymentID uint) (*models.Payment, error) {
	err := s.db.Transaction(func(tx *gorm.DB) error {
		payment, err := lockPayment(tx, paymentID)
		if err != nil {
			return err
		}
		if payment.Status != models.PaymentActive {
			return models.ErrPaymentVoided
		}
		if !payment.WithholdingAmount.IsPositive() {
			return models.ErrNothingWithheld
		}
		var files int64
		if err := tx.Model(&models.File{}).
			Where("owner_type = ? AND owner_id = ? AND status = ?", models.FileOwnerPaymentWht, payment.ID, models.FileStatusReady).
			Count(&files).Error; err != nil {
			return err
		}
		if files == 0 {
			return models.ErrNoWhtCertificate
		}
		return tx.Model(payment).Updates(map[string]interface{}{
			"wht_cert_status": models.WhtCertDone, "wht_cert_at": time.Now(),
		}).Error
	})
	if err != nil {
		return nil, err
	}
	return s.Find(paymentID)
}

func (s *paymentStoreService) Find(id uint) (*models.Payment, error) {
	var p models.Payment
	err := s.db.Preload("PaymentMethod").Preload("Receipt").Preload("Creator").
		Preload("Document").Preload("Document.Contact").First(&p, id).Error
	if err != nil {
		return nil, err
	}
	return &p, nil
}

func (s *paymentStoreService) ListByDocument(documentID uint) ([]*models.Payment, error) {
	var rows []*models.Payment
	err := s.db.Preload("PaymentMethod").Preload("Receipt").Preload("Creator").
		Where("document_id = ?", documentID).Order("payment_date, id").Find(&rows).Error
	return rows, err
}

func (s *paymentStoreService) List(filter models.PaymentFilter) ([]*models.Payment, int64, error) {
	q := s.db.Model(&models.Payment{})
	if filter.Direction != "" {
		q = q.Where("direction = ?", filter.Direction)
	}
	if filter.WhtCertStatus != "" {
		q = q.Where("wht_cert_status = ?", filter.WhtCertStatus)
	}
	if filter.DocumentID != 0 {
		q = q.Where("document_id = ?", filter.DocumentID)
	}
	if !filter.IncludeVoided {
		q = q.Where("status = ?", models.PaymentActive)
	}
	if filter.From != nil {
		q = q.Where("payment_date >= ?", *filter.From)
	}
	if filter.To != nil {
		q = q.Where("payment_date <= ?", *filter.To)
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
	var rows []*models.Payment
	err := q.Preload("PaymentMethod").Preload("Receipt").Preload("Document").Preload("Document.Contact").
		Order("payment_date DESC, id DESC").Offset((page - 1) * limit).Limit(limit).Find(&rows).Error
	return rows, total, err
}

func (s *paymentStoreService) Settled(documentID uint) (decimal.Decimal, error) {
	settled, _, _, err := sums(s.db, documentID)
	return settled, err
}

func (s *paymentStoreService) SettledFor(documentIDs []uint) (map[uint]decimal.Decimal, error) {
	out := make(map[uint]decimal.Decimal, len(documentIDs))
	if len(documentIDs) == 0 {
		return out, nil
	}
	var rows []struct {
		DocumentID uint
		Settled    decimal.Decimal
	}
	err := s.db.Model(&models.Payment{}).
		Select("document_id, COALESCE(SUM(settled_amount), 0) AS settled").
		Where("document_id IN ? AND status = ?", documentIDs, models.PaymentActive).
		Group("document_id").Scan(&rows).Error
	for _, r := range rows {
		out[r.DocumentID] = r.Settled
	}
	return out, err
}

func moneyVerb(direction string) string {
	if direction == models.PaymentOut {
		return "จ่ายเงิน"
	}
	return "รับเงิน"
}
