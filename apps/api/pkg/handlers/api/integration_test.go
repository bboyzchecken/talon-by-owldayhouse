package api

import (
	"bytes"
	"encoding/json"
	"fmt"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"testing"
	"time"

	"github.com/labstack/echo/v4"
	"github.com/owldayhouse/odh-internal-api/pkg/core"
	"github.com/owldayhouse/odh-internal-api/pkg/database"
	"github.com/owldayhouse/odh-internal-api/pkg/handlers/api/request"
	"github.com/owldayhouse/odh-internal-api/pkg/logger"
	"github.com/owldayhouse/odh-internal-api/pkg/models"
	"github.com/owldayhouse/odh-internal-api/pkg/services/storage"
	storeactivity "github.com/owldayhouse/odh-internal-api/pkg/store/activity"
	storecontact "github.com/owldayhouse/odh-internal-api/pkg/store/contact"
	storedeal "github.com/owldayhouse/odh-internal-api/pkg/store/deal"
	storefile "github.com/owldayhouse/odh-internal-api/pkg/store/file"
	storekpi "github.com/owldayhouse/odh-internal-api/pkg/store/kpi"
	storelead "github.com/owldayhouse/odh-internal-api/pkg/store/lead"
	storeownership "github.com/owldayhouse/odh-internal-api/pkg/store/ownership"
	storesetting "github.com/owldayhouse/odh-internal-api/pkg/store/setting"
	storetarget "github.com/owldayhouse/odh-internal-api/pkg/store/target"
	storeuser "github.com/owldayhouse/odh-internal-api/pkg/store/user"
	"github.com/sirupsen/logrus"
	"gorm.io/gorm"
)

// These tests run against a real PostgreSQL 16 with pg_trgm, because the rules
// they cover (the unique index on normalized_name, similarity()) ARE database
// behaviour and are worth nothing against a fake.
//
// Point them at a database with:
//
//	ODH_TEST_PG_HOST=127.0.0.1 ODH_TEST_PG_PORT=55432 \
//	ODH_TEST_PG_USERNAME=postgres ODH_TEST_PG_PASSWORD= \
//	ODH_TEST_PG_DATABASE=odh_internal_test go test ./...
//
// With no database reachable they skip, so `go test ./...` stays green on a
// machine without one.
func testConfig() core.Config {
	env := func(key, fallback string) string {
		if value := os.Getenv(key); value != "" {
			return value
		}
		return fallback
	}

	return core.Config{
		Environment: "test",
		JwtSecret:   "test-secret-for-integration-tests",
		JwtTTL:      time.Hour,
		Postgres: core.PostgresConfig{
			Host:         env("ODH_TEST_PG_HOST", "127.0.0.1"),
			Port:         env("ODH_TEST_PG_PORT", "55432"),
			Username:     env("ODH_TEST_PG_USERNAME", "postgres"),
			Password:     os.Getenv("ODH_TEST_PG_PASSWORD"),
			Database:     env("ODH_TEST_PG_DATABASE", "odh_internal_test"),
			SSLMode:      env("ODH_TEST_PG_SSLMODE", "disable"),
			TimeZone:     "Asia/Bangkok",
			MaxOpenConns: 5,
			MaxIdleConns: 2,
		},
		R2: core.R2Config{
			Region:         "auto",
			AccessKey:      "test",
			SecretKey:      "test",
			FileBucket:     "odh-internal-files-test",
			PresignExpiry:  15 * time.Minute,
			MaxUploadBytes: 20 * 1024 * 1024,
		},
		Leads: core.LeadsConfig{SimilarityThreshold: 0.4},
	}
}

type testEnv struct {
	t      *testing.T
	config core.Config
	db     *gorm.DB
	server *Server
	echo   *echo.Echo

	admin  *models.User
	sales1 *models.User
	sales2 *models.User
}

// newTestEnv connects, migrates, empties every table and seeds one admin plus
// two sales accounts.
func newTestEnv(t *testing.T) *testEnv {
	t.Helper()

	config := testConfig()
	log := logger.New("test")
	log.SetLevel(logrus.ErrorLevel)

	db, err := database.New(config, log)
	if err != nil {
		t.Skipf("no PostgreSQL for the integration tests (%v) — see the comment at the top of this file", err)
	}
	pool, err := db.DB()
	if err != nil || pool.Ping() != nil {
		t.Skipf("no PostgreSQL for the integration tests — see the comment at the top of this file")
	}
	if err := database.Migrate(db); err != nil {
		t.Fatalf("migrations failed: %v", err)
	}

	err = db.Exec(`TRUNCATE ownership_logs, targets, deals, activities, contacts, leads, files, users RESTART IDENTITY CASCADE`).Error
	if err != nil {
		t.Fatalf("cannot clear the test database: %v", err)
	}

	users := storeuser.New(db)
	settings := storesetting.New(db)
	leads := storelead.New(db)

	// A wide-open cut-off by default; the cut-off test narrows it.
	if err := settings.Set(models.SettingSalesExistingCutoff, "2099-12-31", 0); err != nil {
		t.Fatalf("cannot set the cut-off: %v", err)
	}

	server := NewServer(
		config, log,
		users, settings, storefile.New(db), leads, storecontact.New(db),
		storeactivity.New(db), storedeal.New(db), storetarget.New(db),
		storeownership.New(db), storekpi.New(db),
		storage.New(config, storage.NewR2Client(config)),
	)

	env := &testEnv{t: t, config: config, db: db, server: server, echo: server.Handler()}
	env.admin = env.createUser("admin", "แอดมิน", models.RoleAdmin)
	env.sales1 = env.createUser("sales1", "เซลส์ หนึ่ง", models.RoleSales)
	env.sales2 = env.createUser("sales2", "เซลส์ สอง", models.RoleSales)
	return env
}

