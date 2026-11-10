package models

import (
	"time"

	"github.com/lib/pq"
	"github.com/owldayhouse/odh-internal-api/pkg/store"
)

// Industry buckets.
const (
	IndustryEducation    = "education"
	IndustryPropertyAuto = "property_auto"
	IndustryHealthcare   = "healthcare"
	IndustryOther        = "other"
)

// Where the lead came from. `sales_existing` is a source as well as an owner
// type: a customer a sales person brought in from their own book.
const (
	SourceTradeFair       = "trade_fair"
	SourceEGP             = "egp"
	SourceAdLibrary       = "ad_library"
	SourceSocialListening = "social_listening"
	SourceAgency          = "agency"
	SourceReferral        = "referral"
	SourceWebsite         = "website"
	SourceLinkedIn        = "linkedin"
	SourceSalesExisting   = "sales_existing"
)

// Owner types drive the KPI split: `company` leads are the sales team's main
// KPI, `sales_existing` leads count as the bonus.
const (
	OwnerTypeCompany       = "company"
	OwnerTypeSalesExisting = "sales_existing"
)

// Pipeline stages.
const (
	StageNew       = "new"
	StageContacted = "contacted"
	StageMeeting   = "meeting"
	StageProposal  = "proposal"
	StageWon       = "won"
	StageLost      = "lost"
	StageNurture   = "nurture"
)

// Services the lead is interested in.
const (
	InterestLeadKit          = "lead_kit"
	InterestKOL              = "kol"
	InterestEvent            = "event"
	InterestSystem           = "system"
	InterestDigitalMarketing = "digital_marketing"
	InterestSocialListening  = "social_listening"
)

// Industries lists every valid industry value.
func Industries() []string {
	return []string{IndustryEducation, IndustryPropertyAuto, IndustryHealthcare, IndustryOther}
}

// Sources lists every valid source value.
func Sources() []string {
	return []string{
		SourceTradeFair, SourceEGP, SourceAdLibrary, SourceSocialListening,
		SourceAgency, SourceReferral, SourceWebsite, SourceLinkedIn, SourceSalesExisting,
	}
}

// Stages lists the pipeline stages in board order.
func Stages() []string {
	return []string{StageNew, StageContacted, StageMeeting, StageProposal, StageWon, StageLost, StageNurture}
}

// Interests lists every valid interest tag.
func Interests() []string {
	return []string{
		InterestLeadKit, InterestKOL, InterestEvent,
		InterestSystem, InterestDigitalMarketing, InterestSocialListening,
	}
}

// OwnerTypes lists every valid owner type.
func OwnerTypes() []string { return []string{OwnerTypeCompany, OwnerTypeSalesExisting} }

