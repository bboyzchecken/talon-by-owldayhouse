package api

import (
	"errors"
	"fmt"
	"net/http"
	"regexp"
	"strings"
	"time"

	"github.com/labstack/echo/v4"
	"github.com/lib/pq"
	"github.com/shopspring/decimal"

	"github.com/owldayhouse/odh-internal-api/pkg/docmath"
	"github.com/owldayhouse/odh-internal-api/pkg/docnumber"
	"github.com/owldayhouse/odh-internal-api/pkg/handlers/api/request"
	"github.com/owldayhouse/odh-internal-api/pkg/leadrules"
	"github.com/owldayhouse/odh-internal-api/pkg/models"
)

// The document tool: quotations, invoices, receipts/tax invoices, notes and
// expenses (docs/internal-tools/document-system.md).
//
// Who may do what:
//   - An admin: everything.
//   - A sales account: quotations, invoices and billing notes, for customers
//     linked to a lead it owns, and it sees only those documents. Receipts and
//     tax invoices, credit and debit notes, and expenses are money and tax,
//     and stay with an admin.

// salesDocTypes are the types a sales account may create and issue.
var salesDocTypes = map[int]bool{
	models.DocQuotation:   true,
	models.DocInvoice:     true,
	models.DocBillingNote: true,
}

// docTypeLabels name each type in messages and e-mail drafts.
var docTypeLabels = map[int]string{
	models.DocQuotation:   "ใบเสนอราคา",
	models.DocInvoice:     "ใบแจ้งหนี้",
	models.DocReceipt:     "ใบเสร็จรับเงิน/ใบกำกับภาษี",
	models.DocTaxInvoice:  "ใบกำกับภาษี",
	models.DocCreditNote:  "ใบลดหนี้",
	models.DocBillingNote: "ใบวางบิล",
	models.DocDebitNote:   "ใบเพิ่มหนี้",
	models.DocExpense:     "รายจ่าย",
}

// nextDocTypes is the document chain: which documents can be made from an
// issued one. It follows PEAK's createbyquotation / createbyinvoice.
var nextDocTypes = map[int][]int{
	// A receipt is not on this list: it comes from recording a payment.
	models.DocQuotation:  {models.DocInvoice, models.DocBillingNote},
	models.DocInvoice:    {models.DocBillingNote},
	models.DocReceipt:    {models.DocCreditNote, models.DocDebitNote},
	models.DocTaxInvoice: {models.DocCreditNote, models.DocDebitNote},
}

const maxDocumentLines = 200

func (s *Server) registerDocumentRoutes(api *echo.Group) {
	docs := api.Group("/docs")
	docs.GET("", s.ListDocuments)
	docs.POST("", s.CreateDocument)
	// Static segments before /:id.
	docs.POST("/calculate", s.CalculateDocument)
	s.registerRegisterRoutes(docs)
	s.registerPaymentRoutes(docs)
	s.registerTaxRoutes(docs)
	s.registerFinanceRoutes(docs)
	docs.GET("/:id", s.GetDocument)
	docs.PUT("/:id", s.UpdateDocument)
	docs.DELETE("/:id", s.DeleteDocument)
	docs.POST("/:id/issue", s.IssueDocument)
	docs.POST("/:id/void", s.VoidDocument)
	docs.POST("/:id/next", s.CreateNextDocument)
	docs.POST("/:id/email-draft", s.DraftDocumentEmail)
	docs.POST("/:id/sent", s.MarkDocumentSent)
}

// --- permissions -------------------------------------------------------------

func (s *Server) leadOwner(leadID *uint) (*uint, error) {
	if leadID == nil {
		return nil, nil
	}
	lead, err := s.LeadStore.Find(*leadID)
	if err != nil {
		if isNotFound(err) {
			return nil, nil
		}
		return nil, err
	}
	return lead.OwnerUserID, nil
}

// canWorkOn reports whether the actor may create or change a document of
// this type for this lead.
func (s *Server) canWorkOn(me leadrules.Actor, docType int, leadID *uint) (bool, error) {
	if me.IsAdmin() {
		return true, nil
	}
	if !salesDocTypes[docType] {
		return false, nil
	}
	owner, err := s.leadOwner(leadID)
	if err != nil {
		return false, err
	}
	return owner != nil && *owner == me.ID, nil
}

