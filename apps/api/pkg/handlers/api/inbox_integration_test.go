package api

import (
	"fmt"
	"net/http"
	"testing"
	"time"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	gormlogger "gorm.io/gorm/logger"

	"github.com/owldayhouse/odh-internal-api/pkg/database"
	"github.com/owldayhouse/odh-internal-api/pkg/models"
	storeinbound "github.com/owldayhouse/odh-internal-api/pkg/store/inbound"
)

// addInbound stores a request the way the intake service does and returns its
// id. The intake's insert returns nothing, so the id is read back here.
func (e *testEnv) addInbound(row *models.InboundRequest) uint {
	e.t.Helper()
	if err := e.server.InboundStore.Create(row); err != nil {
		e.t.Fatalf("cannot store an inbound request: %v", err)
	}
	var id uint
	if err := e.db.Raw(`SELECT MAX(id) FROM inbound_requests`).Scan(&id).Error; err != nil {
		e.t.Fatal(err)
	}
	return id
}

func sampleInbound() *models.InboundRequest {
	return &models.InboundRequest{
		ContactName: "คุณทดสอบ ใจดี",
		Company:     "บริษัท ฟอร์มเว็บ จำกัด",
		Industry:    models.IndustryEducation,
		Phone:       "0812345678",
		Email:       "test@example.com",
		Interests:   []string{models.InterestSystem, models.InterestEvent},
		Brief:       "อยากได้ระบบลงทะเบียนหน้างาน",
		Timeline:    models.TimelineOneThree,
		BudgetBand:  models.BudgetMid,
		UTMSource:   "facebook",
		UTMCampaign: "nov-2026",
		LandingPath: "/contact/",
	}
}

func TestInboxAcceptCreatesALeadOnce(t *testing.T) {
	env := newTestEnv(t)
	id := env.addInbound(sampleInbound())

	res := env.do(env.sales1, http.MethodPost, fmt.Sprintf("/api/inbox/%d/accept", id), map[string]interface{}{})
	if res.Status != http.StatusOK {
		t.Fatalf("accept: want 200, got %d: %s", res.Status, res.Raw)
	}

	var row models.InboundRequest
	if err := env.db.First(&row, id).Error; err != nil {
		t.Fatal(err)
	}
	if row.Status != models.InboundStatusAccepted || row.LeadID == nil || row.HandledBy == nil || *row.HandledBy != env.sales1.ID {
		t.Fatalf("request not marked accepted by sales1: %+v", row)
	}

	var lead models.Lead
	if err := env.db.First(&lead, *row.LeadID).Error; err != nil {
		t.Fatal(err)
	}
	if lead.Source != models.SourceWebsite || lead.UTMSource != "facebook" || lead.UTMCampaign != "nov-2026" {
		t.Fatalf("lead did not carry the source over: %+v", lead)
	}
	if lead.OwnerUserID == nil || *lead.OwnerUserID != env.sales1.ID || lead.OwnerType != models.OwnerTypeCompany {
		t.Fatalf("a sales account should own the website lead it accepts: %+v", lead)
	}
	if len(lead.Interests) != 2 {
		t.Fatalf("interests not carried over: %v", lead.Interests)
	}

	var contacts int64
	env.db.Model(&models.Contact{}).Where("lead_id = ? AND phone = ?", lead.ID, "0812345678").Count(&contacts)
	if contacts != 1 {
		t.Fatalf("want the form's person as a contact, got %d", contacts)
	}
	var logs int64
	env.db.Model(&models.OwnershipLog{}).Where("lead_id = ? AND changed_by = ?", lead.ID, env.sales1.ID).Count(&logs)
	if logs != 1 {
		t.Fatalf("want one ownership log naming who accepted, got %d", logs)
	}

	again := env.do(env.admin, http.MethodPost, fmt.Sprintf("/api/inbox/%d/accept", id), map[string]interface{}{})
	if again.Status != http.StatusConflict {
		t.Fatalf("a second accept: want 409, got %d: %s", again.Status, again.Raw)
	}
}

func TestInboxAcceptRespectsOwnershipAndDuplicates(t *testing.T) {
	env := newTestEnv(t)

	// sales1 already has this customer.
	existing := env.createLead(env.sales1, map[string]interface{}{
		"name": "ฟอร์มเว็บ", "industry": "education", "source": "trade_fair",
	})
	if existing.Status != http.StatusCreated {
		t.Fatalf("seed lead: %d %s", existing.Status, existing.Raw)
	}
	leadID := uint(existing.Body["id"].(float64))

	id := env.addInbound(sampleInbound())

	// Creating a new lead under the same name is refused.
	dup := env.do(env.admin, http.MethodPost, fmt.Sprintf("/api/inbox/%d/accept", id), map[string]interface{}{})
	if dup.Status != http.StatusConflict {
		t.Fatalf("duplicate name: want 409, got %d: %s", dup.Status, dup.Raw)
	}

	// A sales account cannot hand a request to someone else.
	other := env.do(env.sales2, http.MethodPost, fmt.Sprintf("/api/inbox/%d/accept", id), map[string]interface{}{
		"name": "ชื่ออื่นที่ไม่ซ้ำเลย", "owner_user_id": env.sales1.ID,
	})
	if other.Status != http.StatusForbidden {
		t.Fatalf("sales assigning to another: want 403, got %d: %s", other.Status, other.Raw)
	}

	// Nor attach it to a customer it does not own.
	attach := env.do(env.sales2, http.MethodPost, fmt.Sprintf("/api/inbox/%d/accept", id), map[string]interface{}{"lead_id": leadID})
	if attach.Status != http.StatusForbidden {
		t.Fatalf("attach to another's lead: want 403, got %d: %s", attach.Status, attach.Raw)
	}

	// The owner can.
	mine := env.do(env.sales1, http.MethodPost, fmt.Sprintf("/api/inbox/%d/accept", id), map[string]interface{}{"lead_id": leadID})
	if mine.Status != http.StatusOK {
		t.Fatalf("attach by owner: want 200, got %d: %s", mine.Status, mine.Raw)
	}
	var notes int64
	env.db.Model(&models.Activity{}).Where("lead_id = ? AND type = ?", leadID, models.ActivityNote).Count(&notes)
	if notes != 1 {
		t.Fatalf("want the brief on the lead's timeline, got %d notes", notes)
	}
}

