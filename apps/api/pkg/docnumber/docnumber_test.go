package docnumber

import (
	"errors"
	"fmt"
	"os"
	"sort"
	"sync"
	"testing"
	"time"

	"github.com/shopspring/decimal"
	"github.com/sirupsen/logrus"
	"gorm.io/gorm"

	"github.com/owldayhouse/odh-internal-api/pkg/core"
	"github.com/owldayhouse/odh-internal-api/pkg/database"
	"github.com/owldayhouse/odh-internal-api/pkg/logger"
	"github.com/owldayhouse/odh-internal-api/pkg/models"
	"github.com/owldayhouse/odh-internal-api/pkg/testdb"
)

func bkk(y int, m time.Month, d, h, min int) time.Time {
	return time.Date(y, m, d, h, min, 0, 0, Bangkok)
}

func TestPeriod(t *testing.T) {
	cases := []struct {
		reset string
		date  time.Time
		want  string
	}{
		{models.ResetMonthly, bkk(2026, 11, 16, 10, 0), "202611"},
		{models.ResetYearly, bkk(2026, 11, 16, 10, 0), "2026"},
		// 00:30 on 1 December in Bangkok is still 30 November in UTC. The
		// document is a December one.
		{models.ResetMonthly, time.Date(2026, 11, 30, 17, 30, 0, 0, time.UTC), "202612"},
		{models.ResetYearly, time.Date(2026, 12, 31, 17, 30, 0, 0, time.UTC), "2027"},
	}
	for _, c := range cases {
		if got := Period(c.reset, c.date); got != c.want {
			t.Errorf("Period(%s, %s) = %s, want %s", c.reset, c.date, got, c.want)
		}
	}
}

func TestFormat(t *testing.T) {
	rule := models.DocumentNumbering{Prefix: "QO", Digits: 5}
	if got, _ := Format(rule, "202611", 1); got != "QO-20261100001" {
		t.Errorf("got %s", got)
	}
	if got, _ := Format(rule, "202611", 99999); got != "QO-20261199999" {
		t.Errorf("got %s", got)
	}
	if _, err := Format(rule, "202611", 100000); !errors.Is(err, ErrSequenceFull) {
		t.Errorf("want ErrSequenceFull past the digits, got %v", err)
	}
	if _, err := Format(rule, "202611", 0); err == nil {
		t.Error("a sequence of 0 must be refused")
	}
	if got, _ := Format(models.DocumentNumbering{Prefix: "IV", Digits: 3}, "2026", 7); got != "IV-2026007" {
		t.Errorf("got %s", got)
	}
}

// --- against PostgreSQL --------------------------------------------------------

// openDB connects to the same test database as the handler integration tests
// (see apps/api/README.md) and skips when there is none, unless CI requires it.
func openDB(t *testing.T) *gorm.DB {
	t.Helper()
	env := func(key, fallback string) string {
		if v := os.Getenv(key); v != "" {
			return v
		}
		return fallback
	}
	config := core.Config{
		Environment: "test",
		Postgres: core.PostgresConfig{
			Host:         env("ODH_TEST_PG_HOST", "127.0.0.1"),
			Port:         env("ODH_TEST_PG_PORT", "55432"),
			Username:     env("ODH_TEST_PG_USERNAME", "postgres"),
			Password:     os.Getenv("ODH_TEST_PG_PASSWORD"),
			Database:     env("ODH_TEST_PG_DATABASE", "odh_internal_test"),
			SSLMode:      env("ODH_TEST_PG_SSLMODE", "disable"),
			TimeZone:     "Asia/Bangkok",
			MaxOpenConns: 10,
			MaxIdleConns: 5,
		},
	}
	log := logger.New("test")
	log.SetLevel(logrus.ErrorLevel)

	skip := t.Skipf
	if os.Getenv("ODH_TEST_REQUIRE_DB") == "1" {
		skip = t.Fatalf
	}
	db, err := database.New(config, log)
	if err != nil {
		skip("no PostgreSQL for the document-number tests (%v)", err)
		return nil
	}
	if pool, err := db.DB(); err != nil || pool.Ping() != nil {
		skip("no PostgreSQL for the document-number tests")
		return nil
	}
	if err := database.Migrate(db); err != nil {
		t.Fatalf("migrations failed: %v", err)
	}
	testdb.Lock(t, db)
	if err := db.Exec(`TRUNCATE document_events, document_items, documents, document_counters, billing_contacts RESTART IDENTITY CASCADE`).Error; err != nil {
		t.Fatalf("cannot clear the document tables: %v", err)
	}
	// Events name a user, so there has to be one.
	user := models.User{Username: "docnumber-test", Name: "เทสต์เลขเอกสาร", Password: "x", Role: models.RoleAdmin, Status: models.StatusActive}
	if err := db.Where("username = ?", user.Username).FirstOrCreate(&user).Error; err != nil {
		t.Fatal(err)
	}
	testUserID = user.ID
	// Tests may change a rule; put the defaults back.
	if err := db.Exec(`UPDATE document_numberings SET reset = 'monthly', digits = 5`).Error; err != nil {
		t.Fatal(err)
	}
	return db
}

