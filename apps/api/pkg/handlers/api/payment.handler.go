package api

import (
	"errors"
	"fmt"
	"net/http"
	"time"

	"github.com/labstack/echo/v4"
	"github.com/lib/pq"
	"github.com/shopspring/decimal"

	"github.com/owldayhouse/odh-internal-api/pkg/docmath"
	"github.com/owldayhouse/odh-internal-api/pkg/handlers/api/request"
	"github.com/owldayhouse/odh-internal-api/pkg/leadrules"
	"github.com/owldayhouse/odh-internal-api/pkg/models"
)

// Money received (step 5 of docs/internal-tools/document-system.md).
//
// A payment is recorded against an issued quotation, invoice or billing note.
// It says what arrived and what the customer withheld; together they are what
// it settles. The receipt/tax invoice is issued from the payment — the
// company issues receipts only after the money is in — in the same
// transaction, with VAT following the money (docmath.SplitPayment). Recording
// money, voiding it and the withholding certificate are the admin's; a sales
// account sees the payments on its own customers' documents.

// payableDocTypes are the documents money moves against: received for the
// sales documents, paid out for an expense.
var payableDocTypes = map[int]bool{
	models.DocQuotation:   true,
	models.DocInvoice:     true,
	models.DocBillingNote: true,
	models.DocExpense:     true,
}

// paymentDirection: money in for a sales document, out for an expense.
func paymentDirection(docType int) string {
	if docType == models.DocExpense {
		return models.PaymentOut
	}
	return models.PaymentIn
}

func (s *Server) registerPaymentRoutes(docs *echo.Group) {
	docs.GET("/payments", s.ListPayments, s.IsAdmin())
	docs.GET("/expenses", s.ListExpenses, s.IsAdmin())
	docs.GET("/payments/:pid", s.GetPayment, s.IsAdmin())
	docs.POST("/payments/:pid/void", s.VoidPayment, s.IsAdmin())
	docs.POST("/payments/:pid/receipt", s.IssuePaymentReceipt, s.IsAdmin())
	docs.POST("/payments/:pid/wht-cert", s.MarkWhtCertificate, s.IsAdmin())
	docs.POST("/:id/payments", s.RecordPayment, s.IsAdmin())
}

func (s *Server) paymentError(c echo.Context, err error) error {
	switch {
	case errors.Is(err, models.ErrOverpaid), errors.Is(err, docmath.ErrOverpaid):
		return c.JSON(http.StatusUnprocessableEntity, errorBody(models.ErrOverpaid.Error()))
	case errors.Is(err, models.ErrNotPayable), errors.Is(err, models.ErrPaymentVoided),
		errors.Is(err, models.ErrReceiptExists), errors.Is(err, models.ErrHasPayments):
		return conflict(c, errorBody(err.Error()))
	case errors.Is(err, models.ErrNoWhtCertificate), errors.Is(err, models.ErrNothingWithheld):
		return c.JSON(http.StatusUnprocessableEntity, errorBody(err.Error()))
	}
	return s.documentError(c, err)
}

// checkPaymentFile: a payment's slip and certificate are the admin's.
func (s *Server) checkPaymentFile(c echo.Context, paymentID uint) error {
	if !actor(c).IsAdmin() {
		return responded(forbidden(c, "หลักฐานการรับเงินเปิดได้เฉพาะแอดมิน"))
	}
	if _, err := s.PaymentStore.Find(paymentID); err != nil {
		if isNotFound(err) {
			return responded(notFound(c, "ไม่พบรายการรับเงินนี้"))
		}
		return responded(s.serverError(c, err))
	}
	return nil
}

