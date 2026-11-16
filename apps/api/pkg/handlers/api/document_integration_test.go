package api

import (
	"fmt"
	"net/http"
	"strings"
	"sync"
	"testing"

	"github.com/owldayhouse/odh-internal-api/pkg/models"
)

// seedBillingContact adds a customer (or vendor) directly; the register's
// own screens come in step 4.
func (e *testEnv) seedBillingContact(code, name string, leadID *uint, side string, complete bool) uint {
	e.t.Helper()
	c := models.BillingContact{
		Code: code, Name: name, ContactType: models.ContactCompany,
		FinanceSide: side, WhtForm: models.WhtFormPND53, LeadID: leadID, CreatedBy: e.admin.ID,
		PersonEmail: "buyer@example.com", PersonFirstName: "สมหญิง",
	}
	if complete {
		c.TaxNumber = "0105561234567"
		c.BranchCode = "00000"
		c.Address = "99 ถนนสุขุมวิท"
		c.Province = "กรุงเทพมหานคร"
	}
	if err := e.db.Create(&c).Error; err != nil {
		e.t.Fatal(err)
	}
	return c.ID
}

func quotationBody(contactID uint) map[string]interface{} {
	return map[string]interface{}{
		"doc_type":    models.DocQuotation,
		"contact_id":  contactID,
		"issued_date": "2026-11-16",
		"tax_status":  models.TaxExclusive,
		"items": []map[string]interface{}{
			{"description": "ระบบลงทะเบียนหน้างาน", "quantity": "1", "price": "15000", "vat_type": models.VatSeven, "withholding_rate": "3"},
			{"description": "ขั้นตอนการทำงาน", "is_description": true},
			{"description": "เกมคีออสก์ 2 วัน", "quantity": "2", "price": "2500", "vat_type": models.VatSeven, "withholding_rate": "3"},
		},
	}
}

func docID(t *testing.T, r response) uint {
	t.Helper()
	raw, ok := r.Body["id"].(float64)
	if !ok {
		t.Fatalf("no id in: %s", r.Raw)
	}
	return uint(raw)
}

func str(r response, field string) string {
	v, _ := r.Body[field].(string)
	return v
}