// canSee reports whether the actor may read the document.
func (s *Server) canSee(me leadrules.Actor, doc *models.Document) (bool, error) {
	if me.IsAdmin() {
		return true, nil
	}
	owner, err := s.leadOwner(doc.LeadID)
	if err != nil {
		return false, err
	}
	return owner != nil && *owner == me.ID, nil
}

const noDocAccess = "เอกสารนี้ต้องให้แอดมิน หรือเซลส์ที่ดูแลลูกค้ารายนี้เป็นคนจัดการ"

// loadDocument reads :id and checks the actor may see it. On failure it has
// already written the response, and returns a nil document.
func (s *Server) loadDocument(c echo.Context) (*models.Document, error) {
	id, err := request.UintParam(c, "id")
	if err != nil {
		return nil, badRequest(c, "รหัสเอกสารไม่ถูกต้อง")
	}
	doc, err := s.DocumentStore.Find(id)
	if err != nil {
		if isNotFound(err) {
			return nil, notFound(c, "ไม่พบเอกสารนี้")
		}
		return nil, s.serverError(c, err)
	}
	ok, err := s.canSee(actor(c), doc)
	if err != nil {
		return nil, s.serverError(c, err)
	}
	if !ok {
		// Not 403: a sales account should not learn which numbers exist.
		return nil, notFound(c, "ไม่พบเอกสารนี้")
	}
	return doc, nil
}

func (s *Server) documentError(c echo.Context, err error) error {
	switch {
	case errors.Is(err, models.ErrDocumentNotDraft), errors.Is(err, models.ErrDocumentNotIssued),
		errors.Is(err, models.ErrHasPayments):
		return conflict(c, errorBody(err.Error()))
	case errors.Is(err, docnumber.ErrNoNumbering), errors.Is(err, docnumber.ErrSequenceFull):
		return conflict(c, errorBody(err.Error()))
	case isNotFound(err):
		return notFound(c, "ไม่พบเอกสารนี้")
	}
	var rule ruleViolation
	if errors.As(err, &rule) {
		return c.JSON(http.StatusUnprocessableEntity, errorBody(rule.Error()))
	}
	return s.serverError(c, err)
}

// ruleViolation is a document rule a person can fix (a missing tax ID, a
// due date before the issue date).
type ruleViolation struct{ message string }

func (r ruleViolation) Error() string { return r.message }

func violation(format string, args ...interface{}) error {
	return ruleViolation{fmt.Sprintf(format, args...)}
}

// --- input -------------------------------------------------------------------

type documentLineBody struct {
	ProductID       *uint           `json:"product_id"`
	Description     string          `json:"description"`
	IsDescription   bool            `json:"is_description"`
	Quantity        decimal.Decimal `json:"quantity"`
	UnitName        string          `json:"unit_name"`
	Price           decimal.Decimal `json:"price"`
	Discount        string          `json:"discount"`
	VatType         int             `json:"vat_type"`
	WithholdingRate decimal.Decimal `json:"withholding_rate"`
}

type documentBody struct {
	DocType      int                `json:"doc_type"`
	ContactID    uint               `json:"contact_id"`
	IssuedDate   string             `json:"issued_date"` // YYYY-MM-DD
	DueDate      string             `json:"due_date"`
	Reference    string             `json:"reference"`
	Remark       string             `json:"remark"`
	Tags         []string           `json:"tags"`
	TaxStatus    int                `json:"tax_status"`
	IsTaxInvoice *bool              `json:"is_tax_invoice"`
	Discount     string             `json:"discount"` // document discount: "500" or "5%"
	Items        []documentLineBody `json:"items"`

	// Expenses only.
	// LeadID ties the expense to a customer's job, for its cost; a vendor
	// contact belongs to no lead of its own.
	LeadID                   *uint  `json:"lead_id"`
	ReceivedTaxInvoiceNumber string `json:"received_tax_invoice_number"`
	ReceivedTaxInvoiceDate   string `json:"received_tax_invoice_date"`
	InputVatPeriod           string `json:"input_vat_period"` // YYYY-MM
}

