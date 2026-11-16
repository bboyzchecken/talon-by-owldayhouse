package api

import (
	"fmt"
	"net/http"
	"sort"
	"sync"
	"testing"

	"github.com/owldayhouse/odh-internal-api/pkg/models"
)

func contactPayload(name string, extra map[string]interface{}) map[string]interface{} {
	body := map[string]interface{}{
		"name": name, "contact_type": models.ContactCompany, "finance_side": models.FinanceCustomer,
		"tax_number": "0-1055-61234-56-7", "branch_code": "00000",
		"address": "1 ถนนสีลม", "province": "กรุงเทพมหานคร", "post_code": "10500",
	}
	for k, v := range extra {
		body[k] = v
	}
	return body
}

func TestContactRegister(t *testing.T) {
	env := newTestEnv(t)

	first := env.do(env.admin, http.MethodPost, "/api/docs/contacts", contactPayload("บริษัท หนึ่ง จำกัด", nil))
	if first.Status != http.StatusCreated || str(first, "code") != "C-0001" || str(first, "tax_number") != "0105561234567" || str(first, "wht_form") != models.WhtFormPND53 {
		t.Fatalf("first customer: %d %s", first.Status, first.Raw)
	}
	if r := env.do(env.admin, http.MethodPost, "/api/docs/contacts", contactPayload("บริษัท สอง จำกัด", nil)); str(r, "code") != "C-0002" {
		t.Fatalf("second customer: %s", r.Raw)
	}
	vendor := env.do(env.admin, http.MethodPost, "/api/docs/contacts", contactPayload("นายช่าง ภาพสวย", map[string]interface{}{
		"contact_type": models.ContactPerson, "finance_side": models.FinanceVendor, "name_prefix": 2,
	}))
	if str(vendor, "code") != "V-0001" || str(vendor, "wht_form") != models.WhtFormPND3 {
		t.Fatalf("a person vendor is V-0001 and files PND3: %s", vendor.Raw)
	}
	peak := env.do(env.admin, http.MethodPost, "/api/docs/contacts", contactPayload("ลูกค้าจาก PEAK", map[string]interface{}{"code": "C00045"}))
	if str(peak, "code") != "C00045" {
		t.Fatalf("a given code is kept (PEAK's): %s", peak.Raw)
	}
	if r := env.do(env.admin, http.MethodPost, "/api/docs/contacts", contactPayload("ซ้ำ", map[string]interface{}{"code": "C00045"})); r.Status != http.StatusConflict {
		t.Fatalf("a taken code: want 409, got %d", r.Status)
	}
	for name, bad := range map[string]map[string]interface{}{
		"12-digit tax ID": {"tax_number": "010556123456"},
		"branch of 1":     {"branch_code": "1"},
		"contact type 12": {"contact_type": 12},
		"bad e-mail":      {"person_email": "not-an-email"},
		"bad side":        {"finance_side": "partner"},
	} {
		if r := env.do(env.admin, http.MethodPost, "/api/docs/contacts", contactPayload("ผิด", bad)); r.Status != http.StatusUnprocessableEntity {
			t.Errorf("%s: want 422, got %d %s", name, r.Status, r.Raw)
		}
	}

	// Deleting: an unused contact goes, a used one stays.
	unused := docID(t, env.do(env.admin, http.MethodPost, "/api/docs/contacts", contactPayload("ไม่ได้ใช้", nil)))
	if r := env.do(env.admin, http.MethodDelete, fmt.Sprintf("/api/docs/contacts/%d", unused), nil); r.Status != http.StatusNoContent {
		t.Fatalf("delete unused: %d", r.Status)
	}
	used := docID(t, first)
	env.do(env.admin, http.MethodPost, "/api/docs", quotationBody(used))
	if r := env.do(env.admin, http.MethodDelete, fmt.Sprintf("/api/docs/contacts/%d", used), nil); r.Status != http.StatusConflict {
		t.Fatalf("delete a contact a document uses: want 409, got %d", r.Status)
	}
}

