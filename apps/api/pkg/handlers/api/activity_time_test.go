package api

import (
	"encoding/json"
	"fmt"
	"net/http"
	"testing"
	"time"

	"github.com/owldayhouse/odh-internal-api/pkg/leadrules"
	"github.com/owldayhouse/odh-internal-api/pkg/models"
)

// The user's report: a call logged today showed "00:00".
func TestActivityTimeIsKept(t *testing.T) {
	env := newTestEnv(t)
	id := leadID(t, env.createLead(env.sales1, newLead("บริษัท ทดสอบเวลา จำกัด")))
	log := func(happenedAt string) time.Time {
		t.Helper()
		r := env.do(env.sales1, http.MethodPost, fmt.Sprintf("/api/leads/%d/activities", id), map[string]interface{}{
			"type": models.ActivityCall, "happened_at": happenedAt, "summary": "โทรคุย",
		})
		if r.Status != http.StatusCreated && r.Status != http.StatusOK {
			t.Fatalf("log %q: %d %s", happenedAt, r.Status, r.Raw)
		}
		var a struct {
			HappenedAt time.Time `json:"happened_at"`
		}
		if err := json.Unmarshal([]byte(r.Raw), &a); err != nil {
			t.Fatalf("decode: %v %s", err, r.Raw)
		}
		return a.HappenedAt.In(leadrules.Bangkok)
	}

	// Date and time from the form are kept as given.
	if got := log("2026-11-20T14:30"); got.Format("2006-01-02 15:04") != "2026-11-20 14:30" {
		t.Errorf("date and time: got %s", got)
	}
	// Only today's date (an older screen) means now, not midnight.
	before := time.Now()
	got := log(time.Now().In(leadrules.Bangkok).Format("2006-01-02"))
	if got.Before(before.Add(-time.Minute)) || got.After(time.Now().Add(time.Minute)) {
		t.Errorf("today's date alone: got %s, want about now", got)
	}
	// Another day without a time stays that day.
	if got := log("2026-12-01"); got.Format("2006-01-02") != "2026-12-01" {
		t.Errorf("a date alone: got %s", got)
	}
}

func TestDeclineLeadsInBulk(t *testing.T) {
	env := newTestEnv(t)
	mine1 := leadID(t, env.createLead(env.sales1, newLead("บริษัท หนึ่ง จำกัด")))
	mine2 := leadID(t, env.createLead(env.sales1, newLead("บริษัท สอง จำกัด")))
	theirs := leadID(t, env.createLead(env.sales2, newLead("บริษัท สาม จำกัด")))

	// A sales person moves their own leads; someone else's is reported back.
	r := env.do(env.sales1, http.MethodPost, "/api/leads/decline", map[string]interface{}{
		"ids": []uint{mine1, mine2, theirs, mine1}, "reason": "งานต่อเนื่องจากระยะ 1",
	})
	if r.Status != http.StatusOK || r.Body["updated"].(float64) != 2 {
		t.Fatalf("decline: %d %s", r.Status, r.Raw)
	}
	if skipped := r.Body["skipped"].([]interface{}); len(skipped) != 1 {
		t.Fatalf("skipped = %v", skipped)
	}

	var lead struct {
		Stage      string `json:"stage"`
		LostReason string `json:"lost_reason"`
	}
	env.do(env.admin, http.MethodGet, fmt.Sprintf("/api/leads/%d", mine1), nil).as(t, "lead", &lead)
	if lead.Stage != models.StageDeclined || lead.LostReason != "งานต่อเนื่องจากระยะ 1" {
		t.Errorf("lead = %+v", lead)
	}
	env.do(env.admin, http.MethodGet, fmt.Sprintf("/api/leads/%d", theirs), nil).as(t, "lead", &lead)
	if lead.Stage == models.StageDeclined {
		t.Error("another sales person's lead was moved")
	}

	// The timeline says why.
	var acts []struct {
		Summary string `json:"summary"`
	}
	env.do(env.sales1, http.MethodGet, fmt.Sprintf("/api/leads/%d/activities", mine2), nil).as(t, "data", &acts)
	if len(acts) == 0 || acts[0].Summary != "ย้ายไป ไม่รับงาน: งานต่อเนื่องจากระยะ 1" {
		t.Errorf("timeline = %+v", acts)
	}

	// Declined leads leave the follow-up lists and can still be filtered.
	list := env.do(env.admin, http.MethodGet, "/api/leads?stage=declined", nil)
	var p struct{ Total int64 }
	list.as(t, "pagination", &p)
	if p.Total != 2 {
		t.Errorf("declined filter found %d, want 2", p.Total)
	}
	// And a declined lead can be brought back like any other stage change.
	if r := env.do(env.sales1, http.MethodPost, fmt.Sprintf("/api/leads/%d/stage", mine1), map[string]string{"stage": "new"}); r.Status != http.StatusOK {
		t.Errorf("bring back: %d %s", r.Status, r.Raw)
	}
}
