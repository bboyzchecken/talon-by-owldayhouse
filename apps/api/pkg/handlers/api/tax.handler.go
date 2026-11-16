package api

import (
	"errors"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/labstack/echo/v4"
	"github.com/shopspring/decimal"

	"github.com/owldayhouse/odh-internal-api/pkg/docmath"
	"github.com/owldayhouse/odh-internal-api/pkg/handlers/api/request"
	"github.com/owldayhouse/odh-internal-api/pkg/leadrules"
	"github.com/owldayhouse/odh-internal-api/pkg/models"
)

// Monthly tax (step 7 of docs/internal-tools/document-system.md): ภ.พ.30,
// ภ.ง.ด.3 and ภ.ง.ด.53 per month, worked out from what is already recorded.
// The system never files or pays: a person does that on the Revenue
// Department's site, then marks the month filed here with the receipt
// attached, which locks the figures. Everything here is the admin's.

var taxFormLabels = map[string]string{
	models.TaxFormPP30:  "ภ.พ.30",
	models.TaxFormPND3:  "ภ.ง.ด.3",
	models.TaxFormPND53: "ภ.ง.ด.53",
}

// taxDueDay is the paper deadline, as a day of the month after the period.
var taxDueDay = map[string]int{
	models.TaxFormPP30:  15,
	models.TaxFormPND3:  7,
	models.TaxFormPND53: 7,
}

// taxReminderDays: a deadline shows on the admin's "today" this many days
// ahead.
const taxReminderDays = 5

func (s *Server) registerTaxRoutes(docs *echo.Group) {
	docs.GET("/tax", s.GetTaxMonth, s.IsAdmin())
	docs.GET("/tax/due", s.ListTaxDue, s.IsAdmin())
	docs.PUT("/tax/settings", s.UpdateTaxSettings, s.IsAdmin())
	docs.POST("/tax/filings", s.OpenTaxFiling, s.IsAdmin())
	docs.POST("/tax/filings/:fid/file", s.FileTaxFiling, s.IsAdmin())
	docs.POST("/tax/filings/:fid/reopen", s.ReopenTaxFiling, s.IsAdmin())
}

// --- months --------------------------------------------------------------------

// monthOf is the first day of t's month. Dates come both from the database
// (midnight UTC) and from parsing (midnight Bangkok); either way the year
// and month on the value are the ones meant, so they are read as they are.
func monthOf(t time.Time) time.Time {
	return time.Date(t.Year(), t.Month(), 1, 0, 0, 0, 0, leadrules.Bangkok)
}

func monthKey(t time.Time) string { return t.Format("2006-01") }

func parseMonth(value string) (time.Time, error) {
	t, err := time.ParseInLocation("2006-01", strings.TrimSpace(value), leadrules.Bangkok)
	if err != nil {
		return time.Time{}, violation("เดือนไม่ถูกต้อง ใช้รูปแบบ ปปปป-ดด")
	}
	return t, nil
}

func thisMonth() time.Time { return monthOf(time.Now().In(leadrules.Bangkok)) }

// taxDueDates: the paper deadline and the later online one.
func taxDueDates(form string, period time.Time, extraDays int) (paper, online time.Time) {
	next := period.AddDate(0, 1, 0)
	paper = time.Date(next.Year(), next.Month(), taxDueDay[form], 0, 0, 0, 0, leadrules.Bangkok)
	return paper, paper.AddDate(0, 0, extraDays)
}

// --- settings ------------------------------------------------------------------

type taxSettings struct {
	// FirstPeriod is set by an admin; Start is what is used: the setting, or
	// the first month with anything taxable, or this month.
	FirstPeriod      string          `json:"first_period"`
	Start            time.Time       `json:"-"`
	OpeningVatCredit decimal.Decimal `json:"opening_vat_credit"`
	EfilingExtraDays int             `json:"efiling_extra_days"`
}

