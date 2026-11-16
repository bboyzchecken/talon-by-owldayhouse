package api

import (
	"fmt"
	"net/http"
	"strings"
	"sync"
	"testing"

	"github.com/shopspring/decimal"

	"github.com/owldayhouse/odh-internal-api/pkg/models"
)

func (e *testEnv) seedPaymentMethod() uint {
	e.t.Helper()
	m := models.PaymentMethod{Code: "BANK-T", Name: "บัญชีทดสอบ", MethodType: models.PayMethodBank, BankName: "ทดสอบ", AccountNo: "000", Active: true}
	if err := e.db.Where("code = ?", m.Code).FirstOrCreate(&m).Error; err != nil {
		e.t.Fatal(err)
	}
	return m.ID
}

// issuedInvoice makes an issued invoice of 21,400 (20,000 + VAT 1,400) for a
// complete customer and returns its id.
func (e *testEnv) issuedInvoice(code string) uint {
	e.t.Helper()
	contact := e.seedBillingContact(code, "บริษัท จ่ายเงิน "+code+" จำกัด", nil, models.FinanceCustomer, true)
	body := quotationBody(contact)
	body["doc_type"] = models.DocInvoice
	id := docID(e.t, e.do(e.admin, http.MethodPost, "/api/docs", body))
	if r := e.do(e.admin, http.MethodPost, fmt.Sprintf("/api/docs/%d/issue", id), nil); r.Status != http.StatusOK {
		e.t.Fatalf("issue invoice: %d %s", r.Status, r.Raw)
	}
	return id
}

func (e *testEnv) pay(user *models.User, docID uint, received, withheld string, extra map[string]interface{}) response {
	body := map[string]interface{}{
		"payment_date": "2026-11-16", "payment_method_id": e.seedPaymentMethod(),
		"received_amount": received, "withholding_amount": withheld,
	}
	for k, v := range extra {
		body[k] = v
	}
	return e.do(user, http.MethodPost, fmt.Sprintf("/api/docs/%d/payments", docID), body)
}

func receiptOf(t *testing.T, env *testEnv, r response) models.Document {
	t.Helper()
	var p models.Payment
	if err := env.db.Preload("Receipt").First(&p, docID(t, r)).Error; err != nil || p.Receipt == nil {
		t.Fatalf("payment without receipt: %v %s", err, r.Raw)
	}
	return *p.Receipt
}

func amount(t *testing.T, got decimal.Decimal, want, what string) {
	t.Helper()
	if !got.Equal(decimal.RequireFromString(want)) {
		t.Errorf("%s = %s, want %s", what, got.StringFixed(2), want)
	}
}

func TestFullPaymentWithWithholding(t *testing.T) {
	env := newTestEnv(t)
	inv := env.issuedInvoice("C-P1")

	r := env.pay(env.admin, inv, "20800", "600", nil)
	if r.Status != http.StatusCreated || str(r, "wht_cert_status") != models.WhtCertPending || str(r, "settled_amount") != "21400" {
		t.Fatalf("payment: %d %s", r.Status, r.Raw)
	}
	rt := receiptOf(t, env, r)
	if rt.Code != "RT-20261100001" || rt.Status != models.DocStatusIssued || !rt.IsTaxInvoice || rt.BuyerName == "" {
		t.Fatalf("receipt: %+v", rt)
	}
	amount(t, rt.NetAmount, "21400", "receipt net")
	amount(t, rt.VatAmount, "1400", "receipt VAT")
	amount(t, rt.PreTaxAmount, "20000", "receipt pre-tax")
	amount(t, rt.WithholdingTotal, "600", "receipt withholding")
	if rt.SourceDocumentID == nil || *rt.SourceDocumentID != inv {
		t.Fatalf("receipt should point at the invoice: %+v", rt.SourceDocumentID)
	}

	detail := env.do(env.admin, http.MethodGet, fmt.Sprintf("/api/docs/%d", inv), nil)
	var money struct {
		Settled, Outstanding decimal.Decimal
		Items                []models.Payment
	}
	detail.as(t, "payments", &money)
	amount(t, money.Settled, "21400", "settled")
	amount(t, money.Outstanding, "0", "outstanding")
	if len(money.Items) != 1 {
		t.Fatalf("one payment on the invoice: %+v", money.Items)
	}
	if r := env.pay(env.admin, inv, "0.01", "0", nil); r.Status != http.StatusUnprocessableEntity {
		t.Fatalf("paying a settled invoice: want 422, got %d", r.Status)
	}
}

