// Package deal is the repository for money won on a lead.
package deal

import (
	"github.com/owldayhouse/odh-internal-api/pkg/models"
	"go.uber.org/fx"
	"gorm.io/gorm"
)

type dealStoreService struct {
	db *gorm.DB
}

// New builds the deal repository.
func New(db *gorm.DB) models.DealStore {
	return &dealStoreService{db: db}
}

// Module is the FX wiring for this repository.
var Module = fx.Module("store.deal", fx.Provide(New))

func (s *dealStoreService) Create(row *models.Deal) error {
	return s.db.Create(row).Error
}

func (s *dealStoreService) Find(id uint) (*models.Deal, error) {
	var row models.Deal
	if err := s.db.First(&row, id).Error; err != nil {
		return nil, err
	}
	return &row, nil
}

func (s *dealStoreService) ListByLead(leadID uint) ([]*models.Deal, error) {
	var rows []*models.Deal
	err := s.db.Where("lead_id = ?", leadID).Order("won_at DESC").Find(&rows).Error
	return rows, err
}

func (s *dealStoreService) Delete(id uint) error {
	return s.db.Delete(&models.Deal{}, id).Error
}
