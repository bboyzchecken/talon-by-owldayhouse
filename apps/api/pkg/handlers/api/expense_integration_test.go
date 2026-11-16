package api

import (
	"fmt"
	"net/http"
	"testing"

	"github.com/owldayhouse/odh-internal-api/pkg/models"
)

// issuedExpense records a vendor bill of 8,000 + VAT 560 with 5% withheld
// (400), with or without the vendor's tax invoice, and returns its id.
func (e *testEnv) issuedExpense(vendor uint, taxInvoice string, extra map[string]interface{}) uint {
	e.t.Helper()
	body := map[string]interface{}{
		"doc_type": models.DocExpense, "contact_id": vendor, "issued_date": "2026-11-10",
		"items":                       []map[string]interface{}{{"description": "เช่าจอ LED 2 วัน", "quantity": "1", "price": "8000", "vat_type": models.VatSeven, "withholding_rate": "5"}},
		"received_tax_invoice_number": taxInvoice, "received_tax_invoice_date": "2026-11-08",
	}
	for k, v := range extra {
		body[k] = v
	}
	r := e.do(e.admin, http.MethodPost, "/api/docs", body)
	if r.Status != http.StatusCreated {
		e.t.Fatalf("expense: %d %s", r.Status, r.Raw)
	}
	id := docID(e.t, r)
	if r := e.do(e.admin, http.MethodPost, fmt.Sprintf("/api/docs/%d/issue", id), nil); r.Status != http.StatusOK {
		e.t.Fatalf("issue expense: %d %s", r.Status, r.Raw)
	}
	return id
}

func (e *testEnv) personVendor(code string) uint {
	e.t.Helper()
	v := models.BillingContact{Code: code, Name: "นายช่าง " + code, ContactType: models.ContactPerson, FinanceSide: models.FinanceVendor,
		WhtForm: models.WhtFormPND3, TaxNumber: "3100500000033", BranchCode: "00000", Address: "1 ถนนนิมมาน", CreatedBy: e.admin.ID}
	if err := e.db.Create(&v).Error; err != nil {
		e.t.Fatal(err)
	}
	return v.ID
}

func TestPayingAVendor(t *testing.T) {
	env := newTestEnv(t)
	vendor := env.personVendor("V-E1")
	exp := env.issuedExpense(vendor, "INV-889", nil)

	var doc models.Document
	env.db.First(&doc, exp)
	if doc.Code != "EXP-20261100001" {
		t.Fatalf("expense number: %s", doc.Code)
	}
	amount(t, doc.NetAmount, "8560", "expense net")
	amount(t, doc.WithholdingTotal, "400", "we withhold")

	r := env.pay(env.admin, exp, "8160", "400", nil)
	if r.Status != http.StatusCreated || str(r, "direction") != models.PaymentOut || str(r, "wht_form") != models.WhtFormPND3 ||
		str(r, "wht_cert_status") != models.WhtCertPending || r.Body["receipt_id"] != nil {
		t.Fatalf("paying a vendor: %d %s", r.Status, r.Raw)
	}
	var receipts int64
	env.db.Model(&models.Document{}).Where("doc_type = ?", models.DocReceipt).Count(&receipts)
	if receipts != 0 {
		t.Fatalf("paying a vendor issues no receipt of ours, found %d", receipts)
	}

	if r := env.do(env.admin, http.MethodPost, fmt.Sprintf("/api/docs/payments/%d/receipt", docID(t, r)), nil); r.Status != http.StatusConflict {
		t.Fatalf("a receipt for paying a vendor: want 409, got %d", r.Status)
	}
	var note string
	env.db.Model(&models.DocumentEvent{}).Where("document_id = ? AND action = ?", exp, models.DocEventPayment).Pluck("note", &note)
	if note != "จ่ายเงิน 8,560.00 บาท" {
		t.Fatalf("history says it was paid out: %q", note)
	}

	// The vendor's form changes later; tax already withheld stays where it was.
	env.db.Model(&models.BillingContact{}).Where("id = ?", vendor).Update("wht_form", models.WhtFormPND53)
	var p models.Payment
	env.db.First(&p, docID(t, r))
	if p.WhtForm != models.WhtFormPND3 {
		t.Fatalf("the payment keeps its form: %s", p.WhtForm)
	}

	// The certificate we owe the vendor: sent only with a copy attached.
	pid := docID(t, r)
	if r := env.do(env.admin, http.MethodPost, fmt.Sprintf("/api/docs/payments/%d/wht-cert", pid), nil); r.Status != http.StatusUnprocessableEntity {
		t.Fatalf("certificate sent without the copy: want 422, got %d", r.Status)
	}
	env.db.Create(&models.File{OwnerType: models.FileOwnerPaymentWht, OwnerID: pid, Key: "payment_wht/x.pdf", Filename: "50tawi.pdf", Mime: "application/pdf", Status: models.FileStatusReady, UploadedBy: env.admin.ID})
	if r := env.do(env.admin, http.MethodPost, fmt.Sprintf("/api/docs/payments/%d/wht-cert", pid), nil); r.Status != http.StatusOK {
		t.Fatalf("certificate sent: %d %s", r.Status, r.Raw)
	}

	out := env.do(env.admin, http.MethodGet, "/api/docs/payments?direction=out", nil)
	in := env.do(env.admin, http.MethodGet, "/api/docs/payments", nil)
	if out.Body["total"].(float64) != 1 || in.Body["total"].(float64) != 0 {
		t.Fatalf("directions kept apart: out %s, in %s", out.Raw, in.Raw)
	}
}