// A 30% deposit and the balance: two receipts whose VAT adds up to the
// invoice's exactly.
func TestInstalmentsCloseExactly(t *testing.T) {
	env := newTestEnv(t)
	inv := env.issuedInvoice("C-P2")

	deposit := receiptOf(t, env, env.pay(env.admin, inv, "6420", "0", nil))
	amount(t, deposit.VatAmount, "420", "deposit VAT")
	amount(t, deposit.PreTaxAmount, "6000", "deposit pre-tax")

	if r := env.pay(env.admin, inv, "14980.01", "0", nil); r.Status != http.StatusUnprocessableEntity {
		t.Fatalf("a satang too much: want 422, got %d %s", r.Status, r.Raw)
	}
	balance := receiptOf(t, env, env.pay(env.admin, inv, "14980", "0", nil))
	amount(t, balance.VatAmount, "980", "balance VAT")
	if deposit.Code != "RT-20261100001" || balance.Code != "RT-20261100002" {
		t.Fatalf("receipt numbers: %s, %s", deposit.Code, balance.Code)
	}
	amount(t, deposit.VatAmount.Add(balance.VatAmount), "1400", "VAT across receipts")
	var lines []models.DocumentItem
	env.db.Where("document_id IN ?", []uint{deposit.ID, balance.ID}).Order("document_id").Find(&lines)
	if len(lines) != 2 || !strings.HasSuffix(lines[0].Description, "(ชำระบางส่วน)") || !strings.HasSuffix(lines[1].Description, "(ชำระงวดสุดท้าย)") {
		t.Fatalf("receipt lines should say deposit and final instalment: %+v", lines)
	}
}

// Five people recording the full amount at once: one payment, one receipt.
func TestConcurrentPaymentsCannotOverpay(t *testing.T) {
	env := newTestEnv(t)
	inv := env.issuedInvoice("C-P3")
	env.seedPaymentMethod()

	statuses := make([]int, 5)
	var wg sync.WaitGroup
	for i := range statuses {
		wg.Add(1)
		go func(i int) {
			defer wg.Done()
			statuses[i] = env.pay(env.admin, inv, "21400", "0", nil).Status
		}(i)
	}
	wg.Wait()
	created := 0
	for _, s := range statuses {
		if s == http.StatusCreated {
			created++
		} else if s != http.StatusUnprocessableEntity {
			t.Fatalf("unexpected status in %v", statuses)
		}
	}
	var payments, receipts int64
	env.db.Model(&models.Payment{}).Where("document_id = ?", inv).Count(&payments)
	env.db.Model(&models.Document{}).Where("doc_type = ?", models.DocReceipt).Count(&receipts)
	if created != 1 || payments != 1 || receipts != 1 {
		t.Fatalf("want one payment and one receipt, got %d created, %d payments, %d receipts (%v)", created, payments, receipts, statuses)
	}
}

