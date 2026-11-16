package api

import (
	"net/http"
	"sort"
	"strings"
	"time"

	"github.com/labstack/echo/v4"

	"github.com/owldayhouse/odh-internal-api/pkg/egpradar"
	"github.com/owldayhouse/odh-internal-api/pkg/leadrules"
	"github.com/owldayhouse/odh-internal-api/pkg/models"
)

// Calendar event kinds.
const (
	CalendarEgpDeadline = "egp_deadline"
	CalendarMeeting     = "meeting"
	CalendarFollowUp    = "follow_up"
	// A monthly tax filing's online deadline; admins only.
	CalendarTaxDeadline = "tax_deadline"
)

// maxCalendarDays bounds one request: a month view plus its edge weeks.
const maxCalendarDays = 62

// CalendarEvent is one dated thing the team should see.
type CalendarEvent struct {
	Kind string `json:"kind"`
	// Date is the Bangkok day, "YYYY-MM-DD"; Time is "HH:MM" for meetings.
	Date      string `json:"date"`
	Time      string `json:"time,omitempty"`
	Title     string `json:"title"`
	Detail    string `json:"detail,omitempty"`
	LeadID    uint   `json:"lead_id"`
	LeadName  string `json:"lead_name"`
	OwnerID   *uint  `json:"owner_id,omitempty"`
	OwnerName string `json:"owner_name,omitempty"`
	ProjectID string `json:"project_id,omitempty"`
	// Link is where the event opens when it is not a lead (a tax month).
	Link string `json:"link,omitempty"`
}

func (s *Server) registerCalendarRoutes(api *echo.Group) {
	api.GET("/calendar", s.GetCalendar)
}

// GetCalendar is the team calendar on the Lead Tracker: closing dates of
// e-GP projects sent to sales, meetings and follow-ups, for everyone signed
// in. The lead list is one list for the whole team, so the calendar is too;
// the screen filters to "mine".
//
// Query: from, to (YYYY-MM-DD, to inclusive), at most 62 days apart.
func (s *Server) GetCalendar(c echo.Context) error {
	from, err := parseDate(c.QueryParam("from"))
	if err != nil {
		return err
	}
	to, err := parseDate(c.QueryParam("to"))
	if err != nil {
		return err
	}
	if from == nil || to == nil {
		return badRequest(c, "ต้องระบุช่วงวันที่ from และ to")
	}
	start := dayStart(*from)
	end := dayStart(*to).AddDate(0, 0, 1)
	if !end.After(start) || end.Sub(start) > maxCalendarDays*24*time.Hour {
		return badRequest(c, "ช่วงวันที่ต้องไม่เกิน 62 วัน")
	}

	events := []CalendarEvent{}
	leads := map[uint]*models.Lead{}
	findLead := func(id uint) *models.Lead {
		if lead, ok := leads[id]; ok {
			return lead
		}
		// With relations: the calendar shows whose lead it is.
		lead, err := s.LeadStore.FindWithRelations(id)
		if err != nil {
			lead = nil
		}
		leads[id] = lead
		return lead
	}

	deadlines, err := s.EgpStore.DeadlinesBetween(start, end)
	if err != nil {
		return s.serverError(c, err)
	}
	for _, row := range deadlines {
		lead := findLead(*row.LeadID)
		// A lead we declined, lost or won has no closing date to watch.
		if lead == nil || isClosedStage(lead.Stage) {
			continue
		}
		event := CalendarEvent{
			Kind:      CalendarEgpDeadline,
			Date:      bangkokDay(*row.DeadlineAt),
			Title:     "ปิดรับข้อเสนอ: " + egpradar.ShortTitle(row.Title, 80),
			Detail:    egpDeadlineDetail(row),
			LeadID:    lead.ID,
			LeadName:  lead.Name,
			ProjectID: row.ProjectID,
		}
		setOwner(&event, lead)
		events = append(events, event)
	}

	meetings, err := s.ActivityStore.UpcomingMeetings(nil, start, end)
	if err != nil {
		return s.serverError(c, err)
	}
	for _, m := range meetings {
		at := m.HappenedAt.In(leadrules.Bangkok)
		event := CalendarEvent{
			Kind: CalendarMeeting,
			Date: at.Format("2006-01-02"),
			// Midnight means no time was given (older entries were date-only).
			Time:   meetingTime(at),
			Title:  "นัดพบ",
			Detail: m.Summary,
			LeadID: m.LeadID,
		}
		if m.Lead != nil {
			event.LeadName = m.Lead.Name
		}
		if m.User != nil {
			event.OwnerID, event.OwnerName = &m.User.ID, m.User.Name
		}
		events = append(events, event)
	}

	followUps, err := s.LeadStore.FollowUpsBetween(start, end)
	if err != nil {
		return s.serverError(c, err)
	}
	for _, lead := range followUps {
		event := CalendarEvent{
			Kind:     CalendarFollowUp,
			Date:     bangkokDay(*lead.NextActionDate),
			Title:    orDefault(lead.NextAction, "ตามต่อ"),
			Detail:   lead.SourceDetail,
			LeadID:   lead.ID,
			LeadName: lead.Name,
		}
		setOwner(&event, lead)
		events = append(events, event)
	}

	if actor(c).IsAdmin() {
		taxEvents, err := s.taxCalendar(start, end)
		if err != nil {
			return s.serverError(c, err)
		}
		events = append(events, taxEvents...)
	}

	// Within a day: tax and closing dates first (they cannot move), then
	// meetings by time, then follow-ups.
	rank := map[string]int{CalendarTaxDeadline: 0, CalendarEgpDeadline: 0, CalendarMeeting: 1, CalendarFollowUp: 2}
	sort.SliceStable(events, func(i, j int) bool {
		a, b := events[i], events[j]
		if a.Date != b.Date {
			return a.Date < b.Date
		}
		if rank[a.Kind] != rank[b.Kind] {
			return rank[a.Kind] < rank[b.Kind]
		}
		return a.Time < b.Time
	})

	return c.JSON(http.StatusOK, map[string]interface{}{
		"from": start.Format("2006-01-02"),
		"to":   end.AddDate(0, 0, -1).Format("2006-01-02"),
		"data": events,
	})
}