func TestDocumentLifecycle(t *testing.T) {
	env := newTestEnv(t)
	contact := env.seedBillingContact("C-0001", "บริษัท ลูกค้า จำกัด", nil, models.FinanceCustomer, true)

	created := env.do(env.admin, http.MethodPost, "/api/docs", quotationBody(contact))
	if created.Status != http.StatusCreated {
		t.Fatalf("create: %d %s", created.Status, created.Raw)
	}
	id := docID(t, created)
	if str(created, "code") != "" || str(created, "status") != models.DocStatusDraft {
		t.Fatalf("a new document is a draft with no number: %s", created.Raw)
	}
	// 15000 + 5000 = 20000, VAT 1400, withholding 3% = 600.
	if str(created, "net_amount") != "21400" || str(created, "withholding_total") != "600" {
		t.Fatalf("totals: net %s, wht %s", str(created, "net_amount"), str(created, "withholding_total"))
	}

	edit := quotationBody(contact)
	edit["discount"] = "1000"
	edited := env.do(env.admin, http.MethodPut, fmt.Sprintf("/api/docs/%d", id), edit)
	if edited.Status != http.StatusOK || str(edited, "net_amount") != "20330" {
		t.Fatalf("edit with a 1000 discount should net 20330: %d %s", edited.Status, edited.Raw)
	}

	issued := env.do(env.admin, http.MethodPost, fmt.Sprintf("/api/docs/%d/issue", id), nil)
	if issued.Status != http.StatusOK || str(issued, "code") != "QO-20261100001" || str(issued, "status") != models.DocStatusIssued {
		t.Fatalf("issue: %d %s", issued.Status, issued.Raw)
	}

	if r := env.do(env.admin, http.MethodPut, fmt.Sprintf("/api/docs/%d", id), edit); r.Status != http.StatusConflict {
		t.Fatalf("editing an issued document: want 409, got %d", r.Status)
	}
	if r := env.do(env.admin, http.MethodDelete, fmt.Sprintf("/api/docs/%d", id), nil); r.Status != http.StatusConflict {
		t.Fatalf("deleting an issued document: want 409, got %d", r.Status)
	}
	if r := env.do(env.admin, http.MethodPost, fmt.Sprintf("/api/docs/%d/issue", id), nil); r.Status != http.StatusConflict {
		t.Fatalf("issuing twice: want 409, got %d", r.Status)
	}
	if r := env.do(env.admin, http.MethodPost, fmt.Sprintf("/api/docs/%d/void", id), map[string]string{}); r.Status != http.StatusBadRequest {
		t.Fatalf("void without a reason: want 400, got %d", r.Status)
	}
	voided := env.do(env.admin, http.MethodPost, fmt.Sprintf("/api/docs/%d/void", id), map[string]string{"reason": "ลูกค้าขอแก้ขอบเขตงาน"})
	if voided.Status != http.StatusOK || str(voided, "status") != models.DocStatusVoided || str(voided, "code") != "QO-20261100001" {
		t.Fatalf("void keeps the number: %d %s", voided.Status, voided.Raw)
	}

	// The next quotation takes the next number; the voided one is not reused.
	again := env.do(env.admin, http.MethodPost, "/api/docs", quotationBody(contact))
	reissued := env.do(env.admin, http.MethodPost, fmt.Sprintf("/api/docs/%d/issue", docID(t, again)), nil)
	if str(reissued, "code") != "QO-20261100002" {
		t.Fatalf("want QO-20261100002 after a void, got %s", reissued.Raw)
	}

	detail := env.do(env.admin, http.MethodGet, fmt.Sprintf("/api/docs/%d", id), nil)
	var events []models.DocumentEvent
	detail.as(t, "events", &events)
	actions := []string{}
	for _, e := range events {
		actions = append(actions, e.Action)
	}
	if strings.Join(actions, ",") != "created,edited,issued,voided" {
		t.Fatalf("history: %v", actions)
	}
}

