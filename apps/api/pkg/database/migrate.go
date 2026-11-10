package database

import (
	"github.com/go-gormigrate/gormigrate/v2"
	"github.com/owldayhouse/odh-internal-api/pkg/models"
	"gorm.io/gorm"
)

// allModels is the AutoMigrate list. A new internal tool adds its models here.
func allModels() []interface{} {
	return []interface{}{
		&models.User{},
		&models.Setting{},
		&models.File{},
		&models.Lead{},
		&models.Contact{},
		&models.Activity{},
		&models.Deal{},
		&models.Target{},
		&models.OwnershipLog{},
		&models.EgpAnnouncement{},
		&models.EgpSettingsRow{},
	}
}

// Migrate runs every migration in order. It is safe to call on every boot.
func Migrate(db *gorm.DB) error {
	m := gormigrate.New(db, gormigrate.DefaultOptions, []*gormigrate.Migration{
		{
			// pg_trgm powers the "a lead with a similar name already exists"
			// warning, so the extension has to exist before the index.
			ID: "20261109_01_pg_trgm",
			Migrate: func(tx *gorm.DB) error {
				return tx.Exec(`CREATE EXTENSION IF NOT EXISTS pg_trgm`).Error
			},
			Rollback: func(tx *gorm.DB) error {
				return tx.Exec(`DROP EXTENSION IF EXISTS pg_trgm`).Error
			},
		},
		{
			ID: "20261109_02_initial",
			Migrate: func(tx *gorm.DB) error {
				return tx.AutoMigrate(allModels()...)
			},
			Rollback: func(tx *gorm.DB) error {
				return tx.Migrator().DropTable(
					"ownership_logs", "targets", "deals", "activities",
					"contacts", "leads", "files", "settings", "users",
				)
			},
		},
		{
			// A trigram index so similarity() over normalized_name stays fast
			// as the trade-fair exhibitor lists pile up.
			ID: "20261109_03_leads_name_trgm_index",
			Migrate: func(tx *gorm.DB) error {
				return tx.Exec(
					`CREATE INDEX IF NOT EXISTS idx_leads_normalized_name_trgm
					 ON leads USING gin (normalized_name gin_trgm_ops)`,
				).Error
			},
			Rollback: func(tx *gorm.DB) error {
				return tx.Exec(`DROP INDEX IF EXISTS idx_leads_normalized_name_trgm`).Error
			},
		},
		{
			// The cut-off after which only an admin may register a sales
			// person's own existing customer.
			ID: "20261109_04_default_settings",
			Migrate: func(tx *gorm.DB) error {
				var count int64
				if err := tx.Model(&models.Setting{}).
					Where("key = ?", models.SettingSalesExistingCutoff).
					Count(&count).Error; err != nil {
					return err
				}
				if count > 0 {
					return nil
				}
				return tx.Create(&models.Setting{
					Key:   models.SettingSalesExistingCutoff,
					Value: "2026-12-31",
				}).Error
			},
			Rollback: func(tx *gorm.DB) error {
				return tx.Where("key = ?", models.SettingSalesExistingCutoff).
					Delete(&models.Setting{}).Error
			},
		},
		{
			// e-GP Radar: public-procurement announcements imported from
			// e-GP's own CSV export, and the Radar's settings.
			ID: "20261110_01_egp_radar",
			Migrate: func(tx *gorm.DB) error {
				return tx.AutoMigrate(&models.EgpAnnouncement{}, &models.EgpSettingsRow{})
			},
			Rollback: func(tx *gorm.DB) error {
				return tx.Migrator().DropTable("egp_announcements", "egp_settings_rows")
			},
		},
	})

	return m.Migrate()
}