func (e *testEnv) createUser(username, name, role string) *models.User {
	e.t.Helper()
	hash, err := request.HashPassword("test-password-1234")
	if err != nil {
		e.t.Fatal(err)
	}
	user := &models.User{
		Username: username, Name: name, Password: hash,
		Role: role, Status: models.StatusActive,
	}
	if err := e.server.UserStore.Create(user); err != nil {
		e.t.Fatal(err)
	}
	return user
}

func (e *testEnv) setCutoff(value string) {
	e.t.Helper()
	if err := e.server.SettingStore.Set(models.SettingSalesExistingCutoff, value, e.admin.ID); err != nil {
		e.t.Fatal(err)
	}
}

// response is a decoded JSON reply.
type response struct {
	Status int
	Body   map[string]interface{}
	Raw    string
}

// as reads a field of the body into target.
func (r response) as(t *testing.T, field string, target interface{}) {
	t.Helper()
	raw, err := json.Marshal(r.Body[field])
	if err != nil {
		t.Fatal(err)
	}
	if err := json.Unmarshal(raw, target); err != nil {
		t.Fatalf("cannot decode %q from %s: %v", field, r.Raw, err)
	}
}

// do sends an authenticated JSON request as the given user.
func (e *testEnv) do(user *models.User, method, path string, body interface{}) response {
	e.t.Helper()

	var reader *bytes.Reader
	if body != nil {
		encoded, err := json.Marshal(body)
		if err != nil {
			e.t.Fatal(err)
		}
		reader = bytes.NewReader(encoded)
	} else {
		reader = bytes.NewReader(nil)
	}

	req := httptest.NewRequest(method, path, reader)
	req.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
	if user != nil {
		token, _, err := e.server.IssueToken(user)
		if err != nil {
			e.t.Fatal(err)
		}
		req.Header.Set(echo.HeaderAuthorization, "Bearer "+token)
	}

	rec := httptest.NewRecorder()
	e.echo.ServeHTTP(rec, req)

	out := response{Status: rec.Code, Raw: rec.Body.String()}
	if strings.HasPrefix(rec.Header().Get(echo.HeaderContentType), echo.MIMEApplicationJSON) {
		if err := json.Unmarshal(rec.Body.Bytes(), &out.Body); err != nil {
			out.Body = map[string]interface{}{}
		}
	}
	return out
}

// doMultipart sends a CSV import request.
func (e *testEnv) doMultipart(user *models.User, path string, fields map[string]string, csvBody string) response {
	e.t.Helper()

	var buffer bytes.Buffer
	writer := multipart.NewWriter(&buffer)
	for key, value := range fields {
		if err := writer.WriteField(key, value); err != nil {
			e.t.Fatal(err)
		}
	}
	part, err := writer.CreateFormFile("file", "leads.csv")
	if err != nil {
		e.t.Fatal(err)
	}
	if _, err := part.Write([]byte(csvBody)); err != nil {
		e.t.Fatal(err)
	}
	if err := writer.Close(); err != nil {
		e.t.Fatal(err)
	}

	req := httptest.NewRequest(http.MethodPost, path, &buffer)
	req.Header.Set(echo.HeaderContentType, writer.FormDataContentType())
	token, _, err := e.server.IssueToken(user)
	if err != nil {
		e.t.Fatal(err)
	}
	req.Header.Set(echo.HeaderAuthorization, "Bearer "+token)

	rec := httptest.NewRecorder()
	e.echo.ServeHTTP(rec, req)

	out := response{Status: rec.Code, Raw: rec.Body.String()}
	if err := json.Unmarshal(rec.Body.Bytes(), &out.Body); err != nil {
		out.Body = map[string]interface{}{}
	}
	return out
}

// newLead is a minimal valid create body.
func newLead(name string) map[string]interface{} {
	return map[string]interface{}{
		"name":            name,
		"industry":        models.IndustryOther,
		"source":          models.SourceTradeFair,
		"source_detail":   "งานแสดงสินค้าตัวอย่าง",
		"confirm_similar": true,
	}
}

func (e *testEnv) createLead(user *models.User, body map[string]interface{}) response {
	e.t.Helper()
	return e.do(user, http.MethodPost, "/api/leads", body)
}