func (s *Server) loadTaxSettings() (*taxSettings, error) {
	out := &taxSettings{OpeningVatCredit: decimal.Zero, EfilingExtraDays: models.DefaultEfilingExtraDays}
	rows, err := s.SettingStore.All()
	if err != nil {
		return nil, err
	}
	for _, row := range rows {
		switch row.Key {
		case models.SettingTaxFirstPeriod:
			if t, err := parseMonth(row.Value); err == nil {
				out.FirstPeriod, out.Start = row.Value, t
			}
		case models.SettingTaxOpeningVatCredit:
			if d, err := decimal.NewFromString(row.Value); err == nil {
				out.OpeningVatCredit = d
			}
		case models.SettingTaxEfilingExtraDays:
			if n, err := strconv.Atoi(row.Value); err == nil {
				out.EfilingExtraDays = n
			}
		}
	}
	if out.FirstPeriod == "" {
		first, err := s.TaxStore.FirstActivity()
		if err != nil {
			return nil, err
		}
		if first != nil {
			out.Start = monthOf(*first)
		} else {
			out.Start = thisMonth()
		}
	}
	return out, nil
}

type taxSettingsBody struct {
	FirstPeriod      string `json:"first_period"`
	OpeningVatCredit string `json:"opening_vat_credit"`
	EfilingExtraDays *int   `json:"efiling_extra_days"`
}

// UpdateTaxSettings handles PUT /api/docs/tax/settings: where this system's
// filings start, the VAT credit carried in, and the online filing allowance.
func (s *Server) UpdateTaxSettings(c echo.Context) error {
	var body taxSettingsBody
	if err := c.Bind(&body); err != nil {
		return badRequest(c, "ข้อมูลที่ส่งมาไม่ถูกต้อง")
	}
	me := actor(c)
	if v := strings.TrimSpace(body.FirstPeriod); v != "" {
		if _, err := parseMonth(v); err != nil {
			return c.JSON(http.StatusUnprocessableEntity, errorBody("งวดแรกต้องเป็นรูปแบบ ปปปป-ดด"))
		}
		if err := s.SettingStore.Set(models.SettingTaxFirstPeriod, v, me.ID); err != nil {
			return s.serverError(c, err)
		}
	}
	if v := strings.TrimSpace(body.OpeningVatCredit); v != "" {
		d, err := decimal.NewFromString(v)
		if err != nil || d.IsNegative() {
			return c.JSON(http.StatusUnprocessableEntity, errorBody("เครดิตภาษียกมาต้องเป็นตัวเลขไม่ติดลบ"))
		}
		if err := s.SettingStore.Set(models.SettingTaxOpeningVatCredit, d.StringFixed(2), me.ID); err != nil {
			return s.serverError(c, err)
		}
	}
	if body.EfilingExtraDays != nil {
		if *body.EfilingExtraDays < 0 || *body.EfilingExtraDays > 31 {
			return c.JSON(http.StatusUnprocessableEntity, errorBody("จำนวนวันที่ยื่นออนไลน์ได้ช้ากว่าต้องอยู่ระหว่าง 0–31"))
		}
		if err := s.SettingStore.Set(models.SettingTaxEfilingExtraDays, strconv.Itoa(*body.EfilingExtraDays), me.ID); err != nil {
			return s.serverError(c, err)
		}
	}
	settings, err := s.loadTaxSettings()
	if err != nil {
		return s.serverError(c, err)
	}
	return c.JSON(http.StatusOK, settings)
}

// --- the figures ---------------------------------------------------------------

// taxBook is every form's figures for a run of months, with the filings.
type taxBook struct {
	settings *taxSettings
	figures  map[string]map[string]models.TaxFigures // form → "YYYY-MM"
	filings  map[string]map[string]*models.TaxFiling
}

func (b *taxBook) filing(form string, period time.Time) *models.TaxFiling {
	return b.filings[form][monthKey(period)]
}

// required: ภ.พ.30 is filed every month, even with nothing in it, from the
// first period on; ภ.ง.ด.3/53 only for a month in which tax was withheld.
func (b *taxBook) required(form string, period time.Time) bool {
	if period.Before(b.settings.Start) {
		return false
	}
	if form == models.TaxFormPP30 {
		return true
	}
	return b.figures[form][monthKey(period)].TaxAmount.IsPositive() || b.filing(form, period) != nil
}

