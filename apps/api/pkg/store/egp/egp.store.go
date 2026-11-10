// Package egp is the e-GP Radar repository.
package egp

import (
	"errors"
	"time"

	"github.com/owldayhouse/odh-internal-api/pkg/models"
	"go.uber.org/fx"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type egpStoreService struct {
	db *gorm.DB
}

// New builds the e-GP Radar repository.
func New(db *gorm.DB) models.EgpStore {
	return &egpStoreService{db: db}
}

// Module is the FX wiring for this repository.
var Module = fx.Module("store.egp", fx.Provide(New))

// Upsert inserts new projects and refreshes the descriptive fields of ones
// already seen, keeping every decision (sent / skipped) made on them. A
// closing date already set by hand is only replaced by a real one.
func (s *egpStoreService) Upsert(rows []*models.EgpAnnouncement) (models.EgpUpsertResult, error) {
	result := models.EgpUpsertResult{}
	now := time.Now()

	err := s.db.Transaction(func(tx *gorm.DB) error {
		for _, row := range rows {
			var existing models.EgpAnnouncement
			err := tx.Where("project_id = ?", row.ProjectID).First(&existing).Error
			switch {
			case errors.Is(err, gorm.ErrRecordNotFound):
				row.FirstSeenAt = now
				row.LastSeenAt = now
				if row.Decision == "" {
					row.Decision = models.EgpDecisionNew
				}
				if err := tx.Create(row).Error; err != nil {
					return err
				}
				result.Created++
			case err != nil:
				return err
			default:
				existing.Agency = row.Agency
				existing.ProcurementUnit = row.ProcurementUnit
				existing.Title = row.Title
				existing.Method = row.Method
				existing.Hire = row.Hire
				existing.Budget = row.Budget
				existing.ReferencePrice = row.ReferencePrice
				if row.WinnerAnnouncedAt != nil {
					existing.WinnerAnnouncedAt = row.WinnerAnnouncedAt
				}
				existing.ProjectStatus = row.ProjectStatus
				if row.Province != "" {
					existing.Province = row.Province
				}
				if row.AnnouncedAt != nil {
					existing.AnnouncedAt = row.AnnouncedAt
				}
				if row.DeadlineAt != nil {
					if existing.DeadlineAt == nil || !existing.DeadlineAt.Equal(*row.DeadlineAt) {
						existing.DeadlineChanged = true
					}
					existing.DeadlineAt = row.DeadlineAt
				}
				existing.LastSeenAt = now
				if err := tx.Save(&existing).Error; err != nil {
					return err
				}
				*row = existing
				result.Updated++
			}
		}
		return nil
	})
	return result, err
}

func (s *egpStoreService) Find(id uint) (*models.EgpAnnouncement, error) {
	var row models.EgpAnnouncement
	if err := s.db.First(&row, id).Error; err != nil {
		return nil, err
	}
	return &row, nil
}

// List returns announcements with the given decision ("" = all), newest first.
func (s *egpStoreService) List(decision string, limit int) ([]*models.EgpAnnouncement, error) {
	if limit < 1 || limit > 5000 {
		limit = 2000
	}
	q := s.db.Model(&models.EgpAnnouncement{})
	if decision != "" {
		q = q.Where("decision = ?", decision)
	}
	var rows []*models.EgpAnnouncement
	err := q.Order("last_seen_at DESC, id DESC").Limit(limit).Find(&rows).Error
	return rows, err
}

func (s *egpStoreService) ListByAgency(agency string, excludeID uint, limit int) ([]*models.EgpAnnouncement, error) {
	var rows []*models.EgpAnnouncement
	err := s.db.Where("agency = ? AND id <> ?", agency, excludeID).
		Order("announced_at DESC NULLS LAST, id DESC").Limit(limit).Find(&rows).Error
	return rows, err
}

func (s *egpStoreService) DeadlinesBetween(from, to time.Time) ([]*models.EgpAnnouncement, error) {
	var rows []*models.EgpAnnouncement
	err := s.db.Where("decision = ? AND lead_id IS NOT NULL", models.EgpDecisionSent).
		Where("deadline_at >= ? AND deadline_at < ?", from, to).
		Order("deadline_at ASC, id ASC").Find(&rows).Error
	return rows, err
}

func (s *egpStoreService) Update(row *models.EgpAnnouncement) error {
	return s.db.Save(row).Error
}

// LoadSettings returns the stored settings JSON, or "" when none were saved.
func (s *egpStoreService) LoadSettings() (string, error) {
	var row models.EgpSettingsRow
	err := s.db.First(&row, 1).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return "", nil
	}
	if err != nil {
		return "", err
	}
	return row.Data, nil
}

func (s *egpStoreService) SaveSettings(data string, updatedBy uint) error {
	row := models.EgpSettingsRow{ID: 1, Data: data, UpdatedBy: &updatedBy}
	return s.db.Clauses(clause.OnConflict{
		Columns:   []clause.Column{{Name: "id"}},
		DoUpdates: clause.AssignmentColumns([]string{"data", "updated_by", "updated_at"}),
	}).Create(&row).Error
}