func leadID(t *testing.T, r response) uint {
	t.Helper()
	raw, ok := r.Body["id"]
	if !ok {
		t.Fatalf("no id in the response: %s", r.Raw)
	}
	value, ok := raw.(float64)
	if !ok {
		t.Fatalf("id is not a number: %s", r.Raw)
	}
	return uint(value)
}

// --- whoever registers first owns it ----------------------------------------

func TestCreateLeadRejectsAnExactDuplicate(t *testing.T) {
	env := newTestEnv(t)

	first := env.createLead(env.sales1, newLead("บริษัท อาวล์ เดย์ เฮ้าส์ จำกัด"))
	if first.Status != http.StatusCreated {
		t.Fatalf("the first registration should succeed, got %d: %s", first.Status, first.Raw)
	}

	// A different spelling of the same company, by a different sales person.
	second := env.createLead(env.sales2, newLead("บริษัทอาวล์เดย์เฮ้าส์จำกัด"))
	if second.Status != http.StatusConflict {
		t.Fatalf("the duplicate should be refused with 409, got %d: %s", second.Status, second.Raw)
	}

	var duplicate struct {
		ID           uint      `json:"id"`
		OwnerName    string    `json:"owner_name"`
		OwnerType    string    `json:"owner_type"`
		RegisteredAt time.Time `json:"registered_at"`
	}
	second.as(t, "duplicate", &duplicate)

	// The response has to answer "whose is it, and since when".
	if duplicate.ID != leadID(t, first) {
		t.Errorf("the conflict points at lead %d, want %d", duplicate.ID, leadID(t, first))
	}
	if duplicate.OwnerName != env.sales1.Name {
		t.Errorf("owner_name = %q, want %q", duplicate.OwnerName, env.sales1.Name)
	}
	if duplicate.RegisteredAt.IsZero() {
		t.Error("registered_at should say when it was registered")
	}
}

func TestCreateLeadRejectsADuplicateTaxID(t *testing.T) {
	env := newTestEnv(t)

	body := newLead("บริษัท หนึ่ง สอง สาม จำกัด")
	body["tax_id"] = "0105543000191"
	if r := env.createLead(env.sales1, body); r.Status != http.StatusCreated {
		t.Fatalf("got %d: %s", r.Status, r.Raw)
	}

	// A different name, the same tax ID written with dashes.
	other := newLead("บริษัท ชื่ออื่นไปเลย จำกัด")
	other["tax_id"] = "0-1055-43000-19-1"
	second := env.createLead(env.sales2, other)
	if second.Status != http.StatusConflict {
		t.Fatalf("the duplicate tax ID should be refused with 409, got %d: %s", second.Status, second.Raw)
	}
	if got, _ := second.Body["matched_on"].(string); got != "tax_id" {
		t.Errorf("matched_on = %q, want tax_id", got)
	}
}

func TestCreateLeadWarnsAboutASimilarNameButCanBeConfirmed(t *testing.T) {
	env := newTestEnv(t)

	if r := env.createLead(env.sales1, newLead("บริษัท อาวล์ เดย์ เฮ้าส์ จำกัด")); r.Status != http.StatusCreated {
		t.Fatalf("got %d: %s", r.Status, r.Raw)
	}

	// Similar, not identical: a missing tone mark.
	body := newLead("บริษัท อาวล์ เดย์ เฮาส์ จำกัด")
	body["confirm_similar"] = false

	warned := env.createLead(env.sales2, body)
	if warned.Status != http.StatusConflict {
		t.Fatalf("a similar name should warn with 409, got %d: %s", warned.Status, warned.Raw)
	}
	var similar []struct {
		Name       string  `json:"name"`
		OwnerName  string  `json:"owner_name"`
		Similarity float64 `json:"similarity"`
	}
	warned.as(t, "similar", &similar)
	if len(similar) == 0 {
		t.Fatalf("the warning should list the similar leads: %s", warned.Raw)
	}
	if similar[0].OwnerName != env.sales1.Name {
		t.Errorf("owner_name = %q, want %q", similar[0].OwnerName, env.sales1.Name)
	}
	if similar[0].Similarity < env.config.Leads.SimilarityThreshold {
		t.Errorf("similarity %.2f is below the threshold %.2f", similar[0].Similarity, env.config.Leads.SimilarityThreshold)
	}

	// Confirming goes through: it really is a different company.
	body["confirm_similar"] = true
	confirmed := env.createLead(env.sales2, body)
	if confirmed.Status != http.StatusCreated {
		t.Fatalf("a confirmed similar name should be created, got %d: %s", confirmed.Status, confirmed.Raw)
	}
}