// taxBook works out every month from the first period (or from `from`, if
// earlier) up to `last`. The VAT credit runs as a chain: each month starts
// with what the month before carried — as filed, if it was filed — and the
// first period starts with the opening credit.
func (s *Server) taxBook(from, last time.Time) (*taxBook, error) {
	settings, err := s.loadTaxSettings()
	if err != nil {
		return nil, err
	}
	start := settings.Start
	if from.Before(start) {
		start = from
	}
	if last.Before(start) {
		start = last
	}
	end := last.AddDate(0, 1, 0)
	output, err := s.TaxStore.OutputVat(start, end)
	if err != nil {
		return nil, err
	}
	input, err := s.TaxStore.InputVat(start, end)
	if err != nil {
		return nil, err
	}
	withheld, err := s.TaxStore.Withheld(start, end)
	if err != nil {
		return nil, err
	}
	filings, err := s.TaxStore.Filings(start, end)
	if err != nil {
		return nil, err
	}
	book := &taxBook{
		settings: settings,
		figures:  map[string]map[string]models.TaxFigures{},
		filings:  map[string]map[string]*models.TaxFiling{},
	}
	for _, form := range models.TaxForms() {
		book.figures[form] = map[string]models.TaxFigures{}
		book.filings[form] = map[string]*models.TaxFiling{}
	}
	for _, f := range filings {
		book.filings[f.Form][monthKey(f.Period)] = f
	}

	carried := decimal.Zero
	for m := start; !m.After(last); m = m.AddDate(0, 1, 0) {
		key := monthKey(m)
		vat := models.TaxFigures{
			OutputVat: output[key].Amount,
			InputVat:  input[key].Amount,
			LineCount: output[key].Count + input[key].Count,
		}
		switch {
		case m.Before(settings.Start):
			// Filed elsewhere: shown, but nothing runs into the chain.
		case m.Equal(settings.Start):
			vat.CreditBroughtForward = settings.OpeningVatCredit
		default:
			vat.CreditBroughtForward = carried
		}
		net := vat.OutputVat.Sub(vat.InputVat).Sub(vat.CreditBroughtForward)
		if net.IsNegative() {
			vat.TaxAmount, vat.CreditCarried = decimal.Zero, net.Neg()
		} else {
			vat.TaxAmount, vat.CreditCarried = net, decimal.Zero
		}
		book.figures[models.TaxFormPP30][key] = vat
		if f := book.filings[models.TaxFormPP30][key]; f != nil && f.Status == models.TaxFilingFiled {
			carried = f.CreditCarried
		} else {
			carried = vat.CreditCarried
		}
		if m.Before(settings.Start) {
			carried = decimal.Zero
		}

		for _, form := range []string{models.TaxFormPND3, models.TaxFormPND53} {
			w := withheld[form][key]
			book.figures[form][key] = models.TaxFigures{TaxAmount: w.Amount, LineCount: w.Count}
		}
	}
	return book, nil
}

// --- reading -------------------------------------------------------------------

type taxFormView struct {
	Form           string                  `json:"form"`
	Label          string                  `json:"label"`
	Period         string                  `json:"period"`
	DueDate        string                  `json:"due_date"`
	EfilingDueDate string                  `json:"efiling_due_date"`
	Required       bool                    `json:"required"`
	BeforeFirst    bool                    `json:"before_first"`
	Closed         bool                    `json:"closed"` // the month is over, so it can be filed
	Figures        models.TaxFigures       `json:"figures"`
	Filing         *models.TaxFiling       `json:"filing"`
	Differs        bool                    `json:"differs"`
	Lines          []models.TaxLine        `json:"lines"`
	Events         []*models.DocumentEvent `json:"events"`
}

func (s *Server) taxFormView(book *taxBook, form string, period time.Time, withLines bool) (*taxFormView, error) {
	paper, online := taxDueDates(form, period, book.settings.EfilingExtraDays)
	view := &taxFormView{
		Form: form, Label: taxFormLabels[form], Period: monthKey(period),
		DueDate: paper.Format("2006-01-02"), EfilingDueDate: online.Format("2006-01-02"),
		Required:    book.required(form, period),
		BeforeFirst: period.Before(book.settings.Start),
		Closed:      period.Before(thisMonth()),
		Figures:     book.figures[form][monthKey(period)],
		Filing:      book.filing(form, period),
		Lines:       []models.TaxLine{},
		Events:      []*models.DocumentEvent{},
	}
	if f := view.Filing; f != nil {
		view.Differs = f.Status == models.TaxFilingFiled && !f.TaxFigures.Equal(view.Figures)
		events, err := s.TaxStore.Events(f.ID)
		if err != nil {
			return nil, err
		}
		view.Events = events
	}
	if withLines {
		lines, err := s.TaxStore.Lines(form, period)
		if err != nil {
			return nil, err
		}
		view.Lines = lines
	}
	return view, nil
}

