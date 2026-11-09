package models

import "time"

// Default quarterly targets, taken from the KPI calculator the company already
// uses: ~577,000 THB of revenue per sales person per quarter, ~11 proposals a
// month across the team (3 sales people => 11 per person per quarter), and
// ~9 meetings a month per sales person (=> 27 per quarter).
const (
	DefaultRevenueTarget   = 577000.0
	DefaultProposalsTarget = 11
	DefaultMeetingsTarget  = 27
)

// Target is one sales person's goal for one quarter. An admin edits these.
type Target struct {
	ID              uint      `gorm:"primarykey" json:"id"`
	UserID          uint      `gorm:"not null;uniqueIndex:idx_targets_user_period" json:"user_id"`
	User            *User     `gorm:"foreignKey:UserID" json:"user,omitempty"`
	Year            int       `gorm:"not null;uniqueIndex:idx_targets_user_period" json:"year"`
	Quarter         int       `gorm:"not null;uniqueIndex:idx_targets_user_period" json:"quarter"`
	RevenueTarget   float64   `gorm:"type:numeric(14,2);not null;default:0" json:"revenue_target"`
	ProposalsTarget int       `gorm:"not null;default:0" json:"proposals_target"`
	MeetingsTarget  int       `gorm:"not null;default:0" json:"meetings_target"`
	CreatedAt       time.Time `json:"created_at"`
	UpdatedAt       time.Time `json:"updated_at"`
}

// TargetStore is the data access contract for quarterly targets.
type TargetStore interface {
	Upsert(target *Target) error
	Find(userID uint, year, quarter int) (*Target, error)
	List(year, quarter int) ([]*Target, error)
}
