package models

import "time"

// KPIQuery selects the KPI period and scope. Periods are whole months or whole
// quarters in Asia/Bangkok. UserID nil means "every sales account" (admin view).
type KPIQuery struct {
	Year    int   `query:"year"`
	Quarter int   `query:"quarter"`
	Month   int   `query:"month"`
	UserID  *uint `query:"user_id"`
}

// KPIPeriod is the resolved window the numbers were computed over.
type KPIPeriod struct {
	Year    int       `json:"year"`
	Quarter int       `json:"quarter"`
	Month   int       `json:"month"`
	Label   string    `json:"label"`
	From    time.Time `json:"from"`
	To      time.Time `json:"to"`
}

// KPISplit is one half of a sales person's scorecard: either the leads the
// company sourced (the main KPI) or the ones the sales person brought from
// their own book (the bonus).
type KPISplit struct {
	NewLeads  int64   `json:"new_leads"`
	Meetings  int64   `json:"meetings"`
	Proposals int64   `json:"proposals"`
	WonCount  int64   `json:"won_count"`
	WonAmount float64 `json:"won_amount"`
}

// Add folds another split into this one.
func (s *KPISplit) Add(other KPISplit) {
	s.NewLeads += other.NewLeads
	s.Meetings += other.Meetings
	s.Proposals += other.Proposals
	s.WonCount += other.WonCount
	s.WonAmount += other.WonAmount
}

// KPIUserResult is one sales person's scorecard for the period.
type KPIUserResult struct {
	UserID        uint     `json:"user_id"`
	Username      string   `json:"username"`
	Name          string   `json:"name"`
	Company       KPISplit `json:"company"`
	SalesExisting KPISplit `json:"sales_existing"`
	Total         KPISplit `json:"total"`
	// Target is the quarterly target, pro-rated to the period (a month gets a
	// third of the quarter). Nil when no target row exists yet.
	Target *KPITarget `json:"target,omitempty"`
}

// KPITarget is the target the period is measured against, plus progress.
// Revenue progress counts the company split only; the bonus is reported
// separately so an existing-customer deal can never cover the main KPI.
type KPITarget struct {
	RevenueTarget    float64 `json:"revenue_target"`
	ProposalsTarget  int     `json:"proposals_target"`
	MeetingsTarget   int     `json:"meetings_target"`
	RevenuePercent   float64 `json:"revenue_percent"`
	ProposalsPercent float64 `json:"proposals_percent"`
	MeetingsPercent  float64 `json:"meetings_percent"`
	BonusRevenue     float64 `json:"bonus_revenue"`
	BonusRevenuePct  float64 `json:"bonus_revenue_percent"`
}

// KPISourceConversion answers "which source actually pays off".
type KPISourceConversion struct {
	Source      string  `json:"source"`
	NewLeads    int64   `json:"new_leads"`
	Meetings    int64   `json:"meetings"`
	Proposals   int64   `json:"proposals"`
	WonCount    int64   `json:"won_count"`
	WonAmount   float64 `json:"won_amount"`
	MeetingRate float64 `json:"meeting_rate"`
	WonRate     float64 `json:"won_rate"`
}

// KPIResult is the whole KPI payload.
type KPIResult struct {
	Period   KPIPeriod              `json:"period"`
	Users    []*KPIUserResult       `json:"users"`
	Team     KPIUserResult          `json:"team"`
	BySource []*KPISourceConversion `json:"by_source"`
}

// KPIStore computes the scorecards straight from leads, activities and deals.
type KPIStore interface {
	Compute(query KPIQuery, period KPIPeriod, users []*User, targets []*Target) (*KPIResult, error)
	// StageCounts powers the pipeline board header.
	StageCounts(userID *uint) (map[string]int64, error)
}