func TestDocumentChainAndTaxInvoiceRules(t *testing.T) {
	env := newTestEnv(t)
	incomplete := env.seedBillingContact("C-0002", "บริษัท ยังไม่ครบ จำกัด", nil, models.FinanceCustomer, false)

	qo := env.do(env.admin, http.MethodPost, "/api/docs", quotationBody(incomplete))
	qoID := docID(t, qo)

	if r := env.do(env.admin, http.MethodPost, fmt.Sprintf("/api/docs/%d/next", qoID), map[string]int{"doc_type": models.DocInvoice}); r.Status != http.StatusConflict {
		t.Fatalf("next from a draft: want 409, got %d", r.Status)
	}
	issuedQO := env.do(env.admin, http.MethodPost, fmt.Sprintf("/api/docs/%d/issue", qoID), nil)
	if issuedQO.Status != http.StatusOK {
		t.Fatalf("a quotation needs no tax ID: %d %s", issuedQO.Status, issuedQO.Raw)
	}
	if r := env.do(env.admin, http.MethodPost, fmt.Sprintf("/api/docs/%d/next", qoID), map[string]int{"doc_type": models.DocCreditNote}); r.Status != http.StatusBadRequest {
		t.Fatalf("a credit note from a quotation: want 400, got %d", r.Status)
	}

	iv := env.do(env.admin, http.MethodPost, fmt.Sprintf("/api/docs/%d/next", qoID), map[string]int{"doc_type": models.DocInvoice})
	if iv.Status != http.StatusCreated {
		t.Fatalf("invoice from quotation: %d %s", iv.Status, iv.Raw)
	}
	if str(iv, "reference") != "QO-20261100001" || str(iv, "net_amount") != "21400" || iv.Body["source_document_id"].(float64) != float64(qoID) {
		t.Fatalf("the invoice should carry the quotation over: %s", iv.Raw)
	}
	var items []models.DocumentItem
	iv.as(t, "items", &items)
	if len(items) != 3 || !items[1].IsDescription {
		t.Fatalf("lines copied in order: %+v", items)
	}
	ivID := docID(t, iv)
	if r := env.do(env.admin, http.MethodPost, fmt.Sprintf("/api/docs/%d/issue", ivID), nil); r.Status != http.StatusOK || str(r, "code") == "" {
		t.Fatalf("issue invoice: %d %s", r.Status, r.Raw)
	}

	// A receipt is never chained or typed in: it comes from recording money.
	if r := env.do(env.admin, http.MethodPost, fmt.Sprintf("/api/docs/%d/next", ivID), map[string]int{"doc_type": models.DocReceipt}); r.Status != http.StatusBadRequest {
		t.Fatalf("receipt via next: want 400, got %d", r.Status)
	}
	method := env.seedPaymentMethod()
	pay := map[string]interface{}{"payment_date": "2026-11-16", "payment_method_id": method, "received_amount": "20800", "withholding_amount": "600"}
	refused := env.do(env.admin, http.MethodPost, fmt.Sprintf("/api/docs/%d/payments", ivID), pay)
	if refused.Status != http.StatusUnprocessableEntity {
		t.Fatalf("a tax invoice without the buyer's address and tax ID: want 422, got %d %s", refused.Status, refused.Raw)
	}
	var payments int64
	env.db.Model(&models.Payment{}).Count(&payments)
	if payments != 0 {
		t.Fatalf("a refused receipt must take its payment with it, found %d", payments)
	}
	// The refusal took no number: fix the contact and the receipt is RT-…00001.
	env.db.Model(&models.BillingContact{}).Where("id = ?", incomplete).Updates(map[string]interface{}{
		"tax_number": "0105561234567", "branch_code": "00000", "address": "1 ถนนพระราม 9",
	})
	paid := env.do(env.admin, http.MethodPost, fmt.Sprintf("/api/docs/%d/payments", ivID), pay)
	if paid.Status != http.StatusCreated {
		t.Fatalf("payment: %d %s", paid.Status, paid.Raw)
	}
	var payment models.Payment
	if err := env.db.Preload("Receipt").Last(&payment).Error; err != nil || payment.Receipt == nil || payment.Receipt.Code != "RT-20261100001" {
		t.Fatalf("receipt: %+v %v", payment.Receipt, err)
	}
	rtID := payment.Receipt.ID

	// The company does not use credit notes: a wrong tax invoice is voided
	// and issued again.
	if r := env.do(env.admin, http.MethodPost, fmt.Sprintf("/api/docs/%d/next", rtID), map[string]int{"doc_type": models.DocCreditNote}); r.Status == http.StatusCreated {
		t.Fatalf("a credit note is retired: %d %s", r.Status, r.Raw)
	}
}

// Billing, credit and debit notes are not used: none can be created, and a
// draft left from before cannot be issued.
func TestRetiredDocumentTypes(t *testing.T) {
	env := newTestEnv(t)
	contact := env.seedBillingContact("C-R1", "บริษัท ไม่ใช้ใบวางบิล จำกัด", nil, models.FinanceCustomer, true)
	for _, docType := range []int{models.DocCreditNote, models.DocBillingNote, models.DocDebitNote} {
		body := quotationBody(contact)
		body["doc_type"] = docType
		if r := env.do(env.admin, http.MethodPost, "/api/docs", body); r.Status != http.StatusUnprocessableEntity {
			t.Fatalf("creating type %d: want 422, got %d %s", docType, r.Status, r.Raw)
		}
	}
	draft := models.Document{DocType: models.DocBillingNote, ContactID: contact, Status: models.DocStatusDraft, CreatedBy: env.admin.ID}
	env.db.Create(&draft)
	if r := env.do(env.admin, http.MethodPost, fmt.Sprintf("/api/docs/%d/issue", draft.ID), nil); r.Status != http.StatusUnprocessableEntity {
		t.Fatalf("issuing an old draft: want 422, got %d %s", r.Status, r.Raw)
	}
	qo := docID(t, env.do(env.admin, http.MethodPost, "/api/docs", quotationBody(contact)))
	env.do(env.admin, http.MethodPost, fmt.Sprintf("/api/docs/%d/issue", qo), nil)
	if r := env.do(env.admin, http.MethodPost, fmt.Sprintf("/api/docs/%d/next", qo), map[string]int{"doc_type": models.DocBillingNote}); r.Status == http.StatusCreated {
		t.Fatalf("a billing note from a quotation is retired: %d", r.Status)
	}
}