// receiptPlan builds the receipt/tax invoice for a payment once the source
// document is locked and the payments already receipted are known.
func (s *Server) receiptPlan(payment *models.Payment, methodName string) *models.ReceiptPlan {
	return &models.ReceiptPlan{
		Check: issueRules,
		Build: func(source *models.Document, receiptedSettled, receiptedVat decimal.Decimal) (*models.Document, error) {
			// source arrives locked and with its lines, read inside the
			// payment's transaction; nothing here may open another connection.
			full := source
			lines := make([]docmath.Line, len(full.Items))
			for i, item := range full.Items {
				lines[i] = docmath.Line{
					IsDescription: item.IsDescription, Quantity: item.Quantity, Price: item.Price,
					Discount: item.Discount, VatType: item.VatType,
				}
			}
			totals, err := docmath.Compute(full.TaxStatus, lines, full.DiscountTotal.StringFixed(2))
			if err != nil {
				return nil, err
			}
			portion, err := docmath.SplitPayment(full.NetAmount, full.VatAmount, totals.VatBase,
				payment.SettledAmount, receiptedSettled, receiptedVat)
			if err != nil {
				return nil, err
			}

			what := fmt.Sprintf("รับชำระตาม%s %s", docTypeLabels[full.DocType], full.Code)
			switch {
			case payment.SettledAmount.Equal(full.NetAmount):
				// the whole document in one payment
			case payment.SettledAmount.Equal(full.NetAmount.Sub(receiptedSettled)):
				what += " (ชำระงวดสุดท้าย)"
			default:
				what += " (ชำระบางส่วน)"
			}
			receipt := &models.Document{
				DocType:          models.DocReceipt,
				ContactID:        full.ContactID,
				LeadID:           full.LeadID,
				IssuedDate:       payment.PaymentDate,
				Reference:        full.Code,
				Remark:           fmt.Sprintf("ชำระโดย %s วันที่ %s", methodName, payment.PaymentDate.Format("02/01/2006")),
				Tags:             pq.StringArray{},
				TaxStatus:        models.TaxExclusive,
				IsTaxInvoice:     totals.VatBase.IsPositive(),
				PreTaxAmount:     portion.PreTax,
				VatAmount:        portion.Vat,
				NetAmount:        portion.Net,
				WithholdingTotal: payment.WithholdingAmount,
				SourceDocumentID: &full.ID,
			}
			one := decimal.NewFromInt(1)
			if portion.VatBase.IsPositive() {
				receipt.Items = append(receipt.Items, models.DocumentItem{
					Description: what, Quantity: one, Price: portion.VatBase, VatType: models.VatSeven, LineAmount: portion.VatBase,
				})
			}
			if rest := portion.PreTax.Sub(portion.VatBase); rest.IsPositive() {
				desc := what
				if portion.VatBase.IsPositive() {
					desc += " — ส่วนที่ไม่มี VAT"
				}
				receipt.Items = append(receipt.Items, models.DocumentItem{
					Description: desc, Quantity: one, Price: rest, VatType: models.VatNone, LineAmount: rest,
				})
			}
			return receipt, nil
		},
	}
}

type paymentBody struct {
	PaymentDate       string          `json:"payment_date"`
	PaymentMethodID   uint            `json:"payment_method_id"`
	ReceivedAmount    decimal.Decimal `json:"received_amount"`
	WithholdingAmount decimal.Decimal `json:"withholding_amount"`
	Note              string          `json:"note"`
	// IssueReceipt is on unless the person turns it off — for example when
	// the customer's tax ID is still missing; the receipt can follow later.
	IssueReceipt *bool `json:"issue_receipt"`
}

