package api

import (
	"fmt"
	"net/http"
	"testing"

	"github.com/owldayhouse/odh-internal-api/pkg/models"
)

type accountingResult struct {
	ToRequest []whtRequestView `json:"wht_to_request"`
	Waiting   []whtRequestView `json:"wht_waiting"`
	ToSend    []whtRequestView `json:"wht_to_send"`
	Months    []struct {
		Month string          `json:"month"`
		Forms []taxFormResult `json:"forms"`
	} `json:"tax_months"`
}

func (e *testEnv) accounting() accountingResult {
	e.t.Helper()
	r := e.do(e.admin, http.MethodGet, "/api/docs/accounting", nil)
	if r.Status != http.StatusOK {
		e.t.Fatalf("accounting: %d %s", r.Status, r.Raw)
	}
	var out accountingResult
	for key, target := range map[string]interface{}{
		"wht_to_request": &out.ToRequest, "wht_waiting": &out.Waiting, "wht_to_send": &out.ToSend, "tax_months": &out.Months,
	} {
		r.as(e.t, key, target)
	}
	return out
}

// The 50 ทวิ we owe a vendor: asked of the accounting firm, attached when it
// comes back, then passed on.
func TestWhtRequestedFromTheAccountingFirm(t *testing.T) {
	env := newTestEnv(t)
	vendor := env.personVendor("V-A1")
	exp := env.issuedExpense(vendor, "INV-A1", map[string]interface{}{"issued_date": "2026-10-10", "received_tax_invoice_date": "2026-10-08"})
	pid := docID(t, env.pay(env.admin, exp, "8160", "400", map[string]interface{}{"payment_date": "2026-10-20"}))

	acc := env.accounting()
	if len(acc.ToRequest) != 1 || len(acc.Waiting) != 0 {
		t.Fatalf("one to request: %+v", acc)
	}
	req := acc.ToRequest[0]
	if req.PayeeTaxNumber != "3100500000033" || req.Rate != "5" || req.WhtForm != models.WhtFormPND3 ||
		req.IncomeType != "เช่าจอ LED 2 วัน" || req.PayeeAddress == "" {
		t.Fatalf("what the firm needs: %+v", req)
	}
	amount(t, req.Base, "8000", "base before VAT")
	amount(t, req.Withheld, "400", "withheld")

	r := env.do(env.admin, http.MethodPost, "/api/docs/accounting/wht-requested", map[string]interface{}{"payment_ids": []uint{pid, 999}})
	if r.Status != http.StatusOK || r.Body["marked"].(float64) != 1 {
		t.Fatalf("mark requested: %d %s", r.Status, r.Raw)
	}
	var logged int64
	env.db.Model(&models.DocumentEvent{}).Where("document_id = ? AND action = ?", exp, models.DocEventWhtRequested).Count(&logged)
	if logged != 1 {
		t.Fatalf("the request is logged on the expense")
	}
	if acc := env.accounting(); len(acc.ToRequest) != 0 || len(acc.Waiting) != 1 || acc.Waiting[0].RequestedAt == nil {
		t.Fatalf("now waiting: %+v", acc)
	}

	env.db.Create(&models.File{OwnerType: models.FileOwnerPaymentWht, OwnerID: pid, Key: "payment_wht/a1.pdf", Filename: "50tawi.pdf",
		Mime: "application/pdf", Status: models.FileStatusReady, UploadedBy: env.admin.ID})
	if acc := env.accounting(); len(acc.Waiting) != 0 || len(acc.ToSend) != 1 {
		t.Fatalf("back from the firm, to pass on: %+v", acc)
	}
	env.do(env.admin, http.MethodPost, fmt.Sprintf("/api/docs/payments/%d/wht-cert", pid), nil)
	if acc := env.accounting(); len(acc.ToSend) != 0 {
		t.Fatalf("sent to the payee: %+v", acc)
	}
	if r := env.do(env.sales1, http.MethodGet, "/api/docs/accounting", nil); r.Status != http.StatusForbidden {
		t.Fatalf("sales: want 403, got %d", r.Status)
	}
}

// A tax month through the firm: sent, the QR amount back, paid.
func TestTaxMonthThroughTheAccountingFirm(t *testing.T) {
	env := newTestEnv(t)
	env.do(env.admin, http.MethodPut, "/api/docs/tax/settings", map[string]interface{}{"first_period": "2026-10"})
	inv := env.octoberInvoice("C-A2")
	env.pay(env.admin, inv, "21400", "0", map[string]interface{}{"payment_date": "2026-10-20"})

	acc := env.accounting()
	var october []taxFormResult
	for _, m := range acc.Months {
		if m.Month == "2026-10" {
			october = m.Forms
		}
	}
	if len(october) != 1 || october[0].Form != models.TaxFormPP30 {
		t.Fatalf("October needs only ภ.พ.30: %+v", acc.Months)
	}

	fid := docID(t, env.do(env.admin, http.MethodPost, "/api/docs/tax/filings", map[string]string{"form": models.TaxFormPP30, "month": "2026-10"}))
	if r := env.do(env.admin, http.MethodPost, fmt.Sprintf("/api/docs/tax/filings/%d/sent", fid), nil); r.Status != http.StatusOK || r.Body["sent_at"] == nil {
		t.Fatalf("sent: %d %s", r.Status, r.Raw)
	}
	if r := env.do(env.admin, http.MethodPost, fmt.Sprintf("/api/docs/tax/filings/%d/due", fid), map[string]string{"amount": "-1"}); r.Status != http.StatusUnprocessableEntity {
		t.Fatalf("negative QR amount: want 422, got %d", r.Status)
	}
	if r := env.do(env.admin, http.MethodPost, fmt.Sprintf("/api/docs/tax/filings/%d/due", fid), map[string]string{"amount": "1400"}); r.Status != http.StatusOK || str(r, "due_amount") != "1400" {
		t.Fatalf("QR amount: %d %s", r.Status, r.Raw)
	}
	env.db.Create(&models.File{OwnerType: models.FileOwnerTaxFiling, OwnerID: fid, Key: "tax_filing/a2.pdf", Filename: "slip.pdf",
		Mime: "application/pdf", Status: models.FileStatusReady, UploadedBy: env.admin.ID})
	if r := env.do(env.admin, http.MethodPost, fmt.Sprintf("/api/docs/tax/filings/%d/file", fid),
		map[string]string{"paid_amount": "1400", "paid_date": "2026-11-10"}); r.Status != http.StatusOK {
		t.Fatalf("paid: %d %s", r.Status, r.Raw)
	}
	if r := env.do(env.admin, http.MethodPost, fmt.Sprintf("/api/docs/tax/filings/%d/sent", fid), nil); r.Status != http.StatusConflict {
		t.Fatalf("a paid month takes no more steps: want 409, got %d", r.Status)
	}
	var actions []string
	env.db.Model(&models.DocumentEvent{}).Where("tax_filing_id = ?", fid).Order("id").Pluck("action", &actions)
	if fmt.Sprint(actions) != "[tax_sent tax_due tax_filed]" {
		t.Fatalf("history: %v", actions)
	}
}
