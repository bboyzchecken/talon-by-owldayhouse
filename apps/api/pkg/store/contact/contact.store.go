// Package contact is the repository for people at a customer company.
package contact

import (
	"github.com/owldayhouse/odh-internal-api/pkg/models"
	"go.uber.org/fx"
	"gorm.io/gorm"
)

type contactStoreService struct {
	db *gorm.DB
}

// New builds the contact repository.
func New(db *gorm.DB) models.ContactStore {
	return &contactStoreService{db: db}
}

// Module is the FX wiring for this repository.
var Module = fx.Module("store.contact", fx.Provide(New))

func (s *contactStoreService) Create(row *models.Contact) error {
	return s.db.Create(row).Error
}

func (s *contactStoreService) Find(id uint) (*models.Contact, error) {
	var row models.Contact
	if err := s.db.First(&row, id).Error; err != nil {
		return nil, err
	}
	return &row, nil
}

func (s *contactStoreService) ListByLead(leadID uint) ([]*models.Contact, error) {
	var rows []*models.Contact
	err := s.db.Where("lead_id = ?", leadID).Order("created_at ASC").Find(&rows).Error
	return rows, err
}

func (s *contactStoreService) Update(row *models.Contact) error {
	return s.db.Save(row).Error
}

// Delete removes the contact outright — personal data is deleted, not flagged.
func (s *contactStoreService) Delete(id uint) error {
	return s.db.Delete(&models.Contact{}, id).Error
}