// taxCalendar: the online deadlines of the monthly tax filings that fall
// between start and end. A month's forms are due in the month after it.
func (s *Server) taxCalendar(start, end time.Time) ([]CalendarEvent, error) {
	from := monthOf(start).AddDate(0, -1, 0)
	last := monthOf(end.AddDate(0, 0, -1)).AddDate(0, -1, 0)
	if current := thisMonth(); !last.Before(current) {
		// A month still running has nothing to file yet; its deadline is
		// shown once it is over.
		last = current.AddDate(0, -1, 0)
	}
	if last.Before(from) {
		return nil, nil
	}
	dues, err := s.taxDeadlines(from, last)
	if err != nil {
		return nil, err
	}
	events := []CalendarEvent{}
	for _, d := range dues {
		day, err := time.ParseInLocation("2006-01-02", d.EfilingDueDate, leadrules.Bangkok)
		if err != nil || day.Before(start) || !day.Before(end) {
			continue
		}
		period, _ := time.ParseInLocation("2006-01", d.Period, leadrules.Bangkok)
		events = append(events, CalendarEvent{
			Kind:     CalendarTaxDeadline,
			Date:     d.EfilingDueDate,
			Title:    "ยื่น " + d.Label + " งวด " + period.Format("01/2006") + " (ออนไลน์)",
			Detail:   taxAmountNote(d),
			LeadName: "ภาษีรายเดือน",
			Link:     "/docs/tax/?month=" + d.Period,
		})
	}
	return events, nil
}

func meetingTime(at time.Time) string {
	if at.Hour() == 0 && at.Minute() == 0 {
		return ""
	}
	return at.Format("15:04")
}

func isClosedStage(stage string) bool {
	for _, closed := range models.ClosedStages() {
		if stage == closed {
			return true
		}
	}
	return false
}

func egpDeadlineDetail(row *models.EgpAnnouncement) string {
	parts := []string{"e-GP " + row.ProjectID}
	if row.Budget > 0 {
		parts = append(parts, "วงเงิน "+egpradar.Baht(row.Budget))
	}
	return strings.Join(parts, " · ")
}

func setOwner(event *CalendarEvent, lead *models.Lead) {
	if lead.OwnerUserID != nil {
		event.OwnerID = lead.OwnerUserID
	}
	if lead.Owner != nil {
		event.OwnerName = lead.Owner.Name
	}
}

func dayStart(t time.Time) time.Time {
	b := t.In(leadrules.Bangkok)
	return time.Date(b.Year(), b.Month(), b.Day(), 0, 0, 0, 0, leadrules.Bangkok)
}

func bangkokDay(t time.Time) string {
	return t.In(leadrules.Bangkok).Format("2006-01-02")
}

func orDefault(s, fallback string) string {
	if strings.TrimSpace(s) == "" {
		return fallback
	}
	return s
}
