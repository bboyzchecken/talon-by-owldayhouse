// Package activity is the repository for touches on a lead.
package activity

import (
	"github.com/owldayhouse/odh-internal-api/pkg/models"
	"go.uber.org/fx"
	"gorm.io/gorm"
)

type activityStoreService struct {
	db *gorm.DB
}

// New builds the activity repository.
func New(db *gorm.DB) models.ActivityStore {
	return &activityStoreService{db: db}
}

// Module is the FX wiring for this repository.
var Module = fx.Module("store.activity", fx.Provide(New))

func (s *activityStoreService) Create(row *models.Activity) error {
	return s.db.Create(row).Error
}

func (s *activityStoreService) Find(id uint) (*models.Activity, error) {
	var row models.Activity
	if err := s.db.Preload("User").First(&row, id).Error; err != nil {
		return nil, err
	}
	return &row, nil
}

func (s *activityStoreService) ListByLead(leadID uint) ([]*models.Activity, error) {
	var rows []*models.Activity
	err := s.db.Preload("User").
		Where("lead_id = ?", leadID).
		Order("happened_at DESC, id DESC").Find(&rows).Error
	return rows, err
}

// UpcomingMeetings lists meetings whose happened_at falls in [from, to) — the
// "นัดที่กำลังจะถึง" block on the Today screen.
func (s *activityStoreService) UpcomingMeetings(userID *uint, from, to interface{}) ([]*models.Activity, error) {
	q := s.db.Model(&models.Activity{}).
		Where("type = ?", models.ActivityMeeting).
		Where("happened_at >= ? AND happened_at < ?", from, to)
	if userID != nil {
		q = q.Where("user_id = ?", *userID)
	}

	var rows []*models.Activity
	err := q.Preload("User").Preload("Lead").
		Order("happened_at ASC").Find(&rows).Error
	return rows, err
}

func (s *activityStoreService) Delete(id uint) error {
	return s.db.Delete(&models.Activity{}, id).Error
}
