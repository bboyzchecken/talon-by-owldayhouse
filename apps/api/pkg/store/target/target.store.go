// Package target is the repository for quarterly sales targets.
package target

import (
	"github.com/owldayhouse/odh-internal-api/pkg/models"
	"go.uber.org/fx"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type targetStoreService struct {
	db *gorm.DB
}

// New builds the target repository.
func New(db *gorm.DB) models.TargetStore {
	return &targetStoreService{db: db}
}

// Module is the FX wiring for this repository.
var Module = fx.Module("store.target", fx.Provide(New))

// Upsert writes one sales person's target for one quarter.
func (s *targetStoreService) Upsert(row *models.Target) error {
	return s.db.Clauses(clause.OnConflict{
		Columns: []clause.Column{{Name: "user_id"}, {Name: "year"}, {Name: "quarter"}},
		DoUpdates: clause.AssignmentColumns([]string{
			"revenue_target", "proposals_target", "meetings_target", "updated_at",
		}),
	}).Create(row).Error
}

func (s *targetStoreService) Find(userID uint, year, quarter int) (*models.Target, error) {
	var row models.Target
	err := s.db.Where("user_id = ? AND year = ? AND quarter = ?", userID, year, quarter).
		First(&row).Error
	if err != nil {
		return nil, err
	}
	return &row, nil
}

func (s *targetStoreService) List(year, quarter int) ([]*models.Target, error) {
	q := s.db.Model(&models.Target{})
	if year > 0 {
		q = q.Where("year = ?", year)
	}
	if quarter > 0 {
		q = q.Where("quarter = ?", quarter)
	}

	var rows []*models.Target
	err := q.Preload("User").Order("year DESC, quarter DESC, user_id ASC").Find(&rows).Error
	return rows, err
}