// Lead is one customer company. NormalizedName carries a unique index: it is
// the "whoever registers first owns it" guard (see pkg/leadrules).
//
// Soft deletes are not used anywhere in this system; a lead that goes nowhere
// is flagged with stage `lost` or `nurture`.
type Lead struct {
	ID             uint    `gorm:"primarykey" json:"id"`
	Name           string  `gorm:"size:255;not null" json:"name"`
	NormalizedName string  `gorm:"size:255;uniqueIndex;not null" json:"normalized_name"`
	TaxID          *string `gorm:"size:20;uniqueIndex" json:"tax_id,omitempty"`
	Website        string  `gorm:"size:255" json:"website"`

	Industry     string `gorm:"size:32;not null;index" json:"industry"`
	Source       string `gorm:"size:32;not null;index" json:"source"`
	SourceDetail string `gorm:"size:512" json:"source_detail"`
	UTMSource    string `gorm:"size:128" json:"utm_source"`
	UTMCampaign  string `gorm:"size:128" json:"utm_campaign"`

	OwnerType    string    `gorm:"size:20;not null;default:company;index" json:"owner_type"`
	OwnerUserID  *uint     `gorm:"index" json:"owner_user_id,omitempty"`
	Owner        *User     `gorm:"foreignKey:OwnerUserID" json:"owner,omitempty"`
	RegisteredBy uint      `gorm:"not null;index" json:"registered_by"`
	Registrar    *User     `gorm:"foreignKey:RegisteredBy" json:"registrar,omitempty"`
	RegisteredAt time.Time `gorm:"not null;index" json:"registered_at"`

	Stage      string `gorm:"size:20;not null;default:new;index" json:"stage"`
	LostReason string `gorm:"size:512" json:"lost_reason"`

	Interests      pq.StringArray `gorm:"type:text[]" json:"interests"`
	EstimatedValue float64        `gorm:"type:numeric(14,2);not null;default:0" json:"estimated_value"`
	NextAction     string         `gorm:"size:512" json:"next_action"`
	NextActionDate *time.Time     `gorm:"index" json:"next_action_date,omitempty"`
	Notes          string         `gorm:"type:text" json:"notes"`

	// DoNotPitch marks a brand that belongs to an agency which hires us: our
	// sales team must never approach it directly.
	DoNotPitch       bool   `gorm:"not null;default:false;index" json:"do_not_pitch"`
	DoNotPitchReason string `gorm:"size:512" json:"do_not_pitch_reason"`

	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`

	Contacts []*Contact `gorm:"foreignKey:LeadID" json:"contacts,omitempty"`
}

// SimilarLead is a near-duplicate found through pg_trgm, with just enough
// context for the UI to say "this one already belongs to someone".
type SimilarLead struct {
	ID           uint      `json:"id"`
	Name         string    `json:"name"`
	OwnerType    string    `json:"owner_type"`
	OwnerUserID  *uint     `json:"owner_user_id,omitempty"`
	OwnerName    string    `json:"owner_name"`
	RegisteredAt time.Time `json:"registered_at"`
	Similarity   float64   `json:"similarity"`
}

// LeadStore is the data access contract for leads.
type LeadStore interface {
	Create(lead *Lead) error
	Find(id uint) (*Lead, error)
	FindWithRelations(id uint) (*Lead, error)
	FindByNormalizedName(normalized string) (*Lead, error)
	FindByTaxID(taxID string) (*Lead, error)
	FindSimilar(normalized string, threshold float64, limit int) ([]*SimilarLead, error)
	List(query ListLeadQuery) ([]*Lead, *store.PaginationResult, error)
	ListAll(query ListLeadQuery) ([]*Lead, error)
	Update(lead *Lead) error
	Today(query TodayQuery) (*TodayResult, error)
	// FollowUpsBetween returns open leads with a follow-up date in [from, to).
	FollowUpsBetween(from, to time.Time) ([]*Lead, error)
}

// ListLeadQuery filters the lead list.
type ListLeadQuery struct {
	store.PaginationQuery
	OwnerUserID *uint  `query:"owner_user_id"`
	OwnerType   string `query:"owner_type"`
	Stage       string `query:"stage"`
	Industry    string `query:"industry"`
	Source      string `query:"source"`
	Search      string `query:"search"`
	// DueToday restricts the list to leads whose next_action_date is today or
	// already past (the "วันนี้" screen).
	DueToday   bool   `query:"due_today"`
	DoNotPitch *bool  `query:"do_not_pitch"`
	Sort       string `query:"sort"`
	// Today is the Asia/Bangkok date used by DueToday; set by the handler.
	Today time.Time `query:"-"`
	// VisibleToUserID, when set, restricts rows to that owner (sales scoping).
	VisibleToUserID *uint `query:"-"`
}

// TodayQuery drives the "วันนี้" screen.
type TodayQuery struct {
	UserID *uint
	Today  time.Time
	// AheadDays is how far forward upcoming meetings are looked up.
	AheadDays int
}

// TodayResult is the payload of the "วันนี้" screen.
type TodayResult struct {
	Due      []*Lead     `json:"due"`
	Upcoming []*Lead     `json:"upcoming"`
	Meetings []*Activity `json:"meetings"`
}