func parseDay(value string) (*time.Time, error) {
	value = strings.TrimSpace(value)
	if value == "" {
		return nil, nil
	}
	day, err := time.ParseInLocation("2006-01-02", value, leadrules.Bangkok)
	if err != nil {
		return nil, violation("วันที่ %q ไม่ถูกต้อง ใช้รูปแบบ ปปปป-ดด-วว", value)
	}
	return &day, nil
}

func cut(value string, limit int) string {
	value = strings.TrimSpace(value)
	if runes := []rune(value); len(runes) > limit {
		return string(runes[:limit])
	}
	return value
}

// buildDocument turns a body into a document with its amounts computed. The
// contact decides the lead. Nothing is saved here.
func (s *Server) buildDocument(body documentBody) (*models.Document, error) {
	if _, ok := docTypeLabels[body.DocType]; !ok {
		return nil, violation("ประเภทเอกสารไม่ถูกต้อง")
	}
	if err := receiptsOnlyFromPayments(body.DocType); err != nil {
		return nil, err
	}
	if len(body.Items) == 0 {
		return nil, violation("เอกสารต้องมีรายการอย่างน้อย 1 บรรทัด")
	}
	if len(body.Items) > maxDocumentLines {
		return nil, violation("เอกสารหนึ่งใบมีได้ไม่เกิน %d บรรทัด", maxDocumentLines)
	}
	contact, err := s.DocumentStore.FindContact(body.ContactID)
	if err != nil {
		if isNotFound(err) {
			return nil, violation("ไม่พบผู้ติดต่อที่เลือก")
		}
		return nil, err
	}
	if body.DocType == models.DocExpense && contact.FinanceSide == models.FinanceCustomer {
		return nil, violation("รายจ่ายต้องเลือกผู้ติดต่อที่เป็นผู้ขาย")
	}
	if body.DocType != models.DocExpense && contact.FinanceSide == models.FinanceVendor {
		return nil, violation("เอกสารขายต้องเลือกผู้ติดต่อที่เป็นลูกค้า")
	}

	issued, err := parseDay(body.IssuedDate)
	if err != nil {
		return nil, err
	}
	if issued == nil {
		today := startOfToday()
		issued = &today
	}
	due, err := parseDay(body.DueDate)
	if err != nil {
		return nil, err
	}
	if due != nil && due.Before(*issued) {
		return nil, violation("วันครบกำหนดต้องไม่ก่อนวันที่ออกเอกสาร")
	}

	lines := make([]docmath.Line, len(body.Items))
	for i, item := range body.Items {
		vat := item.VatType
		if vat == 0 && !item.IsDescription {
			vat = models.VatSeven
		}
		lines[i] = docmath.Line{
			IsDescription:   item.IsDescription,
			Quantity:        item.Quantity,
			Price:           item.Price,
			Discount:        item.Discount,
			VatType:         vat,
			WithholdingRate: item.WithholdingRate,
		}
		if item.IsDescription && strings.TrimSpace(item.Description) == "" {
			return nil, violation("บรรทัด %d: บรรทัดข้อความต้องมีข้อความ", i+1)
		}
	}
	result, err := docmath.Compute(body.TaxStatus, lines, body.Discount)
	if err != nil {
		return nil, ruleViolation{err.Error()}
	}

	isTaxInvoice := body.DocType == models.DocReceipt || body.DocType == models.DocTaxInvoice
	if body.IsTaxInvoice != nil && body.DocType == models.DocReceipt {
		isTaxInvoice = *body.IsTaxInvoice
	}

	doc := &models.Document{
		DocType:          body.DocType,
		ContactID:        contact.ID,
		LeadID:           contact.LeadID,
		IssuedDate:       *issued,
		DueDate:          due,
		Reference:        cut(body.Reference, 200),
		Remark:           cut(body.Remark, 2000),
		Tags:             pq.StringArray(body.Tags),
		TaxStatus:        body.TaxStatus,
		IsTaxInvoice:     isTaxInvoice,
		DiscountTotal:    result.DiscountTotal,
		PreTaxAmount:     result.PreTaxAmount,
		VatAmount:        result.VatAmount,
		NetAmount:        result.NetAmount,
		WithholdingTotal: result.WithholdingTotal,
	}
	if doc.Tags == nil {
		doc.Tags = pq.StringArray{}
	}
	for i, item := range body.Items {
		vat := lines[i].VatType
		doc.Items = append(doc.Items, models.DocumentItem{
			ProductID:         item.ProductID,
			Description:       cut(item.Description, 2000),
			IsDescription:     item.IsDescription,
			Quantity:          item.Quantity,
			UnitName:          cut(item.UnitName, 50),
			Price:             item.Price,
			Discount:          cut(item.Discount, 20),
			VatType:           vat,
			WithholdingRate:   item.WithholdingRate,
			LineAmount:        result.Lines[i].LineAmount,
			WithholdingAmount: result.Lines[i].WithholdingAmount,
		})
	}

	if body.DocType == models.DocExpense {
		if err := applyReceivedTaxInvoice(doc, body); err != nil {
			return nil, err
		}
		doc.LeadID = nil
		if body.LeadID != nil && *body.LeadID != 0 {
			if err := s.checkLead(body.LeadID); err != nil {
				return nil, err
			}
			doc.LeadID = body.LeadID
		}
	}
	return doc, nil
}