func TestSalesContactScope(t *testing.T) {
	env := newTestEnv(t)
	mine := leadID(t, env.createLead(env.sales1, map[string]interface{}{"name": "โรงเรียนนานาชาติ ตัวอย่าง", "industry": "education", "source": "referral"}))
	theirs := leadID(t, env.createLead(env.sales2, map[string]interface{}{"name": "คลินิกทันตกรรม ทดลอง", "industry": "healthcare", "source": "referral"}))

	ok := env.do(env.sales1, http.MethodPost, "/api/docs/contacts", contactPayload("โรงเรียนนานาชาติ ตัวอย่าง", map[string]interface{}{"lead_id": mine}))
	if ok.Status != http.StatusCreated {
		t.Fatalf("sales1 adds its own customer: %d %s", ok.Status, ok.Raw)
	}
	for name, extra := range map[string]map[string]interface{}{
		"another's lead": {"lead_id": theirs},
		"no lead":        {},
		"a vendor":       {"lead_id": mine, "finance_side": models.FinanceVendor},
	} {
		if r := env.do(env.sales1, http.MethodPost, "/api/docs/contacts", contactPayload("x", extra)); r.Status != http.StatusForbidden {
			t.Errorf("sales1, %s: want 403, got %d", name, r.Status)
		}
	}
	id := docID(t, ok)
	if r := env.do(env.sales2, http.MethodGet, fmt.Sprintf("/api/docs/contacts/%d", id), nil); r.Status != http.StatusNotFound {
		t.Fatalf("sales2 reading sales1's contact: want 404, got %d", r.Status)
	}
	if r := env.do(env.sales1, http.MethodPut, fmt.Sprintf("/api/docs/contacts/%d", id), contactPayload("ย้าย", map[string]interface{}{"lead_id": theirs})); r.Status != http.StatusForbidden {
		t.Fatalf("moving a contact to another's lead: want 403, got %d", r.Status)
	}
	list := env.do(env.sales2, http.MethodGet, "/api/docs/contacts", nil)
	if list.Body["total"].(float64) != 0 {
		t.Fatalf("sales2 sees none: %s", list.Raw)
	}

	// Prefill from the lead and its first contact person.
	env.do(env.sales1, http.MethodPost, fmt.Sprintf("/api/leads/%d/contacts", mine), map[string]interface{}{
		"name": "สมศรี ใจงาม", "position": "ฝ่ายจัดซื้อ", "phone": "0811111111", "email": "somsri@example.com",
	})
	draft := env.do(env.sales1, http.MethodGet, fmt.Sprintf("/api/docs/contacts/from-lead?lead_id=%d", mine), nil)
	if draft.Status != http.StatusOK || str(draft, "name") != "โรงเรียนนานาชาติ ตัวอย่าง" ||
		str(draft, "person_first_name") != "สมศรี" || str(draft, "person_last_name") != "ใจงาม" || str(draft, "person_email") != "somsri@example.com" {
		t.Fatalf("prefill: %d %s", draft.Status, draft.Raw)
	}
	if r := env.do(env.sales2, http.MethodGet, fmt.Sprintf("/api/docs/contacts/from-lead?lead_id=%d", mine), nil); r.Status != http.StatusNotFound {
		t.Fatalf("prefill from another's lead: want 404, got %d", r.Status)
	}
}

// Ten people adding a customer at once: ten distinct codes, no gaps.
func TestContactCodesUnderConcurrency(t *testing.T) {
	env := newTestEnv(t)
	const n = 10
	codes := make([]string, n)
	var wg sync.WaitGroup
	for i := 0; i < n; i++ {
		wg.Add(1)
		go func(i int) {
			defer wg.Done()
			r := env.do(env.admin, http.MethodPost, "/api/docs/contacts", contactPayload(fmt.Sprintf("ลูกค้าพร้อมกัน %d", i), nil))
			codes[i] = str(r, "code")
		}(i)
	}
	wg.Wait()
	sort.Strings(codes)
	for i, code := range codes {
		if want := fmt.Sprintf("C-%04d", i+1); code != want {
			t.Fatalf("codes %v: position %d is %q, want %s", codes, i, code, want)
		}
	}
}

// Editing a contact after a tax invoice was issued must not change what the
// invoice says about the buyer.
func TestIssuedDocumentKeepsTheBuyer(t *testing.T) {
	env := newTestEnv(t)
	contact := docID(t, env.do(env.admin, http.MethodPost, "/api/docs/contacts", contactPayload("บริษัท ชื่อเดิม จำกัด", nil)))
	id := docID(t, env.do(env.admin, http.MethodPost, "/api/docs", quotationBody(contact)))

	draft := env.do(env.admin, http.MethodGet, fmt.Sprintf("/api/docs/%d", id), nil)
	var doc models.Document
	draft.as(t, "document", &doc)
	if doc.BuyerName != "" {
		t.Fatalf("a draft has no buyer record yet: %q", doc.BuyerName)
	}

	if r := env.do(env.admin, http.MethodPost, fmt.Sprintf("/api/docs/%d/issue", id), nil); r.Status != http.StatusOK {
		t.Fatalf("issue: %d %s", r.Status, r.Raw)
	}
	env.do(env.admin, http.MethodPut, fmt.Sprintf("/api/docs/contacts/%d", contact), contactPayload("บริษัท ชื่อใหม่ จำกัด", map[string]interface{}{
		"address": "99 ถนนใหม่", "branch_code": "00002",
	}))

	after := env.do(env.admin, http.MethodGet, fmt.Sprintf("/api/docs/%d", id), nil)
	after.as(t, "document", &doc)
	if doc.BuyerName != "บริษัท ชื่อเดิม จำกัด" || doc.BuyerBranchCode != "00000" || doc.BuyerAddress != "1 ถนนสีลม กรุงเทพมหานคร 10500" || doc.BuyerTaxNumber != "0105561234567" {
		t.Fatalf("the issued receipt changed with the contact: %+v", doc)
	}
	if doc.Contact == nil || doc.Contact.Name != "บริษัท ชื่อใหม่ จำกัด" {
		t.Fatalf("the contact itself did change: %+v", doc.Contact)
	}
}