func TestSalesSeesAndIssuesOnlyItsOwnCustomers(t *testing.T) {
	env := newTestEnv(t)
	leadA := leadID(t, env.createLead(env.sales1, map[string]interface{}{
		"name": "ลูกค้าของเซลส์หนึ่ง", "industry": "education", "source": "referral",
	}))
	leadB := leadID(t, env.createLead(env.sales2, map[string]interface{}{
		"name": "คลินิกความงาม ภูเก็ต", "industry": "healthcare", "source": "referral",
	}))
	mine := env.seedBillingContact("C-0010", "ลูกค้าของเซลส์หนึ่ง", &leadA, models.FinanceCustomer, true)
	theirs := env.seedBillingContact("C-0011", "ลูกค้าของเซลส์สอง", &leadB, models.FinanceCustomer, true)
	orphan := env.seedBillingContact("C-0012", "ไม่ผูกลูกค้า", nil, models.FinanceCustomer, true)

	ok := env.do(env.sales1, http.MethodPost, "/api/docs", quotationBody(mine))
	if ok.Status != http.StatusCreated || ok.Body["lead_id"].(float64) != float64(leadA) {
		t.Fatalf("sales1 quotes its own customer: %d %s", ok.Status, ok.Raw)
	}
	if r := env.do(env.sales1, http.MethodPost, fmt.Sprintf("/api/docs/%d/issue", docID(t, ok)), nil); r.Status != http.StatusOK {
		t.Fatalf("sales1 issues its own quotation: %d %s", r.Status, r.Raw)
	}
	if r := env.do(env.sales1, http.MethodPost, "/api/docs", quotationBody(theirs)); r.Status != http.StatusForbidden {
		t.Fatalf("another's customer: want 403, got %d", r.Status)
	}
	if r := env.do(env.sales1, http.MethodPost, "/api/docs", quotationBody(orphan)); r.Status != http.StatusForbidden {
		t.Fatalf("a contact with no lead is the admin's: want 403, got %d", r.Status)
	}
	receipt := quotationBody(mine)
	receipt["doc_type"] = models.DocReceipt
	if r := env.do(env.sales1, http.MethodPost, "/api/docs", receipt); r.Status != http.StatusUnprocessableEntity {
		t.Fatalf("a receipt comes only from a payment: want 422, got %d", r.Status)
	}

	if r := env.do(env.sales2, http.MethodGet, fmt.Sprintf("/api/docs/%d", docID(t, ok)), nil); r.Status != http.StatusNotFound {
		t.Fatalf("sales2 reading sales1's document: want 404, got %d", r.Status)
	}
	list := env.do(env.sales2, http.MethodGet, "/api/docs", nil)
	if list.Body["total"].(float64) != 0 {
		t.Fatalf("sales2 should see no documents: %s", list.Raw)
	}
	all := env.do(env.admin, http.MethodGet, "/api/docs?doc_type=101&month=2026-11", nil)
	if all.Body["total"].(float64) != 1 {
		t.Fatalf("admin sees the quotation: %s", all.Raw)
	}
}