// testUserID is the user the tests act as; openDB sets it.
var testUserID uint

func seedContact(t *testing.T, db *gorm.DB) uint {
	t.Helper()
	c := models.BillingContact{Code: "C-0001", Name: "บริษัท ทดสอบ จำกัด", ContactType: models.ContactCompany, CreatedBy: 1}
	if err := db.Create(&c).Error; err != nil {
		t.Fatal(err)
	}
	return c.ID
}

// issue does what the document service will do: reserve a number and save
// the document in one transaction. rollback simulates the save failing after
// the number was taken.
func issue(db *gorm.DB, contactID uint, docType int, date time.Time, rollback bool) (string, error) {
	var code string
	errRollback := errors.New("simulated failure after reserving")
	err := db.Transaction(func(tx *gorm.DB) error {
		var err error
		code, err = Reserve(tx, docType, date)
		if err != nil {
			return err
		}
		doc := models.Document{
			DocType: docType, Code: code, Status: models.DocStatusIssued,
			ContactID: contactID, IssuedDate: date, CreatedBy: 1,
			NetAmount: decimal.RequireFromString("1070.00"),
		}
		if err := tx.Create(&doc).Error; err != nil {
			return err
		}
		if rollback {
			return errRollback
		}
		return nil
	})
	if errors.Is(err, errRollback) {
		return "", nil
	}
	return code, err
}

// TestReserveUnderConcurrency is the test the design calls for: many issuers
// at once, some of whose saves fail. Every committed document must get a
// distinct number, and together they must be 1..n with no gap — the failed
// ones gave their numbers back by rolling back.
func TestReserveUnderConcurrency(t *testing.T) {
	db := openDB(t)
	contactID := seedContact(t, db)
	date := bkk(2026, 11, 16, 9, 0)

	const issuers = 60
	var (
		wg    sync.WaitGroup
		mu    sync.Mutex
		codes []string
		errs  []error
	)
	start := make(chan struct{})
	for i := 0; i < issuers; i++ {
		wg.Add(1)
		go func(i int) {
			defer wg.Done()
			<-start
			code, err := issue(db, contactID, models.DocInvoice, date, i%4 == 0)
			mu.Lock()
			defer mu.Unlock()
			if err != nil {
				errs = append(errs, err)
			} else if code != "" {
				codes = append(codes, code)
			}
		}(i)
	}
	close(start)
	wg.Wait()

	if len(errs) > 0 {
		t.Fatalf("%d issuers failed, first: %v", len(errs), errs[0])
	}
	want := issuers - issuers/4
	if len(codes) != want {
		t.Fatalf("want %d committed documents, got %d", want, len(codes))
	}
	sort.Strings(codes)
	for i, code := range codes {
		expected := fmt.Sprintf("IV-202611%05d", i+1)
		if code != expected {
			t.Fatalf("number %d is %s, want %s — a gap or a repeat (all: %v)", i+1, code, expected, codes)
		}
	}

	var stored int64
	db.Model(&models.Document{}).Where("doc_type = ?", models.DocInvoice).Count(&stored)
	if stored != int64(want) {
		t.Fatalf("want %d documents stored, got %d", want, stored)
	}
}

func TestReservePerTypeAndPeriod(t *testing.T) {
	db := openDB(t)
	contactID := seedContact(t, db)

	must := func(code string, err error) string {
		t.Helper()
		if err != nil {
			t.Fatal(err)
		}
		return code
	}
	nov := bkk(2026, 11, 30, 23, 0)
	dec := bkk(2026, 12, 1, 0, 30)

	if got := must(issue(db, contactID, models.DocQuotation, nov, false)); got != "QO-20261100001" {
		t.Errorf("first quotation: %s", got)
	}
	// Another type has its own series.
	if got := must(issue(db, contactID, models.DocInvoice, nov, false)); got != "IV-20261100001" {
		t.Errorf("first invoice: %s", got)
	}
	// A new month starts again at 1.
	if got := must(issue(db, contactID, models.DocQuotation, dec, false)); got != "QO-20261200001" {
		t.Errorf("first December quotation: %s", got)
	}
	if got := must(issue(db, contactID, models.DocQuotation, nov, false)); got != "QO-20261100002" {
		t.Errorf("a late November quotation continues November: %s", got)
	}

	// A yearly series does not restart in December.
	if err := db.Model(&models.DocumentNumbering{}).Where("doc_type = ?", models.DocReceipt).
		Update("reset", models.ResetYearly).Error; err != nil {
		t.Fatal(err)
	}
	must(issue(db, contactID, models.DocReceipt, nov, false))
	if got := must(issue(db, contactID, models.DocReceipt, dec, false)); got != "RT-202600002" {
		t.Errorf("yearly receipt series: %s", got)
	}
}

