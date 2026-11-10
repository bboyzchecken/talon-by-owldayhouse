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