func TestReceiptLaterAndVoid(t *testing.T) {
	env := newTestEnv(t)
	inv := env.issuedInvoice("C-P4")

	r := env.pay(env.admin, inv, "21400", "0", map[string]interface{}{"issue_receipt": false})
	if r.Status != http.StatusCreated || r.Body["receipt_id"] != nil {
		t.Fatalf("payment without a receipt: %d %s", r.Status, r.Raw)
	}
	pid := docID(t, r)
	later := env.do(env.admin, http.MethodPost, fmt.Sprintf("/api/docs/payments/%d/receipt", pid), nil)
	if later.Status != http.StatusOK || later.Body["receipt_id"] == nil {
		t.Fatalf("receipt later: %d %s", later.Status, later.Raw)
	}
	if again := env.do(env.admin, http.MethodPost, fmt.Sprintf("/api/docs/payments/%d/receipt", pid), nil); again.Status != http.StatusConflict {
		t.Fatalf("a second receipt: want 409, got %d", again.Status)
	}

	if r := env.do(env.admin, http.MethodPost, fmt.Sprintf("/api/docs/payments/%d/void", pid), map[string]string{}); r.Status != http.StatusBadRequest {
		t.Fatalf("void without a reason: want 400, got %d", r.Status)
	}
	voided := env.do(env.admin, http.MethodPost, fmt.Sprintf("/api/docs/payments/%d/void", pid), map[string]string{"reason": "ลูกค้าโอนผิดบัญชี"})
	if voided.Status != http.StatusOK || str(voided, "status") != models.PaymentVoided {
		t.Fatalf("void: %d %s", voided.Status, voided.Raw)
	}
	var p models.Payment
	env.db.Preload("Receipt").First(&p, pid)
	if p.Receipt == nil || p.Receipt.Status != models.DocStatusVoided || p.Receipt.Code == "" {
		t.Fatalf("the receipt is voided with its number kept: %+v", p.Receipt)
	}
	// The invoice is owed again in full.
	if r := env.pay(env.admin, inv, "21400", "0", nil); r.Status != http.StatusCreated {
		t.Fatalf("pay again after a void: %d %s", r.Status, r.Raw)
	}
	if r := env.do(env.admin, http.MethodPost, fmt.Sprintf("/api/docs/payments/%d/void", pid), map[string]string{"reason": "ซ้ำ"}); r.Status != http.StatusConflict {
		t.Fatalf("void twice: want 409, got %d", r.Status)
	}
}

func TestWithholdingCertificateNeedsTheFile(t *testing.T) {
	env := newTestEnv(t)
	inv := env.issuedInvoice("C-P5")
	pid := docID(t, env.pay(env.admin, inv, "20800", "600", nil))

	pending := env.do(env.admin, http.MethodGet, "/api/docs/payments?wht_cert=pending", nil)
	if pending.Body["total"].(float64) != 1 {
		t.Fatalf("one certificate pending: %s", pending.Raw)
	}
	if r := env.do(env.admin, http.MethodPost, fmt.Sprintf("/api/docs/payments/%d/wht-cert", pid), nil); r.Status != http.StatusUnprocessableEntity {
		t.Fatalf("certificate received without the file: want 422, got %d", r.Status)
	}
	// A slip is not a certificate.
	env.db.Create(&models.File{OwnerType: models.FileOwnerPayment, OwnerID: pid, Key: "payment/slip.jpg", Filename: "slip.jpg", Mime: "image/jpeg", Status: models.FileStatusReady, UploadedBy: env.admin.ID})
	if r := env.do(env.admin, http.MethodPost, fmt.Sprintf("/api/docs/payments/%d/wht-cert", pid), nil); r.Status != http.StatusUnprocessableEntity {
		t.Fatalf("a slip is not a certificate: want 422, got %d", r.Status)
	}
	env.db.Create(&models.File{OwnerType: models.FileOwnerPaymentWht, OwnerID: pid, Key: "payment_wht/50tawi.pdf", Filename: "50tawi.pdf", Mime: "application/pdf", Status: models.FileStatusReady, UploadedBy: env.admin.ID})
	done := env.do(env.admin, http.MethodPost, fmt.Sprintf("/api/docs/payments/%d/wht-cert", pid), nil)
	if done.Status != http.StatusOK || str(done, "wht_cert_status") != models.WhtCertDone {
		t.Fatalf("certificate received: %d %s", done.Status, done.Raw)
	}
	if r := env.do(env.admin, http.MethodGet, "/api/docs/payments?wht_cert=pending", nil); r.Body["total"].(float64) != 0 {
		t.Fatalf("none pending now: %s", r.Raw)
	}

	noWht := docID(t, env.pay(env.admin, env.issuedInvoice("C-P6"), "21400", "0", nil))
	if r := env.do(env.admin, http.MethodPost, fmt.Sprintf("/api/docs/payments/%d/wht-cert", noWht), nil); r.Status != http.StatusUnprocessableEntity {
		t.Fatalf("nothing withheld: want 422, got %d", r.Status)
	}
}

