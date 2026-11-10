package leadrules

import (
	"errors"
	"fmt"
	"time"
)

// Bangkok is the timezone every date rule in this system is evaluated in.
var Bangkok = mustLoadBangkok()

func mustLoadBangkok() *time.Location {
	loc, err := time.LoadLocation("Asia/Bangkok")
	if err != nil {
		// Fixed offset fallback for images without tzdata.
		return time.FixedZone("ICT", 7*60*60)
	}
	return loc
}

// Rule violations. Handlers map these onto HTTP status codes.
var (
	// ErrCutoffPassed means a sales account tried to register one of their own
	// existing customers after the company's cut-off date.
	ErrCutoffPassed = errors.New("หมดเขตลงลูกค้าเดิมของเซลส์แล้ว เฉพาะแอดมินเท่านั้นที่ลงให้ได้")
	// ErrOwnerChangeForbidden means a non-admin tried to change ownership.
	ErrOwnerChangeForbidden = errors.New("เปลี่ยนเจ้าของลูกค้าได้เฉพาะแอดมิน")
	// ErrNotLeadOwner means a sales account tried to edit someone else's lead.
	ErrNotLeadOwner = errors.New("แก้ได้เฉพาะลูกค้าที่ตัวเองดูแล")
	// ErrDoNotPitch means a do_not_pitch lead was pushed towards a direct sale.
	ErrDoNotPitch = errors.New("ลูกค้ารายนี้ติดสถานะห้ามเสนอขายตรง (do not pitch) จึงย้ายขั้นนี้ไม่ได้")
	// ErrInvalidStage means an unknown stage value.
	ErrInvalidStage = errors.New("ขั้นของลูกค้าไม่ถูกต้อง")
)

// Actor is the signed-in account, as far as the rules care.
type Actor struct {
	ID   uint
	Role string
}

// IsAdmin reports whether the actor acts for the company.
func (a Actor) IsAdmin() bool { return a.Role == "admin" }

// ParseCutoff reads the `sales_existing_cutoff` setting ("YYYY-MM-DD") as the
// LAST day sales people may self-register existing customers, i.e. the returned
// instant is the very end of that day in Asia/Bangkok.
func ParseCutoff(value string) (time.Time, error) {
	day, err := time.ParseInLocation("2006-01-02", value, Bangkok)
	if err != nil {
		return time.Time{}, fmt.Errorf("วันหมดเขต (sales_existing_cutoff) ไม่ถูกต้อง: %w", err)
	}
	return day.AddDate(0, 0, 1).Add(-time.Nanosecond), nil
}

// CanRegisterSalesExisting reports whether the actor may register a lead as
// owner_type `sales_existing` right now. Admins always may; a sales account may
// only up to and including the cut-off day.
func CanRegisterSalesExisting(actor Actor, now, cutoff time.Time) bool {
	if actor.IsAdmin() {
		return true
	}
	return !now.After(cutoff)
}

// OwnerDecision is the ownership a new lead is created with.
type OwnerDecision struct {
	OwnerType   string
	OwnerUserID *uint
}

// ResolveOwnerOnCreate decides the ownership of a brand new lead.
//
//   - A sales account always ends up owning the lead it registers. It may flag
//     it as `sales_existing` (its own book) until the cut-off; anything else is
//     a `company` lead.
//   - An admin registers on behalf of the company: the lead is `company` and
//     unassigned unless the admin names a sales owner. Only an admin may create
//     a `sales_existing` lead after the cut-off, and must name its owner.
func ResolveOwnerOnCreate(
	actor Actor,
	requestedOwnerType string,
	requestedOwnerUserID *uint,
	now, cutoff time.Time,
) (OwnerDecision, error) {
	if !actor.IsAdmin() {
		// A sales account cannot register a lead for somebody else.
		if requestedOwnerUserID != nil && *requestedOwnerUserID != actor.ID {
			return OwnerDecision{}, ErrOwnerChangeForbidden
		}
		id := actor.ID
		if requestedOwnerType == "sales_existing" {
			if !CanRegisterSalesExisting(actor, now, cutoff) {
				return OwnerDecision{}, ErrCutoffPassed
			}
			return OwnerDecision{OwnerType: "sales_existing", OwnerUserID: &id}, nil
		}
		return OwnerDecision{OwnerType: "company", OwnerUserID: &id}, nil
	}

	if requestedOwnerType == "sales_existing" {
		if requestedOwnerUserID == nil {
			return OwnerDecision{}, errors.New("ลูกค้าเดิมของเซลส์ต้องระบุว่าเป็นของเซลส์คนไหน")
		}
		return OwnerDecision{OwnerType: "sales_existing", OwnerUserID: requestedOwnerUserID}, nil
	}
	return OwnerDecision{OwnerType: "company", OwnerUserID: requestedOwnerUserID}, nil
}

// CanChangeOwner reports whether the actor may reassign a lead. Only admins can.
func CanChangeOwner(actor Actor) bool { return actor.IsAdmin() }

// CanEditLead reports whether the actor may edit the lead's fields. Every
// signed-in account can SEE every lead (one shared customer list); editing is
// limited to the lead's owner and to admins.
func CanEditLead(actor Actor, ownerUserID *uint) bool {
	if actor.IsAdmin() {
		return true
	}
	return ownerUserID != nil && *ownerUserID == actor.ID
}

// directSaleStages are the stages that only make sense if we are selling to the
// brand ourselves. A do_not_pitch lead belongs to an agency that hires us, so
// it may not reach them: the brief names `proposal`, and `won` is included
// because reaching it without a proposal would be the same direct sale through
// the back door.
var directSaleStages = map[string]bool{"proposal": true, "won": true}

var validStages = map[string]bool{
	"new": true, "contacted": true, "meeting": true, "proposal": true,
	"won": true, "lost": true, "nurture": true, "declined": true,
}

// ValidateStageChange checks a stage move against the do_not_pitch flag.
func ValidateStageChange(doNotPitch bool, newStage string) error {
	if !validStages[newStage] {
		return ErrInvalidStage
	}
	if doNotPitch && directSaleStages[newStage] {
		return ErrDoNotPitch
	}
	return nil
}

// QuarterOf returns the calendar quarter (1-4) of a month.
func QuarterOf(month int) int {
	if month < 1 || month > 12 {
		return 0
	}
	return (month-1)/3 + 1
}