func TestInboxDiscardDeleteAndCounts(t *testing.T) {
	env := newTestEnv(t)
	first := env.addInbound(sampleInbound())
	second := env.addInbound(sampleInbound())

	counts := env.do(env.sales1, http.MethodGet, "/api/inbox/counts", nil)
	if counts.Status != http.StatusOK || counts.Body["new"].(float64) != 2 {
		t.Fatalf("counts: %d %s", counts.Status, counts.Raw)
	}

	res := env.do(env.sales1, http.MethodPost, fmt.Sprintf("/api/inbox/%d/discard", first), map[string]string{"reason": "สแปม"})
	if res.Status != http.StatusOK || res.Body["status"] != models.InboundStatusDiscarded || res.Body["discard_reason"] != "สแปม" {
		t.Fatalf("discard: %d %s", res.Status, res.Raw)
	}

	list := env.do(env.sales1, http.MethodGet, "/api/inbox?status=new", nil)
	if list.Status != http.StatusOK || list.Body["total"].(float64) != 1 {
		t.Fatalf("list new: %d %s", list.Status, list.Raw)
	}

	if res := env.do(env.sales1, http.MethodDelete, fmt.Sprintf("/api/inbox/%d", second), nil); res.Status != http.StatusForbidden {
		t.Fatalf("sales erase: want 403, got %d", res.Status)
	}
	if res := env.do(env.admin, http.MethodDelete, fmt.Sprintf("/api/inbox/%d", second), nil); res.Status != http.StatusNoContent {
		t.Fatalf("admin erase: want 204, got %d: %s", res.Status, res.Raw)
	}
	if res := env.do(env.admin, http.MethodGet, fmt.Sprintf("/api/inbox/%d", second), nil); res.Status != http.StatusNotFound {
		t.Fatalf("after erase: want 404, got %d", res.Status)
	}
}

func TestInboxPurgeKeepsOnlyAccepted(t *testing.T) {
	env := newTestEnv(t)
	old := time.Now().Add(-models.InboundRetention - 24*time.Hour)

	stale := sampleInbound()
	stale.CreatedAt = old
	staleID := env.addInbound(stale)

	discarded := sampleInbound()
	discarded.CreatedAt = old
	discarded.Status = models.InboundStatusDiscarded
	discardedID := env.addInbound(discarded)

	accepted := sampleInbound()
	accepted.CreatedAt = old
	accepted.Status = models.InboundStatusAccepted
	acceptedID := env.addInbound(accepted)

	fresh := env.addInbound(sampleInbound())

	purged, err := env.server.InboundStore.PurgeUnaccepted(time.Now().Add(-models.InboundRetention))
	if err != nil {
		t.Fatal(err)
	}
	if purged != 2 {
		t.Fatalf("want 2 purged, got %d", purged)
	}
	var left []uint
	env.db.Model(&models.InboundRequest{}).Order("id").Pluck("id", &left)
	if len(left) != 2 || left[0] != acceptedID || left[1] != fresh {
		t.Fatalf("want %d and %d kept (not %d, %d), got %v", acceptedID, fresh, staleID, discardedID, left)
	}
}

// TestIntakeRoleIsInsertOnly checks the grant that the whole public endpoint
// rests on: the intake's role can add a request and do nothing else.
func TestIntakeRoleIsInsertOnly(t *testing.T) {
	env := newTestEnv(t)
	const password = "intake-test-password-1234"
	if err := database.EnsureIntakeRole(env.db, env.config.Postgres.Database, password); err != nil {
		t.Fatalf("EnsureIntakeRole: %v", err)
	}
	// Running it twice must be harmless.
	if err := database.EnsureIntakeRole(env.db, env.config.Postgres.Database, password); err != nil {
		t.Fatalf("EnsureIntakeRole again: %v", err)
	}

	cfg := env.config.Postgres
	cfg.Username = database.IntakeRole
	cfg.Password = password
	intakeDB, err := gorm.Open(postgres.Open(cfg.DSN()), &gorm.Config{Logger: gormlogger.Default.LogMode(gormlogger.Silent)})
	if err != nil {
		t.Fatalf("cannot connect as the intake role: %v", err)
	}
	defer func() {
		if pool, err := intakeDB.DB(); err == nil {
			_ = pool.Close()
		}
	}()

	if err := storeinbound.New(intakeDB).Create(sampleInbound()); err != nil {
		t.Fatalf("the intake role must be able to insert: %v", err)
	}

	denied := map[string]string{
		"read requests":   `SELECT id FROM inbound_requests`,
		"update requests": `UPDATE inbound_requests SET status = 'accepted'`,
		"delete requests": `DELETE FROM inbound_requests`,
		"read leads":      `SELECT id FROM leads`,
		"read users":      `SELECT id FROM users`,
		"insert leads":    `INSERT INTO leads (name) VALUES ('x')`,
	}
	for name, statement := range denied {
		if err := intakeDB.Exec(statement).Error; err == nil {
			t.Errorf("the intake role should not be able to %s", name)
		}
	}
}