func TestPaymentPermissionsAndRules(t *testing.T) {
	env := newTestEnv(t)
	inv := env.issuedInvoice("C-P7")

	if r := env.pay(env.sales1, inv, "21400", "0", nil); r.Status != http.StatusForbidden {
		t.Fatalf("sales recording money: want 403, got %d", r.Status)
	}
	if r := env.do(env.sales1, http.MethodGet, "/api/docs/payments", nil); r.Status != http.StatusForbidden {
		t.Fatalf("sales listing payments: want 403, got %d", r.Status)
	}
	if r := env.pay(env.admin, inv, "21400", "0", map[string]interface{}{"payment_date": "2099-01-01"}); r.Status != http.StatusUnprocessableEntity {
		t.Fatalf("a payment dated in the future: want 422, got %d", r.Status)
	}
	draft := docID(t, env.do(env.admin, http.MethodPost, "/api/docs", quotationBody(env.seedBillingContact("C-P8", "ร่าง", nil, models.FinanceCustomer, true))))
	if r := env.pay(env.admin, draft, "100", "0", nil); r.Status != http.StatusConflict {
		t.Fatalf("paying a draft: want 409, got %d", r.Status)
	}

	pid := docID(t, env.pay(env.admin, inv, "21400", "0", nil))
	upload := map[string]interface{}{"owner_type": models.FileOwnerPayment, "owner_id": pid, "filename": "slip.jpg", "size": 1000}
	if r := env.do(env.sales1, http.MethodPost, "/api/files/upload-url", upload); r.Status != http.StatusForbidden || r.Body["upload_url"] != nil {
		t.Fatalf("sales uploading a slip: want a clean 403, got %d %s", r.Status, r.Raw)
	}
	if r := env.do(env.admin, http.MethodPost, "/api/files/upload-url", upload); r.Status != http.StatusOK && r.Status != http.StatusCreated {
		t.Fatalf("admin uploading a slip: %d %s", r.Status, r.Raw)
	}
	if r := env.do(env.sales1, http.MethodGet, fmt.Sprintf("/api/files?owner_type=payment&owner_id=%d", pid), nil); r.Status != http.StatusForbidden {
		t.Fatalf("sales listing a payment's files: want 403, got %d", r.Status)
	}
}

// A document with a VAT line and a no-VAT line: the receipt keeps the two
// apart, so its VAT is only on the VAT line.
func TestReceiptForMixedVatInvoice(t *testing.T) {
	env := newTestEnv(t)
	contact := env.seedBillingContact("C-P9", "บริษัท ผสม จำกัด", nil, models.FinanceCustomer, true)
	id := docID(t, env.do(env.admin, http.MethodPost, "/api/docs", map[string]interface{}{
		"doc_type": models.DocInvoice, "contact_id": contact, "issued_date": "2026-11-16",
		"items": []map[string]interface{}{
			{"description": "งานบริการ", "quantity": "1", "price": "10000", "vat_type": models.VatSeven},
			{"description": "ค่าผ่านทางที่ไม่มี VAT", "quantity": "1", "price": "5000", "vat_type": models.VatNone},
		},
	}))
	env.do(env.admin, http.MethodPost, fmt.Sprintf("/api/docs/%d/issue", id), nil)
	rt := receiptOf(t, env, env.pay(env.admin, id, "15700", "0", nil))
	amount(t, rt.VatAmount, "700", "VAT")
	var items []models.DocumentItem
	env.db.Where("document_id = ?", rt.ID).Order("position").Find(&items)
	if len(items) != 2 || items[0].VatType != models.VatSeven || items[1].VatType != models.VatNone {
		t.Fatalf("two lines, VAT then no VAT: %+v", items)
	}
	amount(t, items[0].LineAmount, "10000", "VAT line")
	amount(t, items[1].LineAmount, "5000", "no-VAT line")
}