// Two people pressing "issue" on the same draft: one number, one 409.
func TestIssueTheSameDraftAtOnce(t *testing.T) {
	env := newTestEnv(t)
	contact := env.seedBillingContact("C-0020", "บริษัท พร้อมกัน จำกัด", nil, models.FinanceCustomer, true)
	id := docID(t, env.do(env.admin, http.MethodPost, "/api/docs", quotationBody(contact)))

	const clicks = 8
	statuses := make([]int, clicks)
	var wg sync.WaitGroup
	for i := 0; i < clicks; i++ {
		wg.Add(1)
		go func(i int) {
			defer wg.Done()
			statuses[i] = env.do(env.admin, http.MethodPost, fmt.Sprintf("/api/docs/%d/issue", id), nil).Status
		}(i)
	}
	wg.Wait()

	okCount := 0
	for _, s := range statuses {
		switch s {
		case http.StatusOK:
			okCount++
		case http.StatusConflict:
		default:
			t.Fatalf("unexpected status %d in %v", s, statuses)
		}
	}
	if okCount != 1 {
		t.Fatalf("want exactly one issue to succeed, got %d (%v)", okCount, statuses)
	}
	var counter models.DocumentCounter
	env.db.First(&counter, "doc_type = ? AND period = ?", models.DocQuotation, "202611")
	if counter.NextValue != 2 {
		t.Fatalf("one number taken, counter should be at 2, got %d", counter.NextValue)
	}
}

func TestDraftsDeleteAndEmailIsOnlyADraft(t *testing.T) {
	env := newTestEnv(t)
	contact := env.seedBillingContact("C-0030", "บริษัท อีเมล จำกัด", nil, models.FinanceCustomer, true)

	draft := docID(t, env.do(env.admin, http.MethodPost, "/api/docs", quotationBody(contact)))
	if r := env.do(env.admin, http.MethodPost, fmt.Sprintf("/api/docs/%d/email-draft", draft), nil); r.Status != http.StatusConflict {
		t.Fatalf("e-mail for a draft: want 409, got %d", r.Status)
	}
	if r := env.do(env.admin, http.MethodDelete, fmt.Sprintf("/api/docs/%d", draft), nil); r.Status != http.StatusNoContent {
		t.Fatalf("delete a draft: want 204, got %d", r.Status)
	}
	if r := env.do(env.admin, http.MethodGet, fmt.Sprintf("/api/docs/%d", draft), nil); r.Status != http.StatusNotFound {
		t.Fatalf("deleted draft: want 404, got %d", r.Status)
	}

	id := docID(t, env.do(env.admin, http.MethodPost, "/api/docs", quotationBody(contact)))
	env.do(env.admin, http.MethodPost, fmt.Sprintf("/api/docs/%d/issue", id), nil)
	mail := env.do(env.admin, http.MethodPost, fmt.Sprintf("/api/docs/%d/email-draft", id), nil)
	if mail.Status != http.StatusOK || str(mail, "to") != "buyer@example.com" ||
		!strings.Contains(str(mail, "subject"), "QO-20261100001") || !strings.Contains(str(mail, "body"), "21,400.00") {
		t.Fatalf("e-mail draft: %d %s", mail.Status, mail.Raw)
	}
	if r := env.do(env.admin, http.MethodPost, fmt.Sprintf("/api/docs/%d/sent", id), nil); r.Status != http.StatusNoContent {
		t.Fatalf("mark sent: %d", r.Status)
	}
	var drafted, sent int64
	env.db.Model(&models.DocumentEvent{}).Where("document_id = ? AND action = ?", id, models.DocEventEmailDrafted).Count(&drafted)
	env.db.Model(&models.DocumentEvent{}).Where("document_id = ? AND action = ?", id, models.DocEventSent).Count(&sent)
	if drafted != 1 || sent != 1 {
		t.Fatalf("history should say drafted once and sent once by the person: %d %d", drafted, sent)
	}
}

