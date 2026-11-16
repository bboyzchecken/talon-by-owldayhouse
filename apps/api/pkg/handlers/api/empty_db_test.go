package api

import (
	"net/http"
	"testing"
)

// A new installation has no documents yet. Every money screen must still
// open: the first month with tax activity is then unknown (NULL), which once
// failed the tax, finance and accounting pages with a 500.
func TestMoneyScreensOnAnEmptyDatabase(t *testing.T) {
	env := newTestEnv(t)
	for _, path := range []string{
		"/api/docs/tax?month=2026-10", "/api/docs/tax/due", "/api/docs/finance?month=2026-11",
		"/api/docs/accounting", "/api/docs/expenses", "/api/calendar?from=2026-11-01&to=2026-11-30",
	} {
		if r := env.do(env.admin, http.MethodGet, path, nil); r.Status != http.StatusOK {
			t.Errorf("%s on an empty database: %d %s", path, r.Status, r.Raw)
		}
	}
}

// Every list in a JSON reply must be a list, never null: the screens map over
// them straight away, and a null blanks the whole page with a client-side
// exception. Go turns a nil slice into null, and a query that matched nothing
// leaves one behind, so the finance overview of an empty database is the case
// to hold.
func TestFinanceListsAreNeverNull(t *testing.T) {
	env := newTestEnv(t)
	r := env.do(env.admin, http.MethodGet, "/api/docs/finance?month=2026-11", nil)
	if r.Status != http.StatusOK {
		t.Fatalf("got %d: %s", r.Status, r.Raw)
	}
	for _, field := range []string{"series", "services", "customers", "jobs", "methods", "tax"} {
		if _, ok := r.Body[field].([]interface{}); !ok {
			t.Errorf("%q is %v, want a list: %s", field, r.Body[field], r.Raw)
		}
	}
	for _, side := range []string{"receivables", "payables"} {
		aging, ok := r.Body[side].(map[string]interface{})
		if !ok {
			t.Fatalf("%q is not an object: %s", side, r.Raw)
		}
		for _, field := range []string{"buckets", "items"} {
			if _, ok := aging[field].([]interface{}); !ok {
				t.Errorf("%s.%s is %v, want a list: %s", side, field, aging[field], r.Raw)
			}
		}
	}
	follow, ok := r.Body["follow_up"].(map[string]interface{})
	if !ok {
		t.Fatalf("follow_up is not an object: %s", r.Raw)
	}
	if _, ok := follow["tax_due"].([]interface{}); !ok {
		t.Errorf("follow_up.tax_due is %v, want a list: %s", follow["tax_due"], r.Raw)
	}
}