func TestCheckEndpointReportsDuplicatesAndSimilarNames(t *testing.T) {
	env := newTestEnv(t)
	if r := env.createLead(env.sales1, newLead("บริษัท อาวล์ เดย์ เฮ้าส์ จำกัด")); r.Status != http.StatusCreated {
		t.Fatalf("got %d: %s", r.Status, r.Raw)
	}

	t.Run("an exact match reports the duplicate", func(t *testing.T) {
		r := env.do(env.sales2, http.MethodGet, "/api/leads/check?name="+urlEncode("อาวล์ เดย์ เฮ้าส์"), nil)
		if r.Status != http.StatusOK {
			t.Fatalf("got %d: %s", r.Status, r.Raw)
		}
		if r.Body["duplicate"] == nil {
			t.Fatalf("expected a duplicate: %s", r.Raw)
		}
	})

	t.Run("a similar match reports the similar list", func(t *testing.T) {
		r := env.do(env.sales2, http.MethodGet, "/api/leads/check?name="+urlEncode("อาวล์ เดย์ เฮาส์"), nil)
		if r.Status != http.StatusOK {
			t.Fatalf("got %d: %s", r.Status, r.Raw)
		}
		if r.Body["duplicate"] != nil {
			t.Errorf("a near match is not a duplicate: %s", r.Raw)
		}
		var similar []map[string]interface{}
		r.as(t, "similar", &similar)
		if len(similar) == 0 {
			t.Errorf("expected at least one similar lead: %s", r.Raw)
		}
	})

	t.Run("an unrelated name is clean", func(t *testing.T) {
		r := env.do(env.sales2, http.MethodGet, "/api/leads/check?name="+urlEncode("บริษัท คลินิกผิวดีเวชกรรม จำกัด"), nil)
		if r.Body["duplicate"] != nil {
			t.Errorf("unexpected duplicate: %s", r.Raw)
		}
		var similar []map[string]interface{}
		r.as(t, "similar", &similar)
		if len(similar) != 0 {
			t.Errorf("unexpected similar leads: %s", r.Raw)
		}
	})
}

// --- the sales_existing cut-off ---------------------------------------------

func TestSalesExistingCutoff(t *testing.T) {
	env := newTestEnv(t)
	env.setCutoff("2020-01-01") // long past

	t.Run("a sales person cannot register their own existing customer after the cut-off", func(t *testing.T) {
		body := newLead("บริษัท ลูกค้าเดิมของเซลส์ จำกัด")
		body["owner_type"] = models.OwnerTypeSalesExisting
		r := env.createLead(env.sales1, body)
		if r.Status != http.StatusForbidden {
			t.Fatalf("got %d, want 403: %s", r.Status, r.Raw)
		}
	})

	t.Run("an admin still can", func(t *testing.T) {
		body := newLead("บริษัท ลูกค้าเดิมที่แอดมินลงให้ จำกัด")
		body["owner_type"] = models.OwnerTypeSalesExisting
		body["owner_user_id"] = env.sales1.ID
		r := env.createLead(env.admin, body)
		if r.Status != http.StatusCreated {
			t.Fatalf("got %d, want 201: %s", r.Status, r.Raw)
		}
		if got, _ := r.Body["owner_type"].(string); got != models.OwnerTypeSalesExisting {
			t.Errorf("owner_type = %q", got)
		}
	})

	t.Run("before the cut-off a sales person can", func(t *testing.T) {
		env.setCutoff("2099-12-31")
		body := newLead("บริษัท ลูกค้าเดิมก่อนหมดเขต จำกัด")
		body["owner_type"] = models.OwnerTypeSalesExisting
		r := env.createLead(env.sales1, body)
		if r.Status != http.StatusCreated {
			t.Fatalf("got %d, want 201: %s", r.Status, r.Raw)
		}
		if got, _ := r.Body["owner_type"].(string); got != models.OwnerTypeSalesExisting {
			t.Errorf("owner_type = %q, want sales_existing", got)
		}
	})

	t.Run("a lead an admin registers for the company is a company lead", func(t *testing.T) {
		r := env.createLead(env.admin, newLead("บริษัท ลูกค้าที่บริษัทหามา จำกัด"))
		if r.Status != http.StatusCreated {
			t.Fatalf("got %d: %s", r.Status, r.Raw)
		}
		if got, _ := r.Body["owner_type"].(string); got != models.OwnerTypeCompany {
			t.Errorf("owner_type = %q, want company", got)
		}
		if r.Body["owner_user_id"] != nil {
			t.Errorf("an admin's lead starts unassigned, got %v", r.Body["owner_user_id"])
		}
	})
}

// --- only an admin changes the owner, and it is always logged ---------------

