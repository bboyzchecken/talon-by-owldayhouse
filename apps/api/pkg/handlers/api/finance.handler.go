package api

import (
	"net/http"
	"sort"
	"time"

	"github.com/labstack/echo/v4"
	"github.com/shopspring/decimal"

	"github.com/owldayhouse/odh-internal-api/pkg/models"
)

// The finance overview (step 8 of docs/internal-tools/document-system.md):
// what came in and went out, what is still owed both ways, the tax of the
// month, and the things someone has to chase. Admin only, read-only. What
// each figure counts is written on models.FinanceStore.

func (s *Server) registerFinanceRoutes(docs *echo.Group) {
	docs.GET("/finance", s.GetFinance, s.IsAdmin())
	docs.GET("/finance/export", s.ExportFinanceMonth, s.IsAdmin())
}

// agingBucket names how late an open item is, from its due date (or its
// date, when it has none) to today.
type agingBucket struct {
	Key    string          `json:"key"`
	Label  string          `json:"label"`
	Count  int             `json:"count"`
	Amount decimal.Decimal `json:"amount"`
}

func newAging() []agingBucket {
	return []agingBucket{
		{Key: "current", Label: "ยังไม่ถึงกำหนด", Amount: decimal.Zero},
		{Key: "d1_30", Label: "เกิน 1–30 วัน", Amount: decimal.Zero},
		{Key: "d31_60", Label: "เกิน 31–60 วัน", Amount: decimal.Zero},
		{Key: "d61_90", Label: "เกิน 61–90 วัน", Amount: decimal.Zero},
		{Key: "d90", Label: "เกิน 90 วัน", Amount: decimal.Zero},
	}
}

func bucketOf(daysLate int) int {
	switch {
	case daysLate <= 0:
		return 0
	case daysLate <= 30:
		return 1
	case daysLate <= 60:
		return 2
	case daysLate <= 90:
		return 3
	}
	return 4
}

// openItemView is an open item as the screen shows it.
type openItemView struct {
	models.OpenItem
	Outstanding decimal.Decimal `json:"outstanding"`
	DaysLate    int             `json:"days_late"`
}

type agingView struct {
	Total   decimal.Decimal `json:"total"`
	Count   int             `json:"count"`
	Overdue models.CountSum `json:"overdue"`
	Buckets []agingBucket   `json:"buckets"`
	// Items: the open items, the latest first, at most 10.
	Items []openItemView `json:"items"`
}

func ageItems(items []models.OpenItem, today time.Time) agingView {
	view := agingView{Total: decimal.Zero, Buckets: newAging(), Items: []openItemView{}, Overdue: models.CountSum{Amount: decimal.Zero}}
	all := make([]openItemView, 0, len(items))
	for _, it := range items {
		due := it.IssuedDate
		if it.DueDate != nil {
			due = *it.DueDate
		}
		late := int(today.Sub(monthDay(due)).Hours() / 24)
		v := openItemView{OpenItem: it, Outstanding: it.NetAmount.Sub(it.Settled), DaysLate: late}
		b := &view.Buckets[bucketOf(late)]
		b.Count++
		b.Amount = b.Amount.Add(v.Outstanding)
		view.Total = view.Total.Add(v.Outstanding)
		view.Count++
		if late > 0 {
			view.Overdue.Count++
			view.Overdue.Amount = view.Overdue.Amount.Add(v.Outstanding)
		}
		all = append(all, v)
	}
	sort.SliceStable(all, func(i, j int) bool { return all[i].DaysLate > all[j].DaysLate })
	if len(all) > 10 {
		all = all[:10]
	}
	view.Items = all
	return view
}

// monthDay is a date column's day at midnight Bangkok, whatever zone it came in.
func monthDay(t time.Time) time.Time {
	return time.Date(t.Year(), t.Month(), t.Day(), 0, 0, 0, 0, startOfToday().Location())
}