func TestExpenseList(t *testing.T) {
	env := newTestEnv(t)
	vendor := env.personVendor("V-E2")
	paid := env.issuedExpense(vendor, "INV-1", nil)
	env.pay(env.admin, paid, "8160", "400", nil)
	env.issuedExpense(vendor, "INV-2", nil)
	noInvoice := env.issuedExpense(vendor, "", nil)

	all := env.do(env.admin, http.MethodGet, "/api/docs/expenses?month=2026-11", nil)
	if all.Status != http.StatusOK {
		t.Fatalf("list: %d %s", all.Status, all.Raw)
	}
	var sums map[string]string
	all.as(t, "sums", &sums)
	if sums["vat"] != "1680" || sums["vat_claimable"] != "1120" || sums["vat_not_claimable"] != "560" || sums["outstanding"] != "17120" {
		t.Fatalf("sums: %v", sums)
	}

	var unpaid []struct {
		ID uint `json:"id"`
	}
	env.do(env.admin, http.MethodGet, "/api/docs/expenses?view=unpaid", nil).as(t, "items", &unpaid)
	if len(unpaid) != 2 {
		t.Fatalf("two unpaid: %+v", unpaid)
	}
	var missing []struct {
		ID        uint `json:"id"`
		Claimable bool `json:"claimable"`
	}
	env.do(env.admin, http.MethodGet, "/api/docs/expenses?view=no_tax_invoice", nil).as(t, "items", &missing)
	if len(missing) != 1 || missing[0].ID != noInvoice || missing[0].Claimable {
		t.Fatalf("one without a tax invoice: %+v", missing)
	}
	if r := env.do(env.sales1, http.MethodGet, "/api/docs/expenses", nil); r.Status != http.StatusForbidden {
		t.Fatalf("sales: want 403, got %d", r.Status)
	}
}

func TestExpenseLinkedToAJob(t *testing.T) {
	env := newTestEnv(t)
	lead := leadID(t, env.createLead(env.sales1, map[string]interface{}{"name": "งานอีเวนต์ลูกค้า ก", "industry": "education", "source": "referral"}))
	vendor := env.personVendor("V-E3")
	exp := env.issuedExpense(vendor, "INV-3", map[string]interface{}{"lead_id": lead})
	var doc models.Document
	env.db.First(&doc, exp)
	if doc.LeadID == nil || *doc.LeadID != lead {
		t.Fatalf("expense on the job: %+v", doc.LeadID)
	}
	body := map[string]interface{}{
		"doc_type": models.DocExpense, "contact_id": vendor, "lead_id": 999999,
		"items": []map[string]interface{}{{"description": "x", "quantity": "1", "price": "1", "vat_type": models.VatNone}},
	}
	if r := env.do(env.admin, http.MethodPost, "/api/docs", body); r.Status != http.StatusUnprocessableEntity {
		t.Fatalf("an unknown lead: want 422, got %d", r.Status)
	}
}

// A document with money recorded against it cannot be voided until the
// money is; then it can.
func TestVoidNeedsPaymentsVoidedFirst(t *testing.T) {
	env := newTestEnv(t)
	inv := env.issuedInvoice("C-E4")
	pid := docID(t, env.pay(env.admin, inv, "21400", "0", nil))
	if r := env.do(env.admin, http.MethodPost, fmt.Sprintf("/api/docs/%d/void", inv), map[string]string{"reason": "ผิด"}); r.Status != http.StatusConflict {
		t.Fatalf("void a paid invoice: want 409, got %d %s", r.Status, r.Raw)
	}
	env.do(env.admin, http.MethodPost, fmt.Sprintf("/api/docs/payments/%d/void", pid), map[string]string{"reason": "ผิด"})
	if r := env.do(env.admin, http.MethodPost, fmt.Sprintf("/api/docs/%d/void", inv), map[string]string{"reason": "ผิด"}); r.Status != http.StatusOK {
		t.Fatalf("void after the payment: %d %s", r.Status, r.Raw)
	}
}