// applyReceivedTaxInvoice records the vendor's tax invoice on an expense.
// Input VAT may be claimed in the invoice's month or up to six months after
// it; the default is the invoice's month.
func applyReceivedTaxInvoice(doc *models.Document, body documentBody) error {
	doc.ReceivedTaxInvoiceNumber = cut(body.ReceivedTaxInvoiceNumber, 60)
	date, err := parseDay(body.ReceivedTaxInvoiceDate)
	if err != nil {
		return err
	}
	doc.ReceivedTaxInvoiceDate = date
	if doc.ReceivedTaxInvoiceNumber == "" {
		doc.ReceivedTaxInvoiceDate = nil
		doc.InputVatPeriod = nil
		return nil
	}
	if date == nil {
		return violation("ใส่วันที่ของใบกำกับภาษีที่ได้รับด้วย")
	}
	invoiceMonth := time.Date(date.Year(), date.Month(), 1, 0, 0, 0, 0, leadrules.Bangkok)
	period := invoiceMonth
	if raw := strings.TrimSpace(body.InputVatPeriod); raw != "" {
		p, err := time.ParseInLocation("2006-01", raw, leadrules.Bangkok)
		if err != nil {
			return violation("เดือนที่ใช้ภาษีซื้อ %q ไม่ถูกต้อง ใช้รูปแบบ ปปปป-ดด", raw)
		}
		period = p
	}
	if period.Before(invoiceMonth) || period.After(invoiceMonth.AddDate(0, 6, 0)) {
		return violation("ใช้ภาษีซื้อได้ตั้งแต่เดือนของใบกำกับภาษีจนถึง 6 เดือนหลังจากนั้น")
	}
	doc.InputVatPeriod = &period
	return nil
}

// --- handlers ----------------------------------------------------------------

// ListDocuments handles GET /api/docs.
func (s *Server) ListDocuments(c echo.Context) error {
	me := actor(c)
	filter := models.DocumentFilter{
		Status: c.QueryParam("status"),
		Search: c.QueryParam("search"),
	}
	if t := request.QueryUint(c, "doc_type"); t != nil {
		filter.DocType = int(*t)
	}
	if id := request.QueryUint(c, "contact_id"); id != nil {
		filter.ContactID = *id
	}
	if id := request.QueryUint(c, "lead_id"); id != nil {
		filter.LeadID = *id
	}
	if p := request.QueryUint(c, "page"); p != nil {
		filter.Page = int(*p)
	}
	if l := request.QueryUint(c, "limit"); l != nil {
		filter.Limit = int(*l)
	}
	if month := c.QueryParam("month"); month != "" {
		start, err := time.ParseInLocation("2006-01", month, leadrules.Bangkok)
		if err != nil {
			return badRequest(c, "เดือนไม่ถูกต้อง ใช้รูปแบบ ปปปป-ดด")
		}
		end := start.AddDate(0, 1, -1)
		filter.From, filter.To = &start, &end
	}
	if !me.IsAdmin() {
		filter.OwnerUserID = &me.ID
	}

	rows, total, err := s.DocumentStore.List(filter)
	if err != nil {
		return s.serverError(c, err)
	}
	return c.JSON(http.StatusOK, map[string]interface{}{"items": rows, "total": total})
}

