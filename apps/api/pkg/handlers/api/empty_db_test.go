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