func TestOnlyAdminCanChangeTheOwner(t *testing.T) {
	env := newTestEnv(t)

	created := env.createLead(env.sales1, newLead("บริษัท เปลี่ยนเจ้าของ จำกัด"))
	if created.Status != http.StatusCreated {
		t.Fatalf("got %d: %s", created.Status, created.Raw)
	}
	id := leadID(t, created)
	path := fmt.Sprintf("/api/leads/%d/assign", id)

	t.Run("a sales person is refused", func(t *testing.T) {
		r := env.do(env.sales1, http.MethodPost, path, map[string]interface{}{
			"owner_type": models.OwnerTypeCompany, "owner_user_id": env.sales2.ID,
		})
		if r.Status != http.StatusForbidden {
			t.Fatalf("got %d, want 403: %s", r.Status, r.Raw)
		}
	})

	t.Run("a sales person cannot change the owner through PATCH either", func(t *testing.T) {
		r := env.do(env.sales1, http.MethodPatch, fmt.Sprintf("/api/leads/%d", id), map[string]interface{}{
			"owner_user_id": env.sales2.ID,
			"owner_type":    models.OwnerTypeSalesExisting,
			"notes":         "ลองเปลี่ยนเจ้าของผ่าน PATCH",
		})
		if r.Status != http.StatusOK {
			t.Fatalf("the edit itself should succeed, got %d: %s", r.Status, r.Raw)
		}
		// The note was saved; the ownership was not touched.
		var owner float64
		if raw, ok := r.Body["owner_user_id"].(float64); ok {
			owner = raw
		}
		if uint(owner) != env.sales1.ID {
			t.Errorf("owner_user_id = %v, want %d — PATCH must not move ownership", r.Body["owner_user_id"], env.sales1.ID)
		}
		if got, _ := r.Body["owner_type"].(string); got != models.OwnerTypeCompany {
			t.Errorf("owner_type = %q, want company", got)
		}
	})

	t.Run("an admin can, and the change is logged", func(t *testing.T) {
		r := env.do(env.admin, http.MethodPost, path, map[string]interface{}{
			"owner_type": models.OwnerTypeCompany, "owner_user_id": env.sales2.ID,
			"note": "สลับให้เซลส์สอง",
		})
		if r.Status != http.StatusOK {
			t.Fatalf("got %d, want 200: %s", r.Status, r.Raw)
		}
		if uint(r.Body["owner_user_id"].(float64)) != env.sales2.ID {
			t.Errorf("owner_user_id = %v, want %d", r.Body["owner_user_id"], env.sales2.ID)
		}

		logs := env.do(env.admin, http.MethodGet, fmt.Sprintf("/api/leads/%d/ownership-logs", id), nil)
		var entries []struct {
			ChangedBy       uint   `json:"changed_by"`
			FromOwnerUserID *uint  `json:"from_owner_user_id"`
			ToOwnerUserID   *uint  `json:"to_owner_user_id"`
			Note            string `json:"note"`
		}
		logs.as(t, "data", &entries)
		if len(entries) < 2 {
			t.Fatalf("expected the registration AND the reassignment in the log, got %d: %s", len(entries), logs.Raw)
		}

		// Newest first: the reassignment.
		latest := entries[0]
		if latest.ChangedBy != env.admin.ID {
			t.Errorf("changed_by = %d, want the admin %d", latest.ChangedBy, env.admin.ID)
		}
		if latest.FromOwnerUserID == nil || *latest.FromOwnerUserID != env.sales1.ID {
			t.Errorf("from_owner_user_id = %v, want %d", latest.FromOwnerUserID, env.sales1.ID)
		}
		if latest.ToOwnerUserID == nil || *latest.ToOwnerUserID != env.sales2.ID {
			t.Errorf("to_owner_user_id = %v, want %d", latest.ToOwnerUserID, env.sales2.ID)
		}
		if latest.Note != "สลับให้เซลส์สอง" {
			t.Errorf("note = %q", latest.Note)
		}
	})
}

func TestSalesCannotEditSomeoneElsesLead(t *testing.T) {
	env := newTestEnv(t)

	created := env.createLead(env.sales1, newLead("บริษัท ของเซลส์หนึ่ง จำกัด"))
	id := leadID(t, created)

	r := env.do(env.sales2, http.MethodPatch, fmt.Sprintf("/api/leads/%d", id), map[string]interface{}{
		"notes": "แก้ของคนอื่น",
	})
	if r.Status != http.StatusForbidden {
		t.Fatalf("got %d, want 403: %s", r.Status, r.Raw)
	}

	// But everyone can SEE it: one shared customer list is the whole point.
	seen := env.do(env.sales2, http.MethodGet, fmt.Sprintf("/api/leads/%d", id), nil)
	if seen.Status != http.StatusOK {
		t.Fatalf("every account should see every lead, got %d: %s", seen.Status, seen.Raw)
	}
	if canEdit, _ := seen.Body["can_edit"].(bool); canEdit {
		t.Error("can_edit should be false for someone else's lead")
	}
}

// --- do not pitch -----------------------------------------------------------