// GetDocument handles GET /api/docs/:id, with its history.
func (s *Server) GetDocument(c echo.Context) error {
	doc, err := s.loadDocument(c)
	if doc == nil {
		return err
	}
	events, err := s.DocumentStore.ListEvents(doc.ID)
	if err != nil {
		return s.serverError(c, err)
	}
	payments, err := s.documentPayments(doc)
	if err != nil {
		return s.serverError(c, err)
	}
	return c.JSON(http.StatusOK, map[string]interface{}{
		"document": doc,
		"events":   events,
		"next":     nextDocTypes[doc.DocType],
		"payments": payments,
	})
}

// CreateDocument handles POST /api/docs: a new draft, with no number.
func (s *Server) CreateDocument(c echo.Context) error {
	var body documentBody
	if err := c.Bind(&body); err != nil {
		return badRequest(c, "ข้อมูลที่ส่งมาไม่ถูกต้อง")
	}
	doc, err := s.buildDocument(body)
	if err != nil {
		return s.documentError(c, err)
	}
	me := actor(c)
	ok, err := s.canWorkOn(me, doc.DocType, doc.LeadID)
	if err != nil {
		return s.serverError(c, err)
	}
	if !ok {
		return forbidden(c, noDocAccess)
	}
	if err := s.DocumentStore.CreateDraft(doc, me.ID); err != nil {
		return s.serverError(c, err)
	}
	created, err := s.DocumentStore.Find(doc.ID)
	if err != nil {
		return s.serverError(c, err)
	}
	return c.JSON(http.StatusCreated, created)
}

// UpdateDocument handles PUT /api/docs/:id: replace a draft. An issued
// document cannot be edited; it is voided and issued again.
func (s *Server) UpdateDocument(c echo.Context) error {
	current, err := s.loadDocument(c)
	if current == nil {
		return err
	}
	if current.Status != models.DocStatusDraft {
		return conflict(c, errorBody(models.ErrDocumentNotDraft.Error()))
	}
	var body documentBody
	if err := c.Bind(&body); err != nil {
		return badRequest(c, "ข้อมูลที่ส่งมาไม่ถูกต้อง")
	}
	body.DocType = current.DocType // a draft does not change type
	doc, err := s.buildDocument(body)
	if err != nil {
		return s.documentError(c, err)
	}
	me := actor(c)
	// The actor must be allowed on both the old customer and the new one.
	for _, leadID := range []*uint{current.LeadID, doc.LeadID} {
		ok, err := s.canWorkOn(me, doc.DocType, leadID)
		if err != nil {
			return s.serverError(c, err)
		}
		if !ok {
			return forbidden(c, noDocAccess)
		}
	}
	doc.ID = current.ID
	doc.SourceDocumentID = current.SourceDocumentID
	if err := s.DocumentStore.UpdateDraft(doc, me.ID); err != nil {
		return s.documentError(c, err)
	}
	updated, err := s.DocumentStore.Find(doc.ID)
	if err != nil {
		return s.serverError(c, err)
	}
	return c.JSON(http.StatusOK, updated)
}

// DeleteDocument handles DELETE /api/docs/:id: drafts only.
func (s *Server) DeleteDocument(c echo.Context) error {
	doc, err := s.loadDocument(c)
	if doc == nil {
		return err
	}
	ok, err := s.canWorkOn(actor(c), doc.DocType, doc.LeadID)
	if err != nil {
		return s.serverError(c, err)
	}
	if !ok {
		return forbidden(c, noDocAccess)
	}
	if err := s.DocumentStore.DeleteDraft(doc.ID); err != nil {
		return s.documentError(c, err)
	}
	return c.NoContent(http.StatusNoContent)
}