func TestExpenseInputVatPeriod(t *testing.T) {
	env := newTestEnv(t)
	vendor := env.seedBillingContact("V-0001", "ร้านเช่าอุปกรณ์", nil, models.FinanceVendor, true)
	customer := env.seedBillingContact("C-0040", "ลูกค้า", nil, models.FinanceCustomer, true)

	body := func(contact uint, period string) map[string]interface{} {
		return map[string]interface{}{
			"doc_type": models.DocExpense, "contact_id": contact, "issued_date": "2026-11-10",
			"items":                       []map[string]interface{}{{"description": "เช่าจอ LED", "quantity": "1", "price": "8000", "vat_type": models.VatSeven, "withholding_rate": "5"}},
			"received_tax_invoice_number": "INV-889", "received_tax_invoice_date": "2026-11-08",
			"input_vat_period": period,
		}
	}
	ok := env.do(env.admin, http.MethodPost, "/api/docs", body(vendor, ""))
	if ok.Status != http.StatusCreated || !strings.HasPrefix(str(ok, "input_vat_period"), "2026-11-01") ||
		str(ok, "vat_amount") != "560" || str(ok, "withholding_total") != "400" {
		t.Fatalf("expense: %d %s", ok.Status, ok.Raw)
	}
	if r := env.do(env.admin, http.MethodPost, "/api/docs", body(vendor, "2027-06")); r.Status != http.StatusUnprocessableEntity {
		t.Fatalf("seven months later: want 422, got %d", r.Status)
	}
	if r := env.do(env.admin, http.MethodPost, "/api/docs", body(vendor, "2027-05")); r.Status != http.StatusCreated {
		t.Fatalf("six months later is allowed: %d %s", r.Status, r.Raw)
	}
	if r := env.do(env.admin, http.MethodPost, "/api/docs", body(customer, "")); r.Status != http.StatusUnprocessableEntity {
		t.Fatalf("an expense from a customer contact: want 422, got %d", r.Status)
	}
	if r := env.do(env.sales1, http.MethodPost, "/api/docs", body(vendor, "")); r.Status != http.StatusForbidden {
		t.Fatalf("expenses are the admin's: want 403, got %d", r.Status)
	}
}

func TestCalculateAndPickers(t *testing.T) {
	env := newTestEnv(t)
	calc := env.do(env.sales1, http.MethodPost, "/api/docs/calculate", map[string]interface{}{
		"tax_status": models.TaxExclusive, "discount": "1000", "items": quotationBody(0)["items"],
	})
	if calc.Status != http.StatusOK || str(calc, "net_amount") != "20330" || str(calc, "payable_amount") != "19760" {
		t.Fatalf("calculate: %d %s", calc.Status, calc.Raw)
	}
	bad := env.do(env.admin, http.MethodPost, "/api/docs/calculate", map[string]interface{}{"items": []map[string]interface{}{}})
	if bad.Status != http.StatusUnprocessableEntity {
		t.Fatalf("no lines: want 422, got %d", bad.Status)
	}
	if n := env.db.Model(&models.Document{}).Find(&[]models.Document{}).RowsAffected; n != 0 {
		t.Fatalf("calculate must not save anything, found %d documents", n)
	}

	lead := leadID(t, env.createLead(env.sales1, map[string]interface{}{"name": "ลูกค้าพิกเกอร์", "industry": "education", "source": "referral"}))
	env.seedBillingContact("C-0100", "ลูกค้าพิกเกอร์", &lead, models.FinanceCustomer, true)
	env.seedBillingContact("C-0101", "ลูกค้าแอดมิน", nil, models.FinanceCustomer, true)
	env.seedBillingContact("V-0100", "ผู้ขายอุปกรณ์", nil, models.FinanceVendor, true)

	mine := env.do(env.sales1, http.MethodGet, "/api/docs/contacts", nil)
	var items []models.BillingContact
	mine.as(t, "items", &items)
	if len(items) != 1 || items[0].Code != "C-0100" {
		t.Fatalf("sales1 sees only its own customer: %s", mine.Raw)
	}
	customers := env.do(env.admin, http.MethodGet, "/api/docs/contacts?side=customer&search=%E0%B8%A5%E0%B8%B9%E0%B8%81%E0%B8%84%E0%B9%89%E0%B8%B2", nil)
	customers.as(t, "items", &items)
	if len(items) != 2 {
		t.Fatalf("admin searching customers: %s", customers.Raw)
	}
}