func TestDoNotPitchBlocksTheDirectSaleStages(t *testing.T) {
	env := newTestEnv(t)

	body := newLead("บริษัท แบรนด์ของเอเจนซี จำกัด")
	body["do_not_pitch"] = true
	body["do_not_pitch_reason"] = "เป็นลูกค้าของเอเจนซีที่จ้างเรา"
	created := env.createLead(env.sales1, body)
	if created.Status != http.StatusCreated {
		t.Fatalf("got %d: %s", created.Status, created.Raw)
	}
	id := leadID(t, created)
	if flagged, _ := created.Body["do_not_pitch"].(bool); !flagged {
		t.Fatal("do_not_pitch should be set")
	}

	for _, stage := range []string{models.StageProposal, models.StageWon} {
		t.Run("cannot move to "+stage, func(t *testing.T) {
			payload := map[string]interface{}{"stage": stage}
			if stage == models.StageWon {
				payload["deal"] = map[string]interface{}{"service": models.InterestEvent, "amount": 100000}
			}
			r := env.do(env.sales1, http.MethodPost, fmt.Sprintf("/api/leads/%d/stage", id), payload)
			if r.Status != http.StatusForbidden {
				t.Fatalf("got %d, want 403: %s", r.Status, r.Raw)
			}
		})
	}

	t.Run("can still be tracked", func(t *testing.T) {
		r := env.do(env.sales1, http.MethodPost, fmt.Sprintf("/api/leads/%d/stage", id), map[string]interface{}{
			"stage": models.StageContacted,
		})
		if r.Status != http.StatusOK {
			t.Fatalf("got %d: %s", r.Status, r.Raw)
		}
	})

	t.Run("logging a sent proposal is refused too", func(t *testing.T) {
		r := env.do(env.sales1, http.MethodPost, fmt.Sprintf("/api/leads/%d/activities", id), map[string]interface{}{
			"type": models.ActivityProposalSent, "summary": "ส่งใบเสนอราคา",
		})
		if r.Status != http.StatusForbidden {
			t.Fatalf("got %d, want 403: %s", r.Status, r.Raw)
		}
	})
}

// --- the KPI split ----------------------------------------------------------

func TestKPISplitsCompanyFromSalesExisting(t *testing.T) {
	env := newTestEnv(t)
	now := time.Now()

	// One company lead, won.
	companyLead := env.createLead(env.sales1, newLead("บริษัท ลูกค้าที่บริษัทหา จำกัด"))
	if companyLead.Status != http.StatusCreated {
		t.Fatalf("got %d: %s", companyLead.Status, companyLead.Raw)
	}
	companyID := leadID(t, companyLead)

	// One existing customer the sales person brought along, also won.
	existingBody := newLead("บริษัท ลูกค้าเดิมที่เซลส์พามา จำกัด")
	existingBody["owner_type"] = models.OwnerTypeSalesExisting
	existing := env.createLead(env.sales1, existingBody)
	if existing.Status != http.StatusCreated {
		t.Fatalf("got %d: %s", existing.Status, existing.Raw)
	}
	existingID := leadID(t, existing)

	for _, id := range []uint{companyID, existingID} {
		for _, kind := range []string{models.ActivityMeeting, models.ActivityProposalSent} {
			r := env.do(env.sales1, http.MethodPost, fmt.Sprintf("/api/leads/%d/activities", id), map[string]interface{}{
				"type": kind, "happened_at": now.Format("2006-01-02"), "summary": "ทดสอบ",
			})
			if r.Status != http.StatusCreated {
				t.Fatalf("activity %s on lead %d: %d %s", kind, id, r.Status, r.Raw)
			}
		}
	}

	amounts := map[uint]float64{companyID: 300000, existingID: 120000}
	for id, amount := range amounts {
		r := env.do(env.sales1, http.MethodPost, fmt.Sprintf("/api/leads/%d/stage", id), map[string]interface{}{
			"stage": models.StageWon,
			"deal":  map[string]interface{}{"service": models.InterestSystem, "amount": amount},
		})
		if r.Status != http.StatusOK {
			t.Fatalf("won on lead %d: %d %s", id, r.Status, r.Raw)
		}
	}

	// The sales person's own KPI for this quarter.
	r := env.do(env.sales1, http.MethodGet, "/api/leads/kpi", nil)
	if r.Status != http.StatusOK {
		t.Fatalf("got %d: %s", r.Status, r.Raw)
	}

	var users []struct {
		UserID  uint `json:"user_id"`
		Company struct {
			NewLeads  int64   `json:"new_leads"`
			Meetings  int64   `json:"meetings"`
			Proposals int64   `json:"proposals"`
			WonAmount float64 `json:"won_amount"`
		} `json:"company"`
		SalesExisting struct {
			NewLeads  int64   `json:"new_leads"`
			Meetings  int64   `json:"meetings"`
			WonAmount float64 `json:"won_amount"`
		} `json:"sales_existing"`
		Total struct {
			WonAmount float64 `json:"won_amount"`
		} `json:"total"`
	}
	r.as(t, "users", &users)
	if len(users) != 1 || users[0].UserID != env.sales1.ID {
		t.Fatalf("a sales account must only see its own KPI, got %s", r.Raw)
	}

	row := users[0]
	if row.Company.NewLeads != 1 {
		t.Errorf("company new_leads = %d, want 1", row.Company.NewLeads)
	}
	if row.SalesExisting.NewLeads != 1 {
		t.Errorf("sales_existing new_leads = %d, want 1", row.SalesExisting.NewLeads)
	}
	if row.Company.WonAmount != 300000 {
		t.Errorf("company won_amount = %.2f, want 300000 — the bonus must not leak into the main KPI", row.Company.WonAmount)
	}
	if row.SalesExisting.WonAmount != 120000 {
		t.Errorf("sales_existing won_amount = %.2f, want 120000", row.SalesExisting.WonAmount)
	}
	if row.Total.WonAmount != 420000 {
		t.Errorf("total won_amount = %.2f, want 420000", row.Total.WonAmount)
	}
	if row.Company.Meetings != 1 || row.Company.Proposals != 1 {
		t.Errorf("company meetings/proposals = %d/%d, want 1/1", row.Company.Meetings, row.Company.Proposals)
	}
}