// RecordPayment handles POST /api/docs/:id/payments (admin).
func (s *Server) RecordPayment(c echo.Context) error {
	doc, err := s.loadDocument(c)
	if doc == nil {
		return err
	}
	if !payableDocTypes[doc.DocType] || doc.Status != models.DocStatusIssued {
		return conflict(c, errorBody(models.ErrNotPayable.Error()))
	}
	var body paymentBody
	if err := c.Bind(&body); err != nil {
		return badRequest(c, "ข้อมูลที่ส่งมาไม่ถูกต้อง")
	}
	day, err := parseDay(body.PaymentDate)
	if err != nil {
		return s.paymentError(c, err)
	}
	if day == nil {
		return c.JSON(http.StatusUnprocessableEntity, errorBody("ใส่วันที่ของรายการเงิน"))
	}
	if day.After(startOfToday()) {
		return c.JSON(http.StatusUnprocessableEntity, errorBody("วันที่ของรายการเงินเป็นวันในอนาคตไม่ได้"))
	}
	received := body.ReceivedAmount.Round(2)
	withheld := body.WithholdingAmount.Round(2)
	if received.IsNegative() || withheld.IsNegative() {
		return c.JSON(http.StatusUnprocessableEntity, errorBody("ยอดเงินติดลบไม่ได้"))
	}
	settled := received.Add(withheld)
	if !settled.IsPositive() {
		return c.JSON(http.StatusUnprocessableEntity, errorBody("ใส่ยอดเงิน"))
	}
	method, err := s.RegisterStore.FindPaymentMethod(body.PaymentMethodID)
	if err != nil || !method.Active {
		return c.JSON(http.StatusUnprocessableEntity, errorBody("เลือกช่องทางการเงิน"))
	}
	direction := paymentDirection(doc.DocType)

	me := actor(c)
	payment := &models.Payment{
		DocumentID:        doc.ID,
		Direction:         direction,
		Status:            models.PaymentActive,
		PaymentDate:       *day,
		PaymentMethodID:   method.ID,
		ReceivedAmount:    received,
		WithholdingAmount: withheld,
		SettledAmount:     settled,
		Note:              cut(body.Note, 500),
		WhtCertStatus:     models.WhtCertNone,
		CreatedBy:         me.ID,
	}
	if withheld.IsPositive() {
		payment.WhtCertStatus = models.WhtCertPending
		if direction == models.PaymentOut {
			// We withheld, so we file it: on the form the vendor's type
			// calls for, as it stands today.
			payment.WhtForm = models.WhtFormPND53
			if doc.Contact != nil && doc.Contact.WhtForm != "" {
				payment.WhtForm = doc.Contact.WhtForm
			}
		}
	}
	// Money in issues its receipt/tax invoice; paying a vendor issues nothing
	// of ours — their tax invoice is already on the expense.
	var plan *models.ReceiptPlan
	if direction == models.PaymentIn && (body.IssueReceipt == nil || *body.IssueReceipt) {
		plan = s.receiptPlan(payment, method.Name)
	}
	note, err := s.guardFiledPeriods(c, paymentTaxKeys(payment, doc, plan != nil))
	if err != nil {
		return err
	}
	if err := s.PaymentStore.Record(payment, plan); err != nil {
		return s.paymentError(c, err)
	}
	s.logFiledEdit(doc.ID, me.ID, note)
	saved, err := s.PaymentStore.Find(payment.ID)
	if err != nil {
		return s.serverError(c, err)
	}
	return c.JSON(http.StatusCreated, saved)
}

// paymentTaxKeys: the filings a new payment (or its receipt) counts in. A
// receipt issued for money in is a tax invoice dated the payment day when the
// document carries VAT; tax we withhold from a vendor goes on its form in the
// payment's month.
func paymentTaxKeys(p *models.Payment, doc *models.Document, withReceipt bool) []taxKey {
	var keys []taxKey
	if p.Direction == models.PaymentIn && withReceipt && doc.VatAmount.IsPositive() {
		keys = append(keys, taxKey{models.TaxFormPP30, monthOf(p.PaymentDate)})
	}
	if p.Direction == models.PaymentOut && p.WithholdingAmount.IsPositive() && p.WhtForm != "" {
		keys = append(keys, taxKey{p.WhtForm, monthOf(p.PaymentDate)})
	}
	return keys
}

func (s *Server) loadPayment(c echo.Context) (*models.Payment, error) {
	id, err := request.UintParam(c, "pid")
	if err != nil {
		return nil, responded(badRequest(c, "รหัสรายการรับเงินไม่ถูกต้อง"))
	}
	p, err := s.PaymentStore.Find(id)
	if err != nil {
		if isNotFound(err) {
			return nil, responded(notFound(c, "ไม่พบรายการรับเงินนี้"))
		}
		return nil, responded(s.serverError(c, err))
	}
	return p, nil
}

// GetPayment handles GET /api/docs/payments/:pid (admin).
func (s *Server) GetPayment(c echo.Context) error {
	p, err := s.loadPayment(c)
	if err != nil {
		return err
	}
	return c.JSON(http.StatusOK, p)
}

