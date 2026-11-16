package api

import (
	"fmt"
	"net/http"
	"testing"
	"time"

	"github.com/owldayhouse/odh-internal-api/pkg/leadrules"
	"github.com/owldayhouse/odh-internal-api/pkg/models"
)

type taxFormResult struct {
	Form     string            `json:"form"`
	Required bool              `json:"required"`
	Closed   bool              `json:"closed"`
	Differs  bool              `json:"differs"`
	Figures  models.TaxFigures `json:"figures"`
	Filing   *models.TaxFiling `json:"filing"`
	Lines    []models.TaxLine  `json:"lines"`
	Events   []struct {
		Action string `json:"action"`
	} `json:"events"`
}

func (e *testEnv) taxMonth(month string) map[string]taxFormResult {
	e.t.Helper()
	r := e.do(e.admin, http.MethodGet, "/api/docs/tax?month="+month, nil)
	if r.Status != http.StatusOK {
		e.t.Fatalf("tax month %s: %d %s", month, r.Status, r.Raw)
	}
	var forms []taxFormResult
	r.as(e.t, "forms", &forms)
	out := map[string]taxFormResult{}
	for _, f := range forms {
		out[f.Form] = f
	}
	return out
}

// octoberInvoice is an invoice of 20,000 + VAT 1,400 dated in October.
func (e *testEnv) octoberInvoice(code string) uint {
	e.t.Helper()
	contact := e.seedBillingContact(code, "บริษัท ภาษี "+code+" จำกัด", nil, models.FinanceCustomer, true)
	body := quotationBody(contact)
	body["doc_type"] = models.DocInvoice
	body["issued_date"] = "2026-10-01"
	id := docID(e.t, e.do(e.admin, http.MethodPost, "/api/docs", body))
	if r := e.do(e.admin, http.MethodPost, fmt.Sprintf("/api/docs/%d/issue", id), nil); r.Status != http.StatusOK {
		e.t.Fatalf("issue invoice: %d %s", r.Status, r.Raw)
	}
	return id
}

