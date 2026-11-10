package models

import "time"

// e-GP Radar announcement decisions.
const (
	EgpDecisionNew     = "new"
	EgpDecisionSent    = "sent"
	EgpDecisionSkipped = "skipped"
)

// EgpAnnouncement is one public-procurement project imported from the CSV
// that e-GP's own "Export .CSV" button produces. ProjectID (เลขที่โครงการ) is
// e-GP's identifier, so importing the same file twice never duplicates a row.
//
// Scores and warning labels are not stored: they are computed from the
// current Radar settings every time the list is read, so a settings change
// re-evaluates everything at once.
type EgpAnnouncement struct {
	ID              uint       `gorm:"primarykey" json:"id"`
	ProjectID       string     `gorm:"size:32;uniqueIndex;not null" json:"project_id"`
	Agency          string     `gorm:"size:255;not null;index" json:"agency"`
	ProcurementUnit string     `gorm:"size:255" json:"procurement_unit"`
	Title           string     `gorm:"type:text;not null" json:"title"`
	Method          string     `gorm:"size:20" json:"method"`
	Hire            bool       `gorm:"not null;default:false" json:"hire"`
	Budget          float64    `gorm:"type:numeric(16,2);not null;default:0" json:"budget"`
	ProjectStatus   string     `gorm:"size:128" json:"project_status"`
	Province        string     `gorm:"size:64" json:"province"`
	AnnouncedAt     *time.Time `json:"announced_at,omitempty"`
	DeadlineAt      *time.Time `json:"deadline_at,omitempty"`

	Decision  string     `gorm:"size:16;not null;default:new;index" json:"decision"`
	LeadID    *uint      `gorm:"index" json:"lead_id,omitempty"`
	DecidedBy *uint      `json:"decided_by,omitempty"`
	DecidedAt *time.Time `json:"decided_at,omitempty"`

	ImportedBy  uint      `gorm:"not null" json:"imported_by"`
	FirstSeenAt time.Time `gorm:"not null" json:"first_seen_at"`
	LastSeenAt  time.Time `gorm:"not null" json:"last_seen_at"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

// EgpSettingsRow stores the Radar settings as one JSON document (row id 1).
type EgpSettingsRow struct {
	ID        uint      `gorm:"primarykey" json:"id"`
	Data      string    `gorm:"type:text;not null" json:"data"`
	UpdatedBy *uint     `json:"updated_by,omitempty"`
	UpdatedAt time.Time `json:"updated_at"`
}

// EgpUpsertResult counts what an import did.
type EgpUpsertResult struct {
	Created int `json:"created"`
	Updated int `json:"updated"`
}

// EgpStore is the data access contract for e-GP Radar.
type EgpStore interface {
	Upsert(rows []*EgpAnnouncement) (EgpUpsertResult, error)
	Find(id uint) (*EgpAnnouncement, error)
	List(decision string, limit int) ([]*EgpAnnouncement, error)
	Update(row *EgpAnnouncement) error
	LoadSettings() (string, error)
	SaveSettings(data string, updatedBy uint) error
}
