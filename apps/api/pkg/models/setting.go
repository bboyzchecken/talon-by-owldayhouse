package models

import "time"

// Setting keys.
const (
	// SettingSalesExistingCutoff is the last date (YYYY-MM-DD, Asia/Bangkok) on
	// which a sales account may register a lead as its own existing customer.
	SettingSalesExistingCutoff = "sales_existing_cutoff"
)

// Setting is a small key/value table for company-wide switches an admin owns.
type Setting struct {
	Key       string    `gorm:"primarykey;size:64" json:"key"`
	Value     string    `gorm:"size:255;not null" json:"value"`
	UpdatedBy *uint     `json:"updated_by,omitempty"`
	UpdatedAt time.Time `json:"updated_at"`
}

// SettingStore is the data access contract for settings.
type SettingStore interface {
	Get(key string) (*Setting, error)
	Set(key, value string, updatedBy uint) error
	All() ([]*Setting, error)
}