// GetFinance handles GET /api/docs/finance?month=YYYY-MM.
func (s *Server) GetFinance(c echo.Context) error {
	month := thisMonth()
	if v := c.QueryParam("month"); v != "" {
		m, err := parseMonth(v)
		if err != nil {
			return badRequest(c, err.Error())
		}
		month = m
	}
	end := month.AddDate(0, 1, 0)
	seriesFrom := month.AddDate(0, -11, 0)
	yearFrom := time.Date(month.Year(), 1, 1, 0, 0, 0, 0, month.Location())

	totals, err := s.FinanceStore.MonthlyTotals(seriesFrom.AddDate(-1, 0, 0), end)
	if err != nil {
		return s.serverError(c, err)
	}
	zero := func(key string) models.MonthTotals {
		if t, ok := totals[key]; ok {
			return t
		}
		return models.MonthTotals{Month: key, Revenue: decimal.Zero, Expense: decimal.Zero, CashIn: decimal.Zero, CashOut: decimal.Zero}
	}
	series := []models.MonthTotals{}
	for m := seriesFrom; m.Before(end); m = m.AddDate(0, 1, 0) {
		series = append(series, zero(monthKey(m)))
	}
	sumRange := func(from, to time.Time) models.MonthTotals {
		out := models.MonthTotals{Revenue: decimal.Zero, Expense: decimal.Zero, CashIn: decimal.Zero, CashOut: decimal.Zero}
		for m := from; m.Before(to); m = m.AddDate(0, 1, 0) {
			t := zero(monthKey(m))
			out.Revenue = out.Revenue.Add(t.Revenue)
			out.Expense = out.Expense.Add(t.Expense)
			out.CashIn = out.CashIn.Add(t.CashIn)
			out.CashOut = out.CashOut.Add(t.CashOut)
		}
		return out
	}
	ytd := sumRange(yearFrom, end)
	lastYtd := sumRange(yearFrom.AddDate(-1, 0, 0), end.AddDate(-1, 0, 0))

	today := startOfToday()
	receivables, err := s.FinanceStore.OpenReceivables()
	if err != nil {
		return s.serverError(c, err)
	}
	payables, err := s.FinanceStore.OpenPayables()
	if err != nil {
		return s.serverError(c, err)
	}
	services, err := s.FinanceStore.RevenueByService(yearFrom, end)
	if err != nil {
		return s.serverError(c, err)
	}
	customers, err := s.FinanceStore.RevenueByCustomer(yearFrom, end, 8)
	if err != nil {
		return s.serverError(c, err)
	}
	jobs, err := s.FinanceStore.JobProfit(yearFrom, end, 10)
	if err != nil {
		return s.serverError(c, err)
	}
	methods, err := s.FinanceStore.CashByMethod(yearFrom, end)
	if err != nil {
		return s.serverError(c, err)
	}
	whtIn, err := s.FinanceStore.WhtCertPending(models.PaymentIn)
	if err != nil {
		return s.serverError(c, err)
	}
	whtOut, err := s.FinanceStore.WhtCertPending(models.PaymentOut)
	if err != nil {
		return s.serverError(c, err)
	}
	noInvoice, err := s.FinanceStore.ExpensesWithoutTaxInvoice()
	if err != nil {
		return s.serverError(c, err)
	}

	// The tax of the chosen month, and whatever is due soon or late.
	book, err := s.taxBook(month, month)
	if err != nil {
		return s.serverError(c, err)
	}
	taxForms := []*taxFormView{}
	for _, form := range models.TaxForms() {
		view, err := s.taxFormView(book, form, month, false)
		if err != nil {
			return s.serverError(c, err)
		}
		taxForms = append(taxForms, view)
	}
	last := thisMonth().AddDate(0, -1, 0)
	deadlines, err := s.taxDeadlines(last.AddDate(0, -11, 0), last)
	if err != nil {
		return s.serverError(c, err)
	}
	taxDueSoon := []taxDue{}
	for _, d := range deadlines {
		if !d.Filed && d.DaysLeft <= taxReminderDays {
			taxDueSoon = append(taxDueSoon, d)
		}
	}

	receivableView := ageItems(receivables, today)
	return c.JSON(http.StatusOK, map[string]interface{}{
		"month":       monthKey(month),
		"as_of":       today.Format("2006-01-02"),
		"series":      series,
		"this_month":  zero(monthKey(month)),
		"last_month":  zero(monthKey(month.AddDate(0, -1, 0))),
		"ytd":         ytd,
		"last_ytd":    lastYtd,
		"receivables": receivableView,
		"payables":    ageItems(payables, today),
		"services":    services,
		"customers":   customers,
		"jobs":        jobs,
		"methods":     methods,
		"tax":         taxForms,
		"follow_up": map[string]interface{}{
			"overdue_invoices": receivableView.Overdue,
			"wht_to_receive":   whtIn,
			"wht_to_send":      whtOut,
			"no_tax_invoice":   noInvoice,
			"tax_due":          taxDueSoon,
		},
	})
}