func TestSetNextStartsFromTheCompanysLastNumber(t *testing.T) {
	db := openDB(t)
	contactID := seedContact(t, db)
	date := bkk(2026, 11, 16, 9, 0)

	// The company's last quotation this month was QO-20261100041.
	if err := SetNext(db, models.DocQuotation, "202611", 42, testUserID); err != nil {
		t.Fatal(err)
	}
	code, err := issue(db, contactID, models.DocQuotation, date, false)
	if err != nil || code != "QO-20261100042" {
		t.Fatalf("want QO-20261100042, got %s (%v)", code, err)
	}

	// Never backwards: 42 is taken.
	if err := SetNext(db, models.DocQuotation, "202611", 40, testUserID); err == nil {
		t.Fatal("moving a counter backwards must be refused")
	}
	// Forwards is fine, and logged.
	if err := SetNext(db, models.DocQuotation, "202611", 100, testUserID); err != nil {
		t.Fatal(err)
	}
	var logged int64
	db.Model(&models.DocumentEvent{}).Where("action = ?", models.DocEventNumberSet).Count(&logged)
	if logged != 2 {
		t.Fatalf("want 2 logged counter moves, got %d", logged)
	}
	if err := SetNext(db, 999, "202611", 1, testUserID); !errors.Is(err, ErrNoNumbering) {
		t.Fatalf("unknown type: want ErrNoNumbering, got %v", err)
	}
}

func TestSequenceFullStopsTheIssue(t *testing.T) {
	db := openDB(t)
	contactID := seedContact(t, db)
	date := bkk(2026, 11, 16, 9, 0)

	if err := db.Model(&models.DocumentNumbering{}).Where("doc_type = ?", models.DocBillingNote).
		Update("digits", 2).Error; err != nil {
		t.Fatal(err)
	}
	if err := SetNext(db, models.DocBillingNote, "202611", 99, testUserID); err != nil {
		t.Fatal(err)
	}
	if code, err := issue(db, contactID, models.DocBillingNote, date, false); err != nil || code != "BN-20261199" {
		t.Fatalf("want BN-20261199, got %s (%v)", code, err)
	}
	if _, err := issue(db, contactID, models.DocBillingNote, date, false); !errors.Is(err, ErrSequenceFull) {
		t.Fatalf("want ErrSequenceFull, got %v", err)
	}
	// The refused issue rolled back, so the counter did not move past 100.
	var counter models.DocumentCounter
	db.First(&counter, "doc_type = ? AND period = ?", models.DocBillingNote, "202611")
	if counter.NextValue != 100 {
		t.Fatalf("counter should still be at 100, got %d", counter.NextValue)
	}
}

// TestTheDatabaseGuardsNumbers checks the constraints behind the rules, so a
// bug in a handler cannot get past them.
func TestTheDatabaseGuardsNumbers(t *testing.T) {
	db := openDB(t)
	contactID := seedContact(t, db)
	date := bkk(2026, 11, 16, 9, 0)

	base := func() models.Document {
		return models.Document{DocType: models.DocInvoice, ContactID: contactID, IssuedDate: date, CreatedBy: 1}
	}

	draft := base()
	draft.Status = models.DocStatusDraft
	if err := db.Create(&draft).Error; err != nil {
		t.Fatalf("a draft without a number is fine: %v", err)
	}
	another := base()
	another.Status = models.DocStatusDraft
	if err := db.Create(&another).Error; err != nil {
		t.Fatalf("many drafts may have no number: %v", err)
	}

	numberedDraft := base()
	numberedDraft.Status = models.DocStatusDraft
	numberedDraft.Code = "IV-20261100001"
	if err := db.Create(&numberedDraft).Error; err == nil {
		t.Error("a draft must not carry a number")
	}

	unnumbered := base()
	unnumbered.Status = models.DocStatusIssued
	if err := db.Create(&unnumbered).Error; err == nil {
		t.Error("an issued document must carry a number")
	}

	first := base()
	first.Status = models.DocStatusIssued
	first.Code = "IV-20261100007"
	if err := db.Create(&first).Error; err != nil {
		t.Fatal(err)
	}
	dup := base()
	dup.Status = models.DocStatusVoided
	dup.Code = "IV-20261100007"
	if err := db.Create(&dup).Error; err == nil {
		t.Error("the same number twice in one type must be refused, voided or not")
	}
	otherType := base()
	otherType.DocType = models.DocQuotation
	otherType.Status = models.DocStatusIssued
	otherType.Code = "IV-20261100007"
	if err := db.Create(&otherType).Error; err != nil {
		t.Errorf("uniqueness is per type: %v", err)
	}
}
