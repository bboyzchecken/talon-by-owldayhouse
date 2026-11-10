package api

import (
	"fmt"
	"net/http"
	"testing"
	"time"

	"github.com/owldayhouse/odh-internal-api/pkg/leadrules"
)

// beDate writes a day as e-GP does: dd/mm/yyyy in the Buddhist era.
func beDate(t time.Time) string {
	return fmt.Sprintf("%02d/%02d/%d", t.Day(), int(t.Month()), t.Year()+543)
}

func egpCSVWithDeadline(deadline time.Time) string {
	return "หน่วยงาน,หน่วยจัดซื้อ,ชื่อโครงการ,วงเงินงบประมาณ (บาท),สถานะโครงการ,วันสิ้นสุดเสนอราคา\n" +
		`มหาวิทยาลัยเชียงใหม่,กองคลัง,"จ้างพัฒนาระบบลงทะเบียนและเว็บไซต์ โดยวิธีเฉพาะเจาะจง (เลขที่โครงการ : 69119000001)","480,000.00",หนังสือเชิญชวน/ประกาศเชิญชวน,` + beDate(deadline) + "\n"
}

type calendarEvent struct {
	Kind      string `json:"kind"`
	Date      string `json:"date"`
	Title     string `json:"title"`
	LeadID    uint   `json:"lead_id"`
	OwnerID   *uint  `json:"owner_id"`
	OwnerName string `json:"owner_name"`
	ProjectID string `json:"project_id"`
}

func TestClosingDateMovesTheFollowUpAndShowsOnTheTeamCalendar(t *testing.T) {
	env := newTestEnv(t)
	env.doMultipart(env.admin, "/api/egp/import", nil, egpCSV)
	website := env.egpIDByProject("69119000001")
	sent := env.do(env.admin, http.MethodPost, fmt.Sprintf("/api/egp/announcements/%d/send", website), map[string]interface{}{
		"owner_user_id": env.sales1.ID,
	})
	if sent.Status != http.StatusOK {
		t.Fatalf("send: %d %s", sent.Status, sent.Raw)
	}
	leadID := uint(sent.Body["lead_id"].(float64))

	// A later export carries the closing date: the follow-up moves to three
	// days before it (the default lead time).
	today := time.Now().In(leadrules.Bangkok)
	deadline := today.AddDate(0, 0, 20)
	r := env.doMultipart(env.admin, "/api/egp/import", nil, egpCSVWithDeadline(deadline))
	if r.Status != http.StatusOK || r.Body["follow_ups_moved"].(float64) != 1 {
		t.Fatalf("import with a closing date: %d %s", r.Status, r.Raw)
	}
	var lead struct {
		NextActionDate string `json:"next_action_date"`
	}
	env.do(env.admin, http.MethodGet, fmt.Sprintf("/api/leads/%d", leadID), nil).as(t, "lead", &lead)
	got, _ := time.Parse(time.RFC3339, lead.NextActionDate)
	if want := deadline.AddDate(0, 0, -3).Format("2006-01-02"); got.In(leadrules.Bangkok).Format("2006-01-02") != want {
		t.Errorf("follow-up = %s, want %s", lead.NextActionDate, want)
	}

	// Another sales person sees the closing date on the team calendar,
	// with whose lead it is.
	from, to := today.Format("2006-01-02"), today.AddDate(0, 0, 30).Format("2006-01-02")
	cal := env.do(env.sales2, http.MethodGet, "/api/calendar?from="+from+"&to="+to, nil)
	if cal.Status != http.StatusOK {
		t.Fatalf("calendar: %d %s", cal.Status, cal.Raw)
	}
	var events []calendarEvent
	cal.as(t, "data", &events)
	var closing, follow *calendarEvent
	for i := range events {
		switch events[i].Kind {
		case "egp_deadline":
			closing = &events[i]
		case "follow_up":
			follow = &events[i]
		}
	}
	if closing == nil || closing.Date != deadline.Format("2006-01-02") || closing.ProjectID != "69119000001" ||
		closing.LeadID != leadID || closing.OwnerID == nil || *closing.OwnerID != env.sales1.ID || closing.OwnerName != env.sales1.Name {
		t.Fatalf("closing date event = %+v (all: %+v)", closing, events)
	}
	if follow == nil || follow.LeadID != leadID {
		t.Errorf("follow-up event = %+v", follow)
	}

	// Once the sales person writes their own next step, a new closing date
	// no longer moves it; the calendar still shows the closing date.
	if r := env.do(env.sales1, http.MethodPatch, fmt.Sprintf("/api/leads/%d", leadID), map[string]interface{}{
		"next_action": "โทรหาอาจารย์ผู้รับผิดชอบ",
	}); r.Status != http.StatusOK {
		t.Fatalf("edit lead: %d %s", r.Status, r.Raw)
	}
	later := deadline.AddDate(0, 0, 5)
	r = env.doMultipart(env.admin, "/api/egp/import", nil, egpCSVWithDeadline(later))
	if r.Body["follow_ups_moved"].(float64) != 0 {
		t.Errorf("a follow-up the sales person set was moved: %s", r.Raw)
	}
	env.do(env.sales2, http.MethodGet, "/api/calendar?from="+from+"&to="+to, nil).as(t, "data", &events)
	found := false
	for _, e := range events {
		if e.Kind == "egp_deadline" && e.Date == later.Format("2006-01-02") {
			found = true
		}
	}
	if !found {
		t.Errorf("the new closing date is not on the calendar: %+v", events)
	}

	if r := env.do(env.sales1, http.MethodGet, "/api/calendar?from="+from+"&to="+today.AddDate(0, 0, 90).Format("2006-01-02"), nil); r.Status != http.StatusBadRequest {
		t.Errorf("a 90-day range: got %d, want 400", r.Status)
	}
}