var thirteenDigits = regexp.MustCompile(`^\d{13}$`)

// issueRules are checked on the locked draft at the moment it is issued.
func issueRules(doc *models.Document) error {
	contact := doc.Contact
	if contact == nil {
		return violation("ไม่พบผู้ติดต่อของเอกสาร")
	}
	if doc.IsTaxInvoice {
		// A full tax invoice must name the buyer's address, and a business
		// buyer's tax ID and branch.
		if strings.TrimSpace(contact.Address) == "" {
			return violation("ใบกำกับภาษีต้องมีที่อยู่ของผู้ซื้อ เพิ่มที่อยู่ในทะเบียนผู้ติดต่อก่อน")
		}
		if contact.ContactType != models.ContactPerson && !thirteenDigits.MatchString(contact.TaxNumber) {
			return violation("ใบกำกับภาษีต้องมีเลขประจำตัวผู้เสียภาษี 13 หลักของผู้ซื้อ")
		}
		if contact.ContactType != models.ContactPerson && len(contact.BranchCode) != 5 {
			return violation("ใบกำกับภาษีต้องระบุสาขาของผู้ซื้อ (สำนักงานใหญ่ = 00000)")
		}
	}
	if doc.DocType == models.DocCreditNote || doc.DocType == models.DocDebitNote {
		if doc.SourceDocumentID == nil {
			return violation("ใบลดหนี้/ใบเพิ่มหนี้ต้องสร้างจากใบกำกับภาษีที่อ้างถึง")
		}
		if strings.TrimSpace(doc.Remark) == "" {
			return violation("ใบลดหนี้/ใบเพิ่มหนี้ต้องระบุเหตุผลในหมายเหตุ")
		}
	}
	return nil
}

// IssueDocument handles POST /api/docs/:id/issue: the draft gets its number.
func (s *Server) IssueDocument(c echo.Context) error {
	doc, err := s.loadDocument(c)
	if doc == nil {
		return err
	}
	me := actor(c)
	ok, err := s.canWorkOn(me, doc.DocType, doc.LeadID)
	if err != nil {
		return s.serverError(c, err)
	}
	if !ok {
		return forbidden(c, noDocAccess)
	}
	if err := receiptsOnlyFromPayments(doc.DocType); err != nil {
		return s.documentError(c, err)
	}
	note, err := s.guardFiledPeriods(c, documentTaxKeys(doc))
	if err != nil {
		return err
	}
	issued, err := s.DocumentStore.Issue(doc.ID, me.ID, issueRules)
	if err != nil {
		return s.documentError(c, err)
	}
	s.logFiledEdit(doc.ID, me.ID, note)
	return c.JSON(http.StatusOK, issued)
}

type voidBody struct {
	Reason string `json:"reason"`
}

// VoidDocument handles POST /api/docs/:id/void. The number stays, marked
// void, and is never used again.
func (s *Server) VoidDocument(c echo.Context) error {
	doc, err := s.loadDocument(c)
	if doc == nil {
		return err
	}
	var body voidBody
	if err := c.Bind(&body); err != nil {
		return badRequest(c, "ข้อมูลที่ส่งมาไม่ถูกต้อง")
	}
	reason := cut(body.Reason, 500)
	if reason == "" {
		return badRequest(c, "ต้องระบุเหตุผลที่ยกเลิก")
	}
	me := actor(c)
	ok, err := s.canWorkOn(me, doc.DocType, doc.LeadID)
	if err != nil {
		return s.serverError(c, err)
	}
	if !ok {
		return forbidden(c, noDocAccess)
	}
	var keys []taxKey
	if doc.Status == models.DocStatusIssued {
		keys = documentTaxKeys(doc)
	}
	note, err := s.guardFiledPeriods(c, keys)
	if err != nil {
		return err
	}
	voided, err := s.DocumentStore.Void(doc.ID, me.ID, reason)
	if err != nil {
		return s.documentError(c, err)
	}
	s.logFiledEdit(doc.ID, me.ID, note)
	return c.JSON(http.StatusOK, voided)
}