func TestMonthlyTax(t *testing.T) {
	env := newTestEnv(t)
	if r := env.do(env.admin, http.MethodPut, "/api/docs/tax/settings",
		map[string]interface{}{"first_period": "2026-10", "opening_vat_credit": "100"}); r.Status != http.StatusOK {
		t.Fatalf("settings: %d %s", r.Status, r.Raw)
	}

	// Sales: 21,400 received in October (600 withheld by the customer) →
	// a tax invoice with 1,400 VAT.
	inv := env.octoberInvoice("C-T1")
	pid := docID(t, env.pay(env.admin, inv, "20800", "600", map[string]interface{}{"payment_date": "2026-10-20"}))
	// Expenses: one with the vendor's tax invoice (560 VAT, 400 withheld by
	// us, ภ.ง.ด.3), one without (its VAT counts nowhere).
	vendor := env.personVendor("V-T1")
	october := map[string]interface{}{"issued_date": "2026-10-10", "received_tax_invoice_date": "2026-10-08"}
	exp := env.issuedExpense(vendor, "INV-T1", october)
	env.pay(env.admin, exp, "8160", "400", map[string]interface{}{"payment_date": "2026-10-20"})
	env.issuedExpense(vendor, "", october)

	oct := env.taxMonth("2026-10")
	vat := oct[models.TaxFormPP30]
	amount(t, vat.Figures.OutputVat, "1400", "output VAT")
	amount(t, vat.Figures.InputVat, "560", "input VAT")
	amount(t, vat.Figures.CreditBroughtForward, "100", "opening credit")
	amount(t, vat.Figures.TaxAmount, "740", "VAT payable")
	if !vat.Required || !vat.Closed || len(vat.Lines) != 2 {
		t.Fatalf("pp30: %+v", vat)
	}
	pnd3 := oct[models.TaxFormPND3]
	amount(t, pnd3.Figures.TaxAmount, "400", "pnd3")
	if pnd3.Figures.LineCount != 1 || !pnd3.Required || len(pnd3.Lines) != 1 {
		t.Fatalf("pnd3: %+v", pnd3)
	}
	amount(t, pnd3.Lines[0].Base, "8000", "pnd3 base before VAT")
	if oct[models.TaxFormPND53].Required {
		t.Fatalf("pnd53 with nothing withheld is not required")
	}

	// Filing needs the Revenue Department's receipt attached.
	open := env.do(env.admin, http.MethodPost, "/api/docs/tax/filings", map[string]string{"form": models.TaxFormPP30, "month": "2026-10"})
	if open.Status != http.StatusOK {
		t.Fatalf("open filing: %d %s", open.Status, open.Raw)
	}
	fid := docID(t, open)
	fileBody := map[string]interface{}{"paid_amount": "740", "paid_date": "2026-11-10", "reference": "RD-123"}
	if r := env.do(env.admin, http.MethodPost, fmt.Sprintf("/api/docs/tax/filings/%d/file", fid), fileBody); r.Status != http.StatusUnprocessableEntity {
		t.Fatalf("filing without a receipt: want 422, got %d %s", r.Status, r.Raw)
	}
	upload := map[string]interface{}{"owner_type": models.FileOwnerTaxFiling, "owner_id": fid, "filename": "pp30.pdf", "size": 1000}
	if r := env.do(env.sales1, http.MethodPost, "/api/files/upload-url", upload); r.Status != http.StatusForbidden {
		t.Fatalf("sales attaching a tax receipt: want 403, got %d", r.Status)
	}
	env.db.Create(&models.File{OwnerType: models.FileOwnerTaxFiling, OwnerID: fid, Key: "tax_filing/pp30.pdf", Filename: "pp30.pdf",
		Mime: "application/pdf", Status: models.FileStatusReady, UploadedBy: env.admin.ID})
	if r := env.do(env.admin, http.MethodPost, fmt.Sprintf("/api/docs/tax/filings/%d/file", fid), fileBody); r.Status != http.StatusOK ||
		str(r, "status") != models.TaxFilingFiled {
		t.Fatalf("filing: %d %s", r.Status, r.Raw)
	}
	if r := env.do(env.admin, http.MethodPost, fmt.Sprintf("/api/docs/tax/filings/%d/file", fid), fileBody); r.Status != http.StatusConflict {
		t.Fatalf("filing twice: want 409, got %d", r.Status)
	}

	// Voiding the payment voids its tax invoice in a filed month: refused
	// until the person confirms, then logged on the invoice.
	void := map[string]string{"reason": "บันทึกผิด"}
	r := env.do(env.admin, http.MethodPost, fmt.Sprintf("/api/docs/payments/%d/void", pid), void)
	if r.Status != http.StatusConflict || str(r, "code") != "period_filed" {
		t.Fatalf("changing a filed month: want 409 period_filed, got %d %s", r.Status, r.Raw)
	}
	if r := env.do(env.admin, http.MethodPost, fmt.Sprintf("/api/docs/payments/%d/void?confirm_filed=1", pid), void); r.Status != http.StatusOK {
		t.Fatalf("confirmed change: %d %s", r.Status, r.Raw)
	}
	var logged int64
	env.db.Model(&models.DocumentEvent{}).Where("document_id = ? AND action = ?", inv, models.DocEventFiledPeriod).Count(&logged)
	if logged != 1 {
		t.Fatalf("the change to a filed month is logged on the invoice")
	}

	// The filed figures stand; the screen says they no longer match.
	oct = env.taxMonth("2026-10")
	vat = oct[models.TaxFormPP30]
	if !vat.Differs || vat.Filing == nil {
		t.Fatalf("filed month now differs: %+v", vat)
	}
	amount(t, vat.Filing.TaxAmount, "740", "filed amount stays")
	amount(t, vat.Figures.CreditCarried, "660", "recomputed credit")
	if len(vat.Events) != 1 || vat.Events[0].Action != models.DocEventTaxFiled {
		t.Fatalf("filing history: %+v", vat.Events)
	}

	// November starts from what October carried as filed (nothing), not
	// from the recomputed 660 — until October is reopened.
	amount(t, env.taxMonth("2026-11")[models.TaxFormPP30].Figures.CreditBroughtForward, "0", "carried as filed")
	if r := env.do(env.admin, http.MethodPost, fmt.Sprintf("/api/docs/tax/filings/%d/reopen", fid), map[string]string{}); r.Status != http.StatusBadRequest {
		t.Fatalf("reopen without a reason: want 400, got %d", r.Status)
	}
	if r := env.do(env.admin, http.MethodPost, fmt.Sprintf("/api/docs/tax/filings/%d/reopen", fid), map[string]string{"reason": "ยื่นเพิ่มเติม"}); r.Status != http.StatusOK ||
		str(r, "status") != models.TaxFilingOpen {
		t.Fatalf("reopen: %d %s", r.Status, r.Raw)
	}
	amount(t, env.taxMonth("2026-11")[models.TaxFormPP30].Figures.CreditBroughtForward, "660", "carried once reopened")

	// A month still running cannot be filed; sales see none of this.
	now := time.Now().In(leadrules.Bangkok)
	if r := env.do(env.admin, http.MethodPost, "/api/docs/tax/filings",
		map[string]string{"form": models.TaxFormPP30, "month": now.Format("2006-01")}); r.Status != http.StatusUnprocessableEntity {
		t.Fatalf("filing the current month: want 422, got %d", r.Status)
	}
	if r := env.do(env.sales1, http.MethodGet, "/api/docs/tax?month=2026-10", nil); r.Status != http.StatusForbidden {
		t.Fatalf("sales: want 403, got %d", r.Status)
	}
}

