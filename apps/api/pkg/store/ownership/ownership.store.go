// Package ownership is the repository for the lead ownership audit trail.
package ownership

import (
	"github.com/owldayhouse/odh-internal-api/pkg/models"
	"go.uber.org/fx"
	"gorm.io/gorm"
)

type ownershipStoreService struct {
	db *gorm.DB
}

// New builds the ownership log repository.
func New(db *gorm.DB) models.OwnershipLogStore {
	return &ownershipStoreService{db: db}
}

// Module is the FX wiring for this repository.
var Module = fx.Module("store.ownership", fx.Provide(New))

func (s *ownershipStoreService) Create(row *models.OwnershipLog) error {
	return s.db.Create(row).Error
}

func (s *ownershipStoreService) ListByLead(leadID uint) ([]*models.OwnershipLog, error) {
	var rows []*models.OwnershipLog
	err := s.db.Preload("ChangedByUser").
		Where("lead_id = ?", leadID).
		Order("created_at DESC").Find(&rows).Error
	return rows, err
}

// ListRecent backs the admin screen's ownership history.
func (s *ownershipStoreService) ListRecent(limit int) ([]*models.OwnershipLog, error) {
	if limit < 1 || limit > 500 {
		limit = 100
	}
	var rows []*models.OwnershipLog
	err := s.db.Preload("ChangedByUser").Preload("Lead").
		Order("created_at DESC").Limit(limit).Find(&rows).Error
	return rows, err
}