type nextBody struct {
	DocType int `json:"doc_type"`
}

// CreateNextDocument handles POST /api/docs/:id/next: a draft of the next
// document in the chain, with the customer, lines and tax status copied, and
// the source recorded.
func (s *Server) CreateNextDocument(c echo.Context) error {
	source, err := s.loadDocument(c)
	if source == nil {
		return err
	}
	var body nextBody
	if err := c.Bind(&body); err != nil {
		return badRequest(c, "ข้อมูลที่ส่งมาไม่ถูกต้อง")
	}
	if source.Status != models.DocStatusIssued {
		return conflict(c, errorBody("สร้างเอกสารต่อได้จากเอกสารที่ออกเลขแล้วเท่านั้น"))
	}
	allowed := false
	for _, t := range nextDocTypes[source.DocType] {
		if t == body.DocType {
			allowed = true
		}
	}
	if !allowed {
		return badRequest(c, fmt.Sprintf("สร้าง%sต่อจาก%sไม่ได้",
			docTypeLabels[body.DocType], docTypeLabels[source.DocType]))
	}
	if (body.DocType == models.DocCreditNote || body.DocType == models.DocDebitNote) && !source.IsTaxInvoice {
		return badRequest(c, "ใบลดหนี้/ใบเพิ่มหนี้ต้องอ้างถึงใบกำกับภาษี")
	}
	me := actor(c)
	ok, err := s.canWorkOn(me, body.DocType, source.LeadID)
	if err != nil {
		return s.serverError(c, err)
	}
	if !ok {
		return forbidden(c, noDocAccess)
	}

	today := startOfToday()
	next := &models.Document{
		DocType:          body.DocType,
		ContactID:        source.ContactID,
		LeadID:           source.LeadID,
		IssuedDate:       today,
		Reference:        source.Code,
		Tags:             source.Tags,
		TaxStatus:        source.TaxStatus,
		IsTaxInvoice:     body.DocType == models.DocReceipt || body.DocType == models.DocTaxInvoice,
		DiscountTotal:    source.DiscountTotal,
		PreTaxAmount:     source.PreTaxAmount,
		VatAmount:        source.VatAmount,
		NetAmount:        source.NetAmount,
		WithholdingTotal: source.WithholdingTotal,
		SourceDocumentID: &source.ID,
	}
	if next.Tags == nil {
		next.Tags = pq.StringArray{}
	}
	for _, item := range source.Items {
		item.ID = 0
		item.Product = nil
		next.Items = append(next.Items, item)
	}
	if err := s.DocumentStore.CreateDraft(next, me.ID); err != nil {
		return s.serverError(c, err)
	}
	created, err := s.DocumentStore.Find(next.ID)
	if err != nil {
		return s.serverError(c, err)
	}
	return c.JSON(http.StatusCreated, created)
}

