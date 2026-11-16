// Package register is the repository for the document system's registers:
// billing contacts, products and payment methods.
package register

import (
	"errors"
	"fmt"
	"strconv"
	"strings"

	"github.com/jackc/pgx/v5/pgconn"
	"go.uber.org/fx"
	"gorm.io/gorm"

	"github.com/owldayhouse/odh-internal-api/pkg/models"
)

type registerStoreService struct {
	db *gorm.DB
}

// New builds the register repository.
func New(db *gorm.DB) models.RegisterStore {
	return &registerStoreService{db: db}
}

// Module is the FX wiring for this repository.
var Module = fx.Module("store.register", fx.Provide(New))

// uniqueViolation turns PostgreSQL's 23505 into ErrCodeTaken.
func uniqueViolation(err error) error {
	var pgErr *pgconn.PgError
	if errors.As(err, &pgErr) && pgErr.Code == "23505" {
		return models.ErrCodeTaken
	}
	return err
}

func like(search string) string { return "%" + strings.ToLower(strings.TrimSpace(search)) + "%" }

// --- contacts ------------------------------------------------------------------

func (s *registerStoreService) ListContacts(filter models.ContactFilter) ([]*models.BillingContact, int64, error) {
	q := s.db.Model(&models.BillingContact{})
	if strings.TrimSpace(filter.Search) != "" {
		l := like(filter.Search)
		q = q.Where("LOWER(name) LIKE ? OR LOWER(code) LIKE ? OR tax_number LIKE ?", l, l, l)
	}
	switch filter.Side {
	case models.FinanceCustomer:
		q = q.Where("finance_side IN ?", []string{models.FinanceCustomer, models.FinanceBoth})
	case models.FinanceVendor:
		q = q.Where("finance_side IN ?", []string{models.FinanceVendor, models.FinanceBoth})
	}
	if filter.LeadID != 0 {
		q = q.Where("lead_id = ?", filter.LeadID)
	}
	if filter.OwnerUserID != nil {
		q = q.Where("lead_id IN (SELECT id FROM leads WHERE owner_user_id = ?)", *filter.OwnerUserID)
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
	var rows []*models.BillingContact
	err := q.Order("name").Offset((page - 1) * limit).Limit(limit).Find(&rows).Error
	return rows, total, err
}

func (s *registerStoreService) FindContact(id uint) (*models.BillingContact, error) {
	var row models.BillingContact
	if err := s.db.First(&row, id).Error; err != nil {
		return nil, err
	}
	return &row, nil
}

// nextCode is the code after the highest PREFIX-#### in the table.
func nextCode(tx *gorm.DB, table, prefix string) (string, error) {
	var codes []string
	err := tx.Table(table).
		Where("code ~ ?", "^"+prefix+"-[0-9]+$").
		Order("LENGTH(code) DESC, code DESC").Limit(1).
		Pluck("code", &codes).Error
	if err != nil {
		return "", err
	}
	next := 1
	if len(codes) == 1 {
		n, err := strconv.Atoi(strings.TrimPrefix(codes[0], prefix+"-"))
		if err == nil {
			next = n + 1
		}
	}
	return fmt.Sprintf("%s-%04d", prefix, next), nil
}

func (s *registerStoreService) CreateContact(contact *models.BillingContact) error {
	if contact.Code != "" {
		return uniqueViolation(s.db.Create(contact).Error)
	}
	prefix := "C"
	if contact.FinanceSide == models.FinanceVendor {
		prefix = "V"
	}
	// One transaction per new code, holding an advisory lock for the prefix:
	// people adding contacts at the same moment get C-0007, C-0008 … in turn
	// instead of racing for the same number.
	return s.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Exec(`SELECT pg_advisory_xact_lock(hashtext(?))`, "billing_contacts:"+prefix).Error; err != nil {
			return err
		}
		code, err := nextCode(tx, "billing_contacts", prefix)
		if err != nil {
			return err
		}
		contact.Code = code
		return uniqueViolation(tx.Create(contact).Error)
	})
}

func (s *registerStoreService) UpdateContact(contact *models.BillingContact) error {
	return uniqueViolation(s.db.Save(contact).Error)
}

// DeleteContact removes a contact no document uses. One that is used stays:
// an issued document must always show the contact it was issued to.
func (s *registerStoreService) DeleteContact(id uint) error {
	var used int64
	if err := s.db.Model(&models.Document{}).Where("contact_id = ?", id).Count(&used).Error; err != nil {
		return err
	}
	if used > 0 {
		return models.ErrRegisterInUse
	}
	return s.db.Delete(&models.BillingContact{}, id).Error
}

// --- products ------------------------------------------------------------------

func (s *registerStoreService) ListProducts(search string, includeInactive bool, limit int) ([]*models.Product, error) {
	q := s.db.Model(&models.Product{})
	if !includeInactive {
		q = q.Where("active")
	}
	if strings.TrimSpace(search) != "" {
		l := like(search)
		q = q.Where("LOWER(name) LIKE ? OR LOWER(code) LIKE ?", l, l)
	}
	if limit <= 0 || limit > 500 {
		limit = 200
	}
	var rows []*models.Product
	err := q.Order("code").Limit(limit).Find(&rows).Error
	return rows, err
}

func (s *registerStoreService) FindProduct(id uint) (*models.Product, error) {
	var row models.Product
	if err := s.db.First(&row, id).Error; err != nil {
		return nil, err
	}
	return &row, nil
}

func (s *registerStoreService) CreateProduct(product *models.Product) error {
	return uniqueViolation(s.db.Create(product).Error)
}

func (s *registerStoreService) UpdateProduct(product *models.Product) error {
	return uniqueViolation(s.db.Save(product).Error)
}

// --- payment methods -----------------------------------------------------------

func (s *registerStoreService) ListPaymentMethods(includeInactive bool) ([]*models.PaymentMethod, error) {
	q := s.db.Model(&models.PaymentMethod{})
	if !includeInactive {
		q = q.Where("active")
	}
	var rows []*models.PaymentMethod
	err := q.Order("code").Find(&rows).Error
	return rows, err
}

func (s *registerStoreService) FindPaymentMethod(id uint) (*models.PaymentMethod, error) {
	var row models.PaymentMethod
	if err := s.db.First(&row, id).Error; err != nil {
		return nil, err
	}
	return &row, nil
}

func (s *registerStoreService) CreatePaymentMethod(method *models.PaymentMethod) error {
	return uniqueViolation(s.db.Create(method).Error)
}

func (s *registerStoreService) UpdatePaymentMethod(method *models.PaymentMethod) error {
	return uniqueViolation(s.db.Save(method).Error)
}
