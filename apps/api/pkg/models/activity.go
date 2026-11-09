package models

import "time"

// Activity types.
const (
	ActivityCall         = "call"
	ActivityLine         = "line"
	ActivityMeeting      = "meeting"
	ActivityProposalSent = "proposal_sent"
	ActivityNote         = "note"
)

// ActivityTypes lists every valid activity type.
func ActivityTypes() []string {
	return []string{ActivityCall, ActivityLine, ActivityMeeting, ActivityProposalSent, ActivityNote}
}

// Activity is one touch on a lead. `meeting` and `proposal_sent` rows are what
// the KPI counts, so they are indexed by date.
type Activity struct {
	ID         uint      `gorm:"primarykey" json:"id"`
	LeadID     uint      `gorm:"not null;index" json:"lead_id"`
	Lead       *Lead     `gorm:"foreignKey:LeadID" json:"lead,omitempty"`
	UserID     uint      `gorm:"not null;index" json:"user_id"`
	User       *User     `gorm:"foreignKey:UserID" json:"user,omitempty"`
	Type       string    `gorm:"size:20;not null;index" json:"type"`
	HappenedAt time.Time `gorm:"not null;index" json:"happened_at"`
	Summary    string    `gorm:"size:1000" json:"summary"`
	CreatedAt  time.Time `json:"created_at"`
	UpdatedAt  time.Time `json:"updated_at"`
}

// ActivityStore is the data access contract for activities.
type ActivityStore interface {
	Create(activity *Activity) error
	Find(id uint) (*Activity, error)
	ListByLead(leadID uint) ([]*Activity, error)
	UpcomingMeetings(userID *uint, from, to interface{}) ([]*Activity, error)
	Delete(id uint) error
}