// DraftDocumentEmail handles POST /api/docs/:id/email-draft. The system
// sends no e-mail (CLAUDE.md): it returns a subject and body for the person
// to send from their own mail, and logs that a draft was made — not that
// anything was sent.
func (s *Server) DraftDocumentEmail(c echo.Context) error {
	doc, err := s.loadDocument(c)
	if doc == nil {
		return err
	}
	if doc.Status != models.DocStatusIssued {
		return conflict(c, errorBody("ร่างอีเมลได้เฉพาะเอกสารที่ออกเลขแล้ว"))
	}
	label := docTypeLabels[doc.DocType]
	to, greeting := "", "เรียน ลูกค้า"
	if doc.Contact != nil {
		to = doc.Contact.PersonEmail
		greeting = "เรียน " + doc.Contact.Name
		if person := strings.TrimSpace(doc.Contact.PersonFirstName + " " + doc.Contact.PersonLastName); person != "" {
			greeting = "เรียน คุณ" + person
		}
	}
	subject := fmt.Sprintf("%s เลขที่ %s จาก Owl Day House", label, doc.Code)
	lines := []string{
		greeting,
		"",
		fmt.Sprintf("Owl Day House ขอส่ง%s เลขที่ %s ลงวันที่ %s ยอดรวม %s บาท ตามไฟล์แนบ",
			label, doc.Code, doc.IssuedDate.Format("02/01/2006"), docmath.Baht(doc.NetAmount)),
	}
	if doc.DueDate != nil {
		lines = append(lines, "ครบกำหนดชำระ "+doc.DueDate.Format("02/01/2006"))
	}
	lines = append(lines, "", "หากมีข้อสงสัย ติดต่อเราได้ที่ 092-455-2450", "", "ขอบคุณครับ/ค่ะ", "Owl Day House")

	if err := s.DocumentStore.AddEvent(&models.DocumentEvent{
		DocumentID: &doc.ID, UserID: actor(c).ID, Action: models.DocEventEmailDrafted,
	}); err != nil {
		return s.serverError(c, err)
	}
	return c.JSON(http.StatusOK, map[string]string{
		"to": to, "subject": subject, "body": strings.Join(lines, "\n"),
	})
}

// MarkDocumentSent handles POST /api/docs/:id/sent: the person says they
// sent it themselves.
func (s *Server) MarkDocumentSent(c echo.Context) error {
	doc, err := s.loadDocument(c)
	if doc == nil {
		return err
	}
	if doc.Status != models.DocStatusIssued {
		return conflict(c, errorBody("ส่งได้เฉพาะเอกสารที่ออกเลขแล้ว"))
	}
	if err := s.DocumentStore.AddEvent(&models.DocumentEvent{
		DocumentID: &doc.ID, UserID: actor(c).ID, Action: models.DocEventSent,
	}); err != nil {
		return s.serverError(c, err)
	}
	return c.NoContent(http.StatusNoContent)
}

type calculateBody struct {
	TaxStatus int                `json:"tax_status"`
	Discount  string             `json:"discount"`
	Items     []documentLineBody `json:"items"`
}

// CalculateDocument handles POST /api/docs/calculate: the totals a document
// would have, without saving anything. The form's live preview uses it, so
// there is one copy of the arithmetic, here, and not a second one in the UI.
func (s *Server) CalculateDocument(c echo.Context) error {
	var body calculateBody
	if err := c.Bind(&body); err != nil {
		return badRequest(c, "ข้อมูลที่ส่งมาไม่ถูกต้อง")
	}
	if len(body.Items) > maxDocumentLines {
		return c.JSON(http.StatusUnprocessableEntity, errorBody(fmt.Sprintf("เอกสารหนึ่งใบมีได้ไม่เกิน %d บรรทัด", maxDocumentLines)))
	}
	lines := make([]docmath.Line, len(body.Items))
	for i, item := range body.Items {
		vat := item.VatType
		if vat == 0 && !item.IsDescription {
			vat = models.VatSeven
		}
		lines[i] = docmath.Line{
			IsDescription: item.IsDescription, Quantity: item.Quantity, Price: item.Price,
			Discount: item.Discount, VatType: vat, WithholdingRate: item.WithholdingRate,
		}
	}
	result, err := docmath.Compute(body.TaxStatus, lines, body.Discount)
	if err != nil {
		return c.JSON(http.StatusUnprocessableEntity, errorBody(err.Error()))
	}
	lineAmounts := make([]map[string]decimal.Decimal, len(result.Lines))
	for i, l := range result.Lines {
		lineAmounts[i] = map[string]decimal.Decimal{"line_amount": l.LineAmount, "withholding_amount": l.WithholdingAmount}
	}
	return c.JSON(http.StatusOK, map[string]interface{}{
		"lines":             lineAmounts,
		"subtotal":          result.Subtotal,
		"discount_total":    result.DiscountTotal,
		"pre_tax_amount":    result.PreTaxAmount,
		"vat_amount":        result.VatAmount,
		"net_amount":        result.NetAmount,
		"withholding_total": result.WithholdingTotal,
		"payable_amount":    result.PayableAmount,
	})
}