// GetTaxMonth handles GET /api/docs/tax?month=YYYY-MM: the three forms of
// one month, with the documents behind each figure.
func (s *Server) GetTaxMonth(c echo.Context) error {
	period := thisMonth().AddDate(0, -1, 0)
	if v := c.QueryParam("month"); v != "" {
		p, err := parseMonth(v)
		if err != nil {
			return badRequest(c, err.Error())
		}
		period = p
	}
	book, err := s.taxBook(period, period)
	if err != nil {
		return s.serverError(c, err)
	}
	forms := []*taxFormView{}
	for _, form := range models.TaxForms() {
		view, err := s.taxFormView(book, form, period, true)
		if err != nil {
			return s.serverError(c, err)
		}
		forms = append(forms, view)
	}
	return c.JSON(http.StatusOK, map[string]interface{}{
		"month":        monthKey(period),
		"first_period": monthKey(book.settings.Start),
		"settings":     book.settings,
		"forms":        forms,
	})
}

// taxDue is a filing still to make, for "today" and the calendar.
type taxDue struct {
	Form           string          `json:"form"`
	Label          string          `json:"label"`
	Period         string          `json:"period"`
	DueDate        string          `json:"due_date"`
	EfilingDueDate string          `json:"efiling_due_date"`
	DaysLeft       int             `json:"days_left"`
	Filed          bool            `json:"filed"`
	TaxAmount      decimal.Decimal `json:"tax_amount"`
	CreditCarried  decimal.Decimal `json:"credit_carried"`
}

// taxDeadlines lists every required filing of the months from..last.
func (s *Server) taxDeadlines(from, last time.Time) ([]taxDue, error) {
	book, err := s.taxBook(from, last)
	if err != nil {
		return nil, err
	}
	today := startOfToday()
	out := []taxDue{}
	for m := from; !m.After(last); m = m.AddDate(0, 1, 0) {
		for _, form := range models.TaxForms() {
			if !book.required(form, m) {
				continue
			}
			paper, online := taxDueDates(form, m, book.settings.EfilingExtraDays)
			fig := book.figures[form][monthKey(m)]
			f := book.filing(form, m)
			out = append(out, taxDue{
				Form: form, Label: taxFormLabels[form], Period: monthKey(m),
				DueDate: paper.Format("2006-01-02"), EfilingDueDate: online.Format("2006-01-02"),
				DaysLeft:  int(online.Sub(today).Hours() / 24),
				Filed:     f != nil && f.Status == models.TaxFilingFiled,
				TaxAmount: fig.TaxAmount, CreditCarried: fig.CreditCarried,
			})
		}
	}
	return out, nil
}

// ListTaxDue handles GET /api/docs/tax/due: filings not yet made whose
// online deadline is at most five days away, or already past (the last
// twelve months).
func (s *Server) ListTaxDue(c echo.Context) error {
	last := thisMonth().AddDate(0, -1, 0)
	all, err := s.taxDeadlines(last.AddDate(0, -11, 0), last)
	if err != nil {
		return s.serverError(c, err)
	}
	due := []taxDue{}
	for _, d := range all {
		if !d.Filed && d.DaysLeft <= taxReminderDays {
			due = append(due, d)
		}
	}
	return c.JSON(http.StatusOK, map[string]interface{}{"items": due})
}

// --- filing --------------------------------------------------------------------

type openFilingBody struct {
	Form  string `json:"form"`
	Month string `json:"month"`
}

// OpenTaxFiling handles POST /api/docs/tax/filings: the row for a form and
// month, created if needed, so the receipt can be attached to it.
func (s *Server) OpenTaxFiling(c echo.Context) error {
	var body openFilingBody
	if err := c.Bind(&body); err != nil {
		return badRequest(c, "ข้อมูลที่ส่งมาไม่ถูกต้อง")
	}
	if taxFormLabels[body.Form] == "" {
		return badRequest(c, "แบบภาษีไม่ถูกต้อง")
	}
	period, err := parseMonth(body.Month)
	if err != nil {
		return badRequest(c, err.Error())
	}
	if !period.Before(thisMonth()) {
		return c.JSON(http.StatusUnprocessableEntity, errorBody("ยื่นได้หลังสิ้นเดือนของงวดนั้น"))
	}
	row, err := s.TaxStore.EnsureFiling(body.Form, period)
	if err != nil {
		return s.serverError(c, err)
	}
	return c.JSON(http.StatusOK, row)
}