// IssuePaymentReceipt handles POST /api/docs/payments/:pid/receipt: the
// receipt for a payment recorded without one.
func (s *Server) IssuePaymentReceipt(c echo.Context) error {
	p, err := s.loadPayment(c)
	if err != nil {
		return err
	}
	name := ""
	if p.PaymentMethod != nil {
		name = p.PaymentMethod.Name
	}
	var keys []taxKey
	if p.Direction == models.PaymentIn && p.ReceiptID == nil && p.Document != nil {
		keys = paymentTaxKeys(p, p.Document, true)
	}
	note, err := s.guardFiledPeriods(c, keys)
	if err != nil {
		return err
	}
	me := actor(c)
	updated, err := s.PaymentStore.IssueReceipt(p.ID, me.ID, s.receiptPlan(p, name))
	if err != nil {
		return s.paymentError(c, err)
	}
	s.logFiledEdit(p.DocumentID, me.ID, note)
	return c.JSON(http.StatusOK, updated)
}

// VoidPayment handles POST /api/docs/payments/:pid/void: the payment and
// the receipt issued for it are cancelled; both keep their rows and the
// receipt its number.
func (s *Server) VoidPayment(c echo.Context) error {
	p, err := s.loadPayment(c)
	if err != nil {
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
	var keys []taxKey
	if p.Status == models.PaymentActive {
		if p.Receipt != nil && p.Receipt.Status == models.DocStatusIssued {
			keys = append(keys, documentTaxKeys(p.Receipt)...)
		}
		if p.Direction == models.PaymentOut && p.WithholdingAmount.IsPositive() && p.WhtForm != "" {
			keys = append(keys, taxKey{p.WhtForm, monthOf(p.PaymentDate)})
		}
	}
	note, err := s.guardFiledPeriods(c, keys)
	if err != nil {
		return err
	}
	me := actor(c)
	updated, err := s.PaymentStore.Void(p.ID, me.ID, reason)
	if err != nil {
		return s.paymentError(c, err)
	}
	s.logFiledEdit(p.DocumentID, me.ID, note)
	return c.JSON(http.StatusOK, updated)
}

// MarkWhtCertificate handles POST /api/docs/payments/:pid/wht-cert: the
// customer's withholding certificate is in hand. The certificate must be
// attached first (files, owner_type payment_wht).
func (s *Server) MarkWhtCertificate(c echo.Context) error {
	p, err := s.loadPayment(c)
	if err != nil {
		return err
	}
	updated, err := s.PaymentStore.MarkWhtCert(p.ID)
	if err != nil {
		return s.paymentError(c, err)
	}
	return c.JSON(http.StatusOK, updated)
}

// ListPayments handles GET /api/docs/payments?wht_cert=pending&month=YYYY-MM
// (admin): "certificates we are still waiting for" is wht_cert=pending.
func (s *Server) ListPayments(c echo.Context) error {
	direction := models.PaymentIn
	if c.QueryParam("direction") == models.PaymentOut {
		direction = models.PaymentOut
	}
	filter := models.PaymentFilter{
		Direction:     direction,
		WhtCertStatus: c.QueryParam("wht_cert"),
		IncludeVoided: c.QueryParam("voided") == "1",
	}
	if p := request.QueryUint(c, "page"); p != nil {
		filter.Page = int(*p)
	}
	if month := c.QueryParam("month"); month != "" {
		start, err := time.ParseInLocation("2006-01", month, leadrules.Bangkok)
		if err != nil {
			return badRequest(c, "เดือนไม่ถูกต้อง ใช้รูปแบบ ปปปป-ดด")
		}
		end := start.AddDate(0, 1, -1)
		filter.From, filter.To = &start, &end
	}
	rows, total, err := s.PaymentStore.List(filter)
	if err != nil {
		return s.serverError(c, err)
	}
	sum := map[string]decimal.Decimal{"received": decimal.Zero, "withholding": decimal.Zero, "settled": decimal.Zero}
	for _, p := range rows {
		sum["received"] = sum["received"].Add(p.ReceivedAmount)
		sum["withholding"] = sum["withholding"].Add(p.WithholdingAmount)
		sum["settled"] = sum["settled"].Add(p.SettledAmount)
	}
	return c.JSON(http.StatusOK, map[string]interface{}{"items": rows, "total": total, "page_sums": sum})
}

// documentPayments is what the document screen shows about money: the
// payments (to whoever may see the document) and what is still owed.
func (s *Server) documentPayments(doc *models.Document) (map[string]interface{}, error) {
	if !payableDocTypes[doc.DocType] {
		return nil, nil
	}
	payments, err := s.PaymentStore.ListByDocument(doc.ID)
	if err != nil {
		return nil, err
	}
	settled := decimal.Zero
	for _, p := range payments {
		if p.Status == models.PaymentActive {
			settled = settled.Add(p.SettledAmount)
		}
	}
	outstanding := doc.NetAmount.Sub(settled)
	if doc.Status != models.DocStatusIssued {
		outstanding = decimal.Zero
	}
	return map[string]interface{}{
		"items":       payments,
		"settled":     settled,
		"outstanding": outstanding,
	}, nil
}

// receiptsOnlyFromPayments refuses the old ways to a receipt: a receipt/tax
// invoice is issued when money is recorded (the company issues receipts only
// after payment), never typed in or chained by hand.
func receiptsOnlyFromPayments(docType int) error {
	if docType == models.DocReceipt {
		return violation("ใบเสร็จ/ใบกำกับภาษีออกจากการบันทึกรับเงินของใบแจ้งหนี้หรือใบเสนอราคา")
	}
	return nil
}

// ListExpenses handles GET /api/docs/expenses?view=&month= (admin): the
// month's expenses with what was paid on each, and the totals the tax month
// needs. Views: unpaid (still owed to the vendor), no_tax_invoice (VAT paid
// with no tax invoice: it cannot be claimed), all (the default).
func (s *Server) ListExpenses(c echo.Context) error {
	filter := models.DocumentFilter{DocType: models.DocExpense, Status: models.DocStatusIssued, Limit: 200}
	if month := c.QueryParam("month"); month != "" {
		start, err := time.ParseInLocation("2006-01", month, leadrules.Bangkok)
		if err != nil {
			return badRequest(c, "เดือนไม่ถูกต้อง ใช้รูปแบบ ปปปป-ดด")
		}
		end := start.AddDate(0, 1, -1)
		filter.From, filter.To = &start, &end
	}
	docs, _, err := s.DocumentStore.List(filter)
	if err != nil {
		return s.serverError(c, err)
	}
	ids := make([]uint, len(docs))
	for i, d := range docs {
		ids[i] = d.ID
	}
	paid, err := s.PaymentStore.SettledFor(ids)
	if err != nil {
		return s.serverError(c, err)
	}

	type row struct {
		*models.Document
		Paid        decimal.Decimal `json:"paid"`
		Outstanding decimal.Decimal `json:"outstanding"`
		// Claimable: its VAT can be used as input tax (a tax invoice is on file).
		Claimable bool `json:"claimable"`
	}
	view := c.QueryParam("view")
	items := []row{}
	sums := map[string]decimal.Decimal{
		"net": decimal.Zero, "vat": decimal.Zero, "vat_claimable": decimal.Zero,
		"vat_not_claimable": decimal.Zero, "withholding": decimal.Zero, "outstanding": decimal.Zero,
	}
	for _, d := range docs {
		r := row{Document: d, Paid: paid[d.ID]}
		r.Outstanding = d.NetAmount.Sub(r.Paid)
		r.Claimable = d.ReceivedTaxInvoiceNumber != ""
		switch view {
		case "unpaid":
			if !r.Outstanding.IsPositive() {
				continue
			}
		case "no_tax_invoice":
			if r.Claimable || !d.VatAmount.IsPositive() {
				continue
			}
		}
		items = append(items, r)
		sums["net"] = sums["net"].Add(d.NetAmount)
		sums["vat"] = sums["vat"].Add(d.VatAmount)
		if r.Claimable {
			sums["vat_claimable"] = sums["vat_claimable"].Add(d.VatAmount)
		} else {
			sums["vat_not_claimable"] = sums["vat_not_claimable"].Add(d.VatAmount)
		}
		sums["withholding"] = sums["withholding"].Add(d.WithholdingTotal)
		sums["outstanding"] = sums["outstanding"].Add(r.Outstanding)
	}
	return c.JSON(http.StatusOK, map[string]interface{}{"items": items, "sums": sums})
}
