// Package setting is the key/value settings repository.
package setting

import (
	"github.com/owldayhouse/odh-internal-api/pkg/models"
	"go.uber.org/fx"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type settingStoreService struct {
	db *gorm.DB
}

// New builds the settings repository.
func New(db *gorm.DB) models.SettingStore {
	return &settingStoreService{db: db}
}

// Module is the FX wiring for this repository.
var Module = fx.Module("store.setting", fx.Provide(New))

func (s *settingStoreService) Get(key string) (*models.Setting, error) {
	var row models.Setting
	if err := s.db.Where("key = ?", key).First(&row).Error; err != nil {
		return nil, err
	}
	return &row, nil
}

func (s *settingStoreService) Set(key, value string, updatedBy uint) error {
	row := models.Setting{Key: key, Value: value, UpdatedBy: &updatedBy}
	return s.db.Clauses(clause.OnConflict{
		Columns:   []clause.Column{{Name: "key"}},
		DoUpdates: clause.AssignmentColumns([]string{"value", "updated_by", "updated_at"}),
	}).Create(&row).Error
}

func (s *settingStoreService) All() ([]*models.Setting, error) {
	var rows []*models.Setting
	err := s.db.Order("key ASC").Find(&rows).Error
	return rows, err
}