func TestSettingTheClosingDateOnASentProjectMovesTheFollowUp(t *testing.T) {
	env := newTestEnv(t)
	env.doMultipart(env.admin, "/api/egp/import", nil, egpCSV)
	website := env.egpIDByProject("69119000001")
	sent := env.do(env.admin, http.MethodPost, fmt.Sprintf("/api/egp/announcements/%d/send", website), map[string]interface{}{
		"owner_user_id": env.sales1.ID,
	})
	leadID := uint(sent.Body["lead_id"].(float64))

	deadline := time.Now().In(leadrules.Bangkok).AddDate(0, 0, 14)
	r := env.do(env.admin, http.MethodPatch, fmt.Sprintf("/api/egp/announcements/%d", website), map[string]string{
		"deadline_at": deadline.Format("2006-01-02"),
	})
	if r.Status != http.StatusOK || r.Body["follow_up_moved"] != true || r.Body["project_id"] != "69119000001" {
		t.Fatalf("set closing date: %d %s", r.Status, r.Raw)
	}
	var lead struct {
		NextActionDate string `json:"next_action_date"`
	}
	env.do(env.admin, http.MethodGet, fmt.Sprintf("/api/leads/%d", leadID), nil).as(t, "lead", &lead)
	got, _ := time.Parse(time.RFC3339, lead.NextActionDate)
	if want := deadline.AddDate(0, 0, -3).Format("2006-01-02"); got.In(leadrules.Bangkok).Format("2006-01-02") != want {
		t.Errorf("follow-up = %s, want %s", lead.NextActionDate, want)
	}

	// The same date again changes nothing.
	r = env.do(env.admin, http.MethodPatch, fmt.Sprintf("/api/egp/announcements/%d", website), map[string]string{
		"deadline_at": deadline.Format("2006-01-02"),
	})
	if r.Body["follow_up_moved"] != false {
		t.Errorf("saving the same date again reported a move: %s", r.Raw)
	}
}