func TestProductsAndPaymentMethods(t *testing.T) {
	env := newTestEnv(t)
	product := map[string]interface{}{"code": "S-001", "name": "ระบบลงทะเบียนหน้างาน", "unit_name": "งาน", "sell_price": "15000", "interest": "system"}

	if r := env.do(env.sales1, http.MethodPost, "/api/docs/products", product); r.Status != http.StatusForbidden {
		t.Fatalf("sales adding a product: want 403, got %d", r.Status)
	}
	created := env.do(env.admin, http.MethodPost, "/api/docs/products", product)
	if created.Status != http.StatusCreated || created.Body["product_type"].(float64) != 2 || created.Body["sell_vat_type"].(float64) != 3 {
		t.Fatalf("create product (a service, VAT 7%% by default): %d %s", created.Status, created.Raw)
	}
	if r := env.do(env.admin, http.MethodPost, "/api/docs/products", product); r.Status != http.StatusConflict {
		t.Fatalf("same code: want 409, got %d", r.Status)
	}
	bad := map[string]interface{}{"code": "S-002", "name": "x", "interest": "astrology"}
	if r := env.do(env.admin, http.MethodPost, "/api/docs/products", bad); r.Status != http.StatusUnprocessableEntity {
		t.Fatalf("unknown interest: want 422, got %d", r.Status)
	}

	off := map[string]interface{}{"code": "S-001", "name": "ระบบลงทะเบียนหน้างาน", "sell_price": "15000", "active": false}
	if r := env.do(env.admin, http.MethodPut, fmt.Sprintf("/api/docs/products/%d", docID(t, created)), off); r.Status != http.StatusOK {
		t.Fatalf("switch off: %d %s", r.Status, r.Raw)
	}
	var items []models.Product
	env.do(env.sales1, http.MethodGet, "/api/docs/products?all=1", nil).as(t, "items", &items)
	if len(items) != 0 {
		t.Fatalf("a switched-off product is hidden from the form, all=1 or not, for sales: %+v", items)
	}
	env.do(env.admin, http.MethodGet, "/api/docs/products?all=1", nil).as(t, "items", &items)
	if len(items) != 1 {
		t.Fatalf("an admin sees it with all=1: %+v", items)
	}

	if r := env.do(env.admin, http.MethodPost, "/api/docs/payment-methods", map[string]interface{}{"code": "BANK-01", "name": "กสิกรไทย", "method_type": models.PayMethodBank}); r.Status != http.StatusUnprocessableEntity {
		t.Fatalf("a bank account without a number: want 422, got %d", r.Status)
	}
	bank := env.do(env.admin, http.MethodPost, "/api/docs/payment-methods", map[string]interface{}{
		"code": "BANK-01", "name": "กสิกรไทย ออมทรัพย์", "method_type": models.PayMethodBank, "bank_name": "กสิกรไทย", "account_no": "123-4-56789-0",
	})
	if bank.Status != http.StatusCreated {
		t.Fatalf("bank account: %d %s", bank.Status, bank.Raw)
	}
	if r := env.do(env.sales1, http.MethodPost, "/api/docs/payment-methods", map[string]interface{}{"code": "CASH", "name": "เงินสด", "method_type": 1}); r.Status != http.StatusForbidden {
		t.Fatalf("sales adding a payment method: want 403, got %d", r.Status)
	}
	var methods []models.PaymentMethod
	env.do(env.sales1, http.MethodGet, "/api/docs/payment-methods", nil).as(t, "items", &methods)
	if len(methods) != 1 {
		t.Fatalf("everyone reads active methods: %+v", methods)
	}
}
