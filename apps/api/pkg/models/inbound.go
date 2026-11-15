package models

import (
	"time"

	"github.com/lib/pq"
)

// Kinds of inbound request. The web form sends `quote` today; a careers form
// would be the next kind, which is why the column exists at all.
const (
	InboundKindQuote = "quote"
)

// An inbound request never becomes a lead on its own. It sits in `new` until
// someone in the company reads it and either accepts it into the Lead Tracker
// or discards it, so nothing that arrives from the open internet can reach the
// sales pipeline unreviewed.
const (
	InboundStatusNew       = "new"
	InboundStatusAccepted  = "accepted"
	InboundStatusDiscarded = "discarded"
)

// How soon the work is wanted. Kept coarse on purpose: a date on a first
// enquiry is a guess, and a range is what a sales person actually acts on.
const (
	TimelineASAP     = "asap"
	TimelineOneThree = "1_3_months"
	TimelineThreeSix = "3_6_months"
	TimelinePlanning = "planning"
)

// The budget the customer states for their own work. This is not our price
// list: the marketing site shows no prices, and nothing here is quoted back.
const (
	BudgetUnder100k   = "under_100k"
	BudgetMid         = "100k_300k"
	BudgetHigh        = "300k_1m"
	BudgetOverMillion = "over_1m"
	BudgetUnsure      = "unsure"
)

// Timelines lists every valid timeline value.
func Timelines() []string {
	return []string{TimelineASAP, TimelineOneThree, TimelineThreeSix, TimelinePlanning}
}

// BudgetBands lists every valid budget value.
func BudgetBands() []string {
	return []string{BudgetUnder100k, BudgetMid, BudgetHigh, BudgetOverMillion, BudgetUnsure}
}

// InboundRequest is one submission of the quote form on owldayhouse.com.
//
// It is written by the intake service, which runs as its own process on its own
// hostname with a PostgreSQL role that may only INSERT into this table — no
// SELECT, no UPDATE. Everything that reads or changes a row here runs in the
// CRM, as a signed-in person.
//
// Nothing in here is billing data. A tax ID, a branch and a registered address
// are asked for when an invoice is actually raised, not on a public form.
type InboundRequest struct {
	ID        uint      `gorm:"primarykey" json:"id"`
	CreatedAt time.Time `gorm:"index" json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`

	Kind   string `gorm:"size:20;not null;default:quote;index" json:"kind"`
	Status string `gorm:"size:20;not null;default:new;index" json:"status"`
	Locale string `gorm:"size:5;not null;default:th" json:"locale"`

	// What the person filled in. Only ContactName and one way to reach them
	// are required; the rest is whatever they chose to tell us.
	ContactName string         `gorm:"size:200;not null" json:"contact_name"`
	Company     string         `gorm:"size:200" json:"company"`
	Industry    string         `gorm:"size:32" json:"industry"`
	Phone       string         `gorm:"size:40" json:"phone"`
	LineID      string         `gorm:"size:100" json:"line_id"`
	Email       string         `gorm:"size:200" json:"email"`
	Interests   pq.StringArray `gorm:"type:text[]" json:"interests"`
	Brief       string         `gorm:"type:text" json:"brief"`
	Timeline    string         `gorm:"size:32" json:"timeline"`
	BudgetBand  string         `gorm:"size:32" json:"budget_band"`

	// Where it came from. These ride along to the lead when it is accepted,
	// which is what lets revenue be traced back to a campaign later.
	UTMSource   string `gorm:"size:128" json:"utm_source"`
	UTMCampaign string `gorm:"size:128" json:"utm_campaign"`
	Referrer    string `gorm:"size:500" json:"referrer"`
	LandingPath string `gorm:"size:300" json:"landing_path"`

	// For looking at a flood of spam afterwards without keeping anyone's
	// address: a keyed hash that cannot be turned back into an IP.
	IPHash    string `gorm:"size:64;index" json:"-"`
	UserAgent string `gorm:"size:300" json:"-"`

	// Filled in when someone acts on the request.
	LeadID        *uint      `gorm:"index" json:"lead_id,omitempty"`
	Lead          *Lead      `gorm:"foreignKey:LeadID" json:"lead,omitempty"`
	HandledBy     *uint      `gorm:"index" json:"handled_by,omitempty"`
	Handler       *User      `gorm:"foreignKey:HandledBy" json:"handler,omitempty"`
	HandledAt     *time.Time `json:"handled_at,omitempty"`
	DiscardReason string     `gorm:"size:200" json:"discard_reason"`
}

// InboundFilter narrows the inbox list in the CRM.
type InboundFilter struct {
	Status string
	Kind   string
	Page   int
	Limit  int
}

// InboundRequestStore is the data access contract.
//
// The intake service calls Create and nothing else; its database role cannot
// run the rest. The grants are the real boundary, not this interface.
type InboundRequestStore interface {
	Create(row *InboundRequest) error
	List(filter InboundFilter) ([]*InboundRequest, int64, error)
	Find(id uint) (*InboundRequest, error)
	Update(row *InboundRequest) error
	MarkHandled(row *InboundRequest) (bool, error)
	Delete(id uint) error
	PurgeUnaccepted(before time.Time) (int64, error)
	CountByStatus() (map[string]int64, error)
}

// InboundRetention is how long a request that was never accepted is kept.
// The privacy policy on owldayhouse.com states this number; change both or
// neither.
const InboundRetention = 180 * 24 * time.Hour