func TestSalesCannotSeeSomeoneElsesKPI(t *testing.T) {
	env := newTestEnv(t)

	r := env.do(env.sales1, http.MethodGet, fmt.Sprintf("/api/leads/kpi?user_id=%d", env.sales2.ID), nil)
	if r.Status != http.StatusOK {
		t.Fatalf("got %d: %s", r.Status, r.Raw)
	}
	var users []struct {
		UserID uint `json:"user_id"`
	}
	r.as(t, "users", &users)
	if len(users) != 1 || users[0].UserID != env.sales1.ID {
		t.Fatalf("?user_id must be ignored for a sales account, got %s", r.Raw)
	}
}

// --- CSV import -------------------------------------------------------------

func TestImportPreviewThenCommit(t *testing.T) {
	env := newTestEnv(t)

	// One lead already in the system, registered by sales1.
	if r := env.createLead(env.sales1, newLead("บริษัท ออกบูธเจ้าแรก จำกัด")); r.Status != http.StatusCreated {
		t.Fatalf("got %d: %s", r.Status, r.Raw)
	}

	// One row of each outcome: already in the system, genuinely new, repeated
	// inside the file, nameless, and similar to an existing lead.
	csvBody := "name,industry,source,source_detail,website,contact\n" +
		"บริษัท ออกบูธเจ้าแรก จำกัด,other,trade_fair,งาน A,,คุณสมชาย\n" +
		"บริษัท คลินิกผิวดีเวชกรรม จำกัด,healthcare,trade_fair,งาน A,https://example.com,คุณสมหญิง\n" +
		"บริษัท คลินิกผิวดีเวชกรรม จำกัด,healthcare,trade_fair,งาน A,,\n" +
		",other,trade_fair,งาน A,,\n" +
		"บริษัท ออกบูธเจ้าใหม่ จำกัด,other,trade_fair,งาน A,,\n"

	fields := map[string]string{
		"mode": "preview", "source": "trade_fair", "source_detail": "งานแสดงสินค้า A",
		"owner_type": models.OwnerTypeCompany,
	}

	t.Run("a sales account cannot import", func(t *testing.T) {
		r := env.doMultipart(env.sales1, "/api/leads/import", fields, csvBody)
		if r.Status != http.StatusForbidden {
			t.Fatalf("got %d, want 403: %s", r.Status, r.Raw)
		}
	})

	t.Run("preview reports duplicates without creating anything", func(t *testing.T) {
		r := env.doMultipart(env.admin, "/api/leads/import", fields, csvBody)
		if r.Status != http.StatusOK {
			t.Fatalf("got %d: %s", r.Status, r.Raw)
		}

		var summary map[string]int
		r.as(t, "summary", &summary)
		if summary["duplicate"] != 1 {
			t.Errorf("duplicate = %d, want 1", summary["duplicate"])
		}
		if summary["duplicate_in_file"] != 1 {
			t.Errorf("duplicate_in_file = %d, want 1", summary["duplicate_in_file"])
		}
		if summary["invalid"] != 1 {
			t.Errorf("invalid = %d, want 1 (the nameless row)", summary["invalid"])
		}
		if summary["new"] != 1 {
			t.Errorf("new = %d, want 1", summary["new"])
		}
		if summary["similar"] != 1 {
			t.Errorf("similar = %d, want 1 (ออกบูธเจ้าใหม่ reads like ออกบูธเจ้าแรก)", summary["similar"])
		}

		var rows []importRow
		r.as(t, "rows", &rows)
		for _, row := range rows {
			if row.Status == "duplicate" && row.Duplicate["owner_name"] != env.sales1.Name {
				t.Errorf("the duplicate row should name its owner, got %v", row.Duplicate["owner_name"])
			}
		}

		// Nothing was created.
		list := env.do(env.admin, http.MethodGet, "/api/leads", nil)
		var pagination struct{ Total int64 }
		list.as(t, "pagination", &pagination)
		if pagination.Total != 1 {
			t.Errorf("preview must not create anything, total = %d", pagination.Total)
		}
	})

	t.Run("commit creates only the safe rows", func(t *testing.T) {
		commitFields := map[string]string{}
		for k, v := range fields {
			commitFields[k] = v
		}
		commitFields["mode"] = "commit"
		commitFields["owner_user_id"] = fmt.Sprint(env.sales2.ID)

		r := env.doMultipart(env.admin, "/api/leads/import", commitFields, csvBody)
		if r.Status != http.StatusOK {
			t.Fatalf("got %d: %s", r.Status, r.Raw)
		}
		var summary map[string]int
		r.as(t, "summary", &summary)
		// Only the clean row: the duplicate, the in-file repeat, the nameless
		// row and the similar one are all left alone.
		if summary["created"] != 1 {
			t.Fatalf("created = %d, want 1: %s", summary["created"], r.Raw)
		}
		if summary["similar"] != 1 {
			t.Errorf("similar = %d — a similar row must not be created without confirm_similar", summary["similar"])
		}

		list := env.do(env.admin, http.MethodGet, "/api/leads", nil)
		var pagination struct{ Total int64 }
		list.as(t, "pagination", &pagination)
		if pagination.Total != 2 {
			t.Errorf("total = %d, want 2", pagination.Total)
		}

		// The imported lead is assigned to the sales person the admin named.
		var leads []struct {
			Name        string `json:"name"`
			OwnerUserID *uint  `json:"owner_user_id"`
		}
		list.as(t, "data", &leads)
		found := false
		for _, lead := range leads {
			if strings.Contains(lead.Name, "คลินิกผิวดี") {
				found = true
				if lead.OwnerUserID == nil || *lead.OwnerUserID != env.sales2.ID {
					t.Errorf("owner_user_id = %v, want %d", lead.OwnerUserID, env.sales2.ID)
				}
			}
			if strings.Contains(lead.Name, "เจ้าใหม่") {
				t.Error("the similar row must not have been created")
			}
		}
		if !found {
			t.Error("the imported lead is missing from the list")
		}
	})

	t.Run("confirm_similar lets the similar row through", func(t *testing.T) {
		commitFields := map[string]string{}
		for k, v := range fields {
			commitFields[k] = v
		}
		commitFields["mode"] = "commit"
		commitFields["confirm_similar"] = "1"

		r := env.doMultipart(env.admin, "/api/leads/import", commitFields, csvBody)
		if r.Status != http.StatusOK {
			t.Fatalf("got %d: %s", r.Status, r.Raw)
		}
		var summary map[string]int
		r.as(t, "summary", &summary)
		if summary["created"] != 1 {
			t.Fatalf("created = %d, want 1 (only ออกบูธเจ้าใหม่ is left): %s", summary["created"], r.Raw)
		}
	})
}