func (s *Server) loadTaxFiling(c echo.Context) (*models.TaxFiling, error) {
	id, err := request.UintParam(c, "fid")
	if err != nil {
		return nil, responded(badRequest(c, "รหัสงวดภาษีไม่ถูกต้อง"))
	}
	row, err := s.TaxStore.FindFiling(id)
	if err != nil {
		if isNotFound(err) {
			return nil, responded(notFound(c, "ไม่พบงวดภาษีนี้"))
		}
		return nil, responded(s.serverError(c, err))
	}
	return row, nil
}

func (s *Server) taxError(c echo.Context, err error) error {
	switch {
	case errors.Is(err, models.ErrTaxFilingFiled), errors.Is(err, models.ErrTaxFilingNotFiled):
		return conflict(c, errorBody(err.Error()))
	case errors.Is(err, models.ErrNoTaxReceipt):
		return c.JSON(http.StatusUnprocessableEntity, errorBody(err.Error()))
	}
	return s.documentError(c, err)
}

type fileTaxBody struct {
	PaidAmount decimal.Decimal `json:"paid_amount"`
	PaidDate   string          `json:"paid_date"`
	Reference  string          `json:"reference"`
	Note       string          `json:"note"`
}

// FileTaxFiling handles POST /api/docs/tax/filings/:fid/file: the person
// filed (and paid) on the Revenue Department's site. The figures as they
// stand now are locked onto the row.
func (s *Server) FileTaxFiling(c echo.Context) error {
	row, err := s.loadTaxFiling(c)
	if err != nil {
		return err
	}
	var body fileTaxBody
	if err := c.Bind(&body); err != nil {
		return badRequest(c, "ข้อมูลที่ส่งมาไม่ถูกต้อง")
	}
	if !monthOf(row.Period).Before(thisMonth()) {
		return c.JSON(http.StatusUnprocessableEntity, errorBody("ยื่นได้หลังสิ้นเดือนของงวดนั้น"))
	}
	paidDate, err := parseDay(body.PaidDate)
	if err != nil {
		return s.taxError(c, err)
	}
	if paidDate == nil {
		return c.JSON(http.StatusUnprocessableEntity, errorBody("ใส่วันที่ยื่น/ชำระ"))
	}
	if paidDate.After(startOfToday()) {
		return c.JSON(http.StatusUnprocessableEntity, errorBody("วันที่ยื่นเป็นวันในอนาคตไม่ได้"))
	}
	paid := body.PaidAmount.Round(2)
	if paid.IsNegative() {
		return c.JSON(http.StatusUnprocessableEntity, errorBody("ยอดที่ชำระติดลบไม่ได้"))
	}
	period := monthOf(row.Period)
	book, err := s.taxBook(period, period)
	if err != nil {
		return s.serverError(c, err)
	}
	figures := book.figures[row.Form][monthKey(period)]
	updated, err := s.TaxStore.MarkFiled(row.ID, actor(c).ID, figures, models.TaxFiling{
		PaidAmount: paid, PaidDate: paidDate,
		Reference: cut(body.Reference, 100), Note: cut(body.Note, 500),
	})
	if err != nil {
		return s.taxError(c, err)
	}
	return c.JSON(http.StatusOK, updated)
}

// ReopenTaxFiling handles POST /api/docs/tax/filings/:fid/reopen: a filing
// marked by mistake, or one to file again (an additional return). Logged.
func (s *Server) ReopenTaxFiling(c echo.Context) error {
	row, err := s.loadTaxFiling(c)
	if err != nil {
		return err
	}
	var body voidBody
	if err := c.Bind(&body); err != nil {
		return badRequest(c, "ข้อมูลที่ส่งมาไม่ถูกต้อง")
	}
	reason := cut(body.Reason, 400)
	if reason == "" {
		return badRequest(c, "ต้องระบุเหตุผลที่เปิดแก้ไข")
	}
	updated, err := s.TaxStore.Reopen(row.ID, actor(c).ID, reason)
	if err != nil {
		return s.taxError(c, err)
	}
	return c.JSON(http.StatusOK, updated)
}