func TestTaxDeadlines(t *testing.T) {
	env := newTestEnv(t)
	now := time.Now().In(leadrules.Bangkok)
	twoAgo := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, leadrules.Bangkok).AddDate(0, -2, 0)
	env.do(env.admin, http.MethodPut, "/api/docs/tax/settings", map[string]interface{}{"first_period": twoAgo.Format("2006-01"), "efiling_extra_days": 8})

	// ภ.พ.30 is due every month, even an empty one: two months ago is overdue.
	var due []struct {
		Form     string `json:"form"`
		Period   string `json:"period"`
		DaysLeft int    `json:"days_left"`
	}
	env.do(env.admin, http.MethodGet, "/api/docs/tax/due", nil).as(t, "items", &due)
	found := false
	for _, d := range due {
		if d.Form == models.TaxFormPP30 && d.Period == twoAgo.Format("2006-01") && d.DaysLeft < 0 {
			found = true
		}
		if d.Form != models.TaxFormPP30 {
			t.Fatalf("nothing withheld, so no ภ.ง.ด. is due: %+v", due)
		}
	}
	if !found {
		t.Fatalf("overdue pp30 for %s missing: %+v", twoAgo.Format("2006-01"), due)
	}

	// The calendar shows the online deadline (the 23rd) to admins only.
	month := twoAgo.AddDate(0, 1, 0)
	from, to := month.Format("2006-01-02"), month.AddDate(0, 1, -1).Format("2006-01-02")
	var events []CalendarEvent
	env.do(env.admin, http.MethodGet, "/api/calendar?from="+from+"&to="+to, nil).as(t, "data", &events)
	want := month.Format("2006-01") + "-23"
	ok := false
	for _, e := range events {
		if e.Kind == CalendarTaxDeadline && e.Date == want && e.Link == "/docs/tax/?month="+twoAgo.Format("2006-01") {
			ok = true
		}
	}
	if !ok {
		t.Fatalf("tax deadline on %s missing: %+v", want, events)
	}
	env.do(env.sales1, http.MethodGet, "/api/calendar?from="+from+"&to="+to, nil).as(t, "data", &events)
	for _, e := range events {
		if e.Kind == CalendarTaxDeadline {
			t.Fatalf("sales see no tax deadlines")
		}
	}
}
