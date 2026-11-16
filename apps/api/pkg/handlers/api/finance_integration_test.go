package api

import (
	"archive/zip"
	"bytes"
	"io"
	"net/http"
	"strings"
	"testing"

	"github.com/owldayhouse/odh-internal-api/pkg/models"
)

// financeMonth sets up October: one invoice paid (20,800 in, 600 withheld by
// the customer), one invoice unpaid and overdue, one expense with a tax
// invoice paid (8,160 out, 400 withheld by us), one without, unpaid.
func financeMonth(env *testEnv) (paidInvoice uint) {
	paidInvoice = env.octoberInvoice("C-F1")
	env.pay(env.admin, paidInvoice, "20800", "600", map[string]interface{}{"payment_date": "2026-10-20"})
	env.octoberInvoice("C-F2")
	vendor := env.personVendor("V-F1")
	october := map[string]interface{}{"issued_date": "2026-10-10", "received_tax_invoice_date": "2026-10-08"}
	exp := env.issuedExpense(vendor, "INV-F1", october)
	env.pay(env.admin, exp, "8160", "400", map[string]interface{}{"payment_date": "2026-10-20"})
	env.issuedExpense(vendor, "", october)
	return paidInvoice
}

func TestFinanceOverview(t *testing.T) {
	env := newTestEnv(t)
	financeMonth(env)

	r := env.do(env.admin, http.MethodGet, "/api/docs/finance?month=2026-10", nil)
	if r.Status != http.StatusOK {
		t.Fatalf("finance: %d %s", r.Status, r.Raw)
	}
	var month models.MonthTotals
	r.as(t, "this_month", &month)
	amount(t, month.Revenue, "20000", "revenue before VAT")
	// 8,000 with a tax invoice, and 8,000 + 560 VAT that cannot be claimed.
	amount(t, month.Expense, "16560", "expense")
	amount(t, month.CashIn, "20800", "cash in")
	amount(t, month.CashOut, "8160", "cash out")

	var series []models.MonthTotals
	r.as(t, "series", &series)
	if len(series) != 12 || series[11].Month != "2026-10" {
		t.Fatalf("twelve months ending in October: %+v", series)
	}

	var rec, pay agingView
	r.as(t, "receivables", &rec)
	r.as(t, "payables", &pay)
	amount(t, rec.Total, "21400", "owed to us")
	if rec.Overdue.Count != 1 || len(rec.Items) != 1 || rec.Items[0].DaysLate <= 0 {
		t.Fatalf("one overdue invoice: %+v", rec)
	}
	amount(t, pay.Total, "8560", "we owe")

	var follow struct {
		WhtToReceive models.CountSum `json:"wht_to_receive"`
		WhtToSend    models.CountSum `json:"wht_to_send"`
		NoTaxInvoice models.CountSum `json:"no_tax_invoice"`
	}
	r.as(t, "follow_up", &follow)
	if follow.WhtToReceive.Count != 1 || follow.WhtToSend.Count != 1 || follow.NoTaxInvoice.Count != 1 {
		t.Fatalf("follow-ups: %+v", follow)
	}
	amount(t, follow.WhtToReceive.Amount, "600", "certificate the customer owes us")
	amount(t, follow.NoTaxInvoice.Amount, "560", "VAT without a tax invoice")

	var services, customers []models.AmountRow
	r.as(t, "services", &services)
	r.as(t, "customers", &customers)
	if len(services) != 1 || services[0].Key != "other" || len(customers) != 1 {
		t.Fatalf("breakdowns: %+v %+v", services, customers)
	}
	amount(t, services[0].Amount, "20000", "by service")

	if r := env.do(env.sales1, http.MethodGet, "/api/docs/finance", nil); r.Status != http.StatusForbidden {
		t.Fatalf("sales: want 403, got %d", r.Status)
	}
}

func TestFinanceExport(t *testing.T) {
	env := newTestEnv(t)
	financeMonth(env)

	r := env.do(env.admin, http.MethodGet, "/api/docs/finance/export?month=2026-10", nil)
	if r.Status != http.StatusOK {
		t.Fatalf("export: %d %s", r.Status, r.Raw)
	}
	body := []byte(r.Raw)
	zr, err := zip.NewReader(bytes.NewReader(body), int64(len(body)))
	if err != nil {
		t.Fatalf("not a zip: %v", err)
	}
	files := map[string]string{}
	for _, f := range zr.File {
		rc, _ := f.Open()
		b, _ := io.ReadAll(rc)
		rc.Close()
		files[f.Name] = string(b)
	}
	sales := files["1-รายงานภาษีขาย-2026-10.csv"]
	if !strings.HasPrefix(sales, "\xEF\xBB\xBF") || !strings.Contains(sales, "RT-20261000001") || !strings.Contains(sales, "รวม,,,20000.00,1400.00") {
		t.Fatalf("sales VAT report:\n%s", sales)
	}
	purchase := files["2-รายงานภาษีซื้อ-2026-10.csv"]
	if !strings.Contains(purchase, "INV-F1") || strings.Count(purchase, "\n") != 3 {
		t.Fatalf("purchase VAT report (one expense and the total):\n%s", purchase)
	}
	if !strings.Contains(files["4-หัก-ณ-ที่จ่าย-ภงด3-2026-10.csv"], "8000.00,5,400.00") {
		t.Fatalf("pnd3 list:\n%s", files["4-หัก-ณ-ที่จ่าย-ภงด3-2026-10.csv"])
	}
	docs := files["5-peak-documents-2026-10.csv"]
	if !strings.Contains(docs, "products.vatType") || !strings.Contains(docs, "IV-20261000001") || !strings.Contains(docs, "20261001") {
		t.Fatalf("PEAK documents:\n%s", docs)
	}
	if !strings.Contains(files["6-peak-payments-2026-10.csv"], "จ่ายเงิน") || files["อ่านก่อน.txt"] == "" {
		t.Fatalf("payments or readme missing: %v", keys(files))
	}
}

func keys(m map[string]string) []string {
	out := []string{}
	for k := range m {
		out = append(out, k)
	}
	return out
}