// --- auth -------------------------------------------------------------------

func TestLoginAndDeactivation(t *testing.T) {
	env := newTestEnv(t)

	t.Run("login returns a token", func(t *testing.T) {
		r := env.do(nil, http.MethodPost, "/auth/login", map[string]string{
			"username": "sales1", "password": "test-password-1234",
		})
		if r.Status != http.StatusOK {
			t.Fatalf("got %d: %s", r.Status, r.Raw)
		}
		if token, _ := r.Body["token"].(string); token == "" {
			t.Error("no token in the response")
		}
	})

	t.Run("a wrong password is refused without saying which part was wrong", func(t *testing.T) {
		r := env.do(nil, http.MethodPost, "/auth/login", map[string]string{
			"username": "sales1", "password": "wrong-password-1234",
		})
		if r.Status != http.StatusUnauthorized {
			t.Fatalf("got %d: %s", r.Status, r.Raw)
		}
		wrongUser := env.do(nil, http.MethodPost, "/auth/login", map[string]string{
			"username": "nobody", "password": "wrong-password-1234",
		})
		if wrongUser.Body["error"] != r.Body["error"] {
			t.Error("a missing account and a wrong password must give the same message")
		}
	})

	t.Run("a deactivated account loses access on its next request", func(t *testing.T) {
		if r := env.do(env.admin, http.MethodPatch, fmt.Sprintf("/api/admin/users/%d", env.sales2.ID),
			map[string]string{"status": models.StatusDeactivated}); r.Status != http.StatusOK {
			t.Fatalf("got %d: %s", r.Status, r.Raw)
		}
		// The token is still cryptographically valid; the live check rejects it.
		r := env.do(env.sales2, http.MethodGet, "/api/me", nil)
		if r.Status != http.StatusUnauthorized {
			t.Fatalf("got %d, want 401: %s", r.Status, r.Raw)
		}
	})

	t.Run("a sales account cannot reach the admin endpoints", func(t *testing.T) {
		r := env.do(env.sales1, http.MethodGet, "/api/admin/users", nil)
		if r.Status != http.StatusForbidden {
			t.Fatalf("got %d, want 403: %s", r.Status, r.Raw)
		}
	})

	t.Run("no token at all is 401", func(t *testing.T) {
		r := env.do(nil, http.MethodGet, "/api/leads", nil)
		if r.Status != http.StatusUnauthorized {
			t.Fatalf("got %d, want 401: %s", r.Status, r.Raw)
		}
	})
}

// urlEncode percent-encodes a query value (Thai names need it).
func urlEncode(value string) string {
	const hex = "0123456789ABCDEF"
	var b strings.Builder
	for _, c := range []byte(value) {
		unreserved := (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') ||
			(c >= '0' && c <= '9') || c == '-' || c == '.' || c == '_' || c == '~'
		if unreserved {
			b.WriteByte(c)
			continue
		}
		b.WriteByte('%')
		b.WriteByte(hex[c>>4])
		b.WriteByte(hex[c&0x0f])
	}
	return b.String()
}