// checkTaxFilingFile: a filing's receipt is the admin's, and the row must exist.
func (s *Server) checkTaxFilingFile(c echo.Context, filingID uint) error {
	if !actor(c).IsAdmin() {
		return responded(forbidden(c, "หลักฐานการยื่นภาษีเปิดได้เฉพาะแอดมิน"))
	}
	if _, err := s.TaxStore.FindFiling(filingID); err != nil {
		if isNotFound(err) {
			return responded(notFound(c, "ไม่พบงวดภาษีนี้"))
		}
		return responded(s.serverError(c, err))
	}
	return nil
}

// --- months already filed ------------------------------------------------------

// taxKey is one form of one month that a change would move.
type taxKey struct {
	form   string
	period time.Time
}

// documentTaxKeys: the filing an issued (or about to be issued) document
// counts in, if any.
func documentTaxKeys(d *models.Document) []taxKey {
	switch {
	case d.DocType == models.DocCreditNote, d.DocType == models.DocDebitNote,
		(d.DocType == models.DocReceipt || d.DocType == models.DocTaxInvoice) && d.IsTaxInvoice:
		return []taxKey{{models.TaxFormPP30, monthOf(d.IssuedDate)}}
	case d.DocType == models.DocExpense && d.ReceivedTaxInvoiceNumber != "":
		claim := d.IssuedDate
		if d.ReceivedTaxInvoiceDate != nil {
			claim = *d.ReceivedTaxInvoiceDate
		}
		if d.InputVatPeriod != nil {
			claim = *d.InputVatPeriod
		}
		return []taxKey{{models.TaxFormPP30, monthOf(claim)}}
	}
	return nil
}

// confirmFiledParam is how the person says "yes, change a filed month".
const confirmFiledParam = "confirm_filed"

// guardFiledPeriods refuses a change that would move the figures of a month
// already filed, unless the person confirmed it (?confirm_filed=1). On a
// confirmed change it returns the note to log on the document.
func (s *Server) guardFiledPeriods(c echo.Context, keys []taxKey) (string, error) {
	filed := []string{}
	seen := map[string]bool{}
	for _, k := range keys {
		id := k.form + monthKey(k.period)
		if seen[id] {
			continue
		}
		seen[id] = true
		rows, err := s.TaxStore.Filings(k.period, k.period.AddDate(0, 1, 0))
		if err != nil {
			return "", responded(s.serverError(c, err))
		}
		for _, r := range rows {
			if r.Form == k.form && r.Status == models.TaxFilingFiled {
				filed = append(filed, fmt.Sprintf("%s งวด %s", taxFormLabels[k.form], k.period.Format("01/2006")))
			}
		}
	}
	if len(filed) == 0 {
		return "", nil
	}
	if c.QueryParam(confirmFiledParam) != "1" {
		return "", responded(conflict(c, map[string]interface{}{
			"error": "รายการนี้อยู่ในงวดภาษีที่บันทึกว่ายื่นแล้ว (" + strings.Join(filed, ", ") +
				") ถ้าทำต่อ ยอดของงวดนั้นจะไม่ตรงกับที่ยื่น และอาจต้องยื่นเพิ่มเติม",
			"code":    "period_filed",
			"periods": filed,
		}))
	}
	return "แก้รายการในงวดภาษีที่ยื่นแล้ว: " + strings.Join(filed, ", "), nil
}

// logFiledEdit records a confirmed change to a filed month on the document.
func (s *Server) logFiledEdit(documentID, userID uint, note string) {
	if note == "" {
		return
	}
	if err := s.DocumentStore.AddEvent(&models.DocumentEvent{
		DocumentID: &documentID, UserID: userID, Action: models.DocEventFiledPeriod, Note: cut(note, 1000),
	}); err != nil {
		s.Log.WithError(err).Error("failed to log a change to a filed tax month")
	}
}

// taxAmountNote is how a deadline reads on the calendar.
func taxAmountNote(d taxDue) string {
	switch {
	case d.Filed:
		return "บันทึกว่ายื่นแล้ว"
	case d.TaxAmount.IsPositive():
		return "ยังไม่ยื่น · ต้องชำระ " + docmath.Baht(d.TaxAmount) + " บาท"
	case d.CreditCarried.IsPositive():
		return "ยังไม่ยื่น · เครดิตยกไป " + docmath.Baht(d.CreditCarried) + " บาท"
	}
	return "ยังไม่ยื่น · ไม่มียอดชำระ"
}
