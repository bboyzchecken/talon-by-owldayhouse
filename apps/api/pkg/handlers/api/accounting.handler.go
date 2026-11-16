package api

import (
	"net/http"
	"strings"
	"time"

	"github.com/labstack/echo/v4"
	"github.com/shopspring/decimal"

	"github.com/owldayhouse/odh-internal-api/pkg/models"
)

// Working with the accounting firm (docs/internal-tools/accounting-handoff.md).
//
// The firm does not sign in here; the team talks to it on LINE. This system
// keeps track of what was asked and what came back, and the screen turns it
// into messages to paste. Two things go through it:
//
//   - The 50 ทวิ for tax we withhold: only the firm issues it. A payment out
//     with tax withheld is "to request" until we ask, "waiting" until their
//     copy is attached, then "to send" until it reaches the payee (the
//     existing wht-cert step).
//   - Monthly tax: our figures go to the firm, the firm files and sends back
//     an e-tax QR, we pay it and attach the evidence (the existing "file").

func (s *Server) registerAccountingRoutes(docs *echo.Group) {
	docs.GET("/accounting", s.GetAccounting, s.IsAdmin())
	docs.POST("/accounting/wht-requested", s.MarkWhtRequested, s.IsAdmin())
	docs.POST("/tax/filings/:fid/sent", s.MarkTaxSent, s.IsAdmin())
	docs.POST("/tax/filings/:fid/due", s.SetTaxDue, s.IsAdmin())
}

// whtRequestView is everything the firm needs to issue one 50 ทวิ.
type whtRequestView struct {
	PaymentID      uint            `json:"payment_id"`
	DocumentID     uint            `json:"document_id"`
	DocumentCode   string          `json:"document_code"`
	InvoiceNo      string          `json:"invoice_no"`
	PayeeName      string          `json:"payee_name"`
	PayeeTaxNumber string          `json:"payee_tax_number"`
	PayeeBranch    string          `json:"payee_branch"`
	PayeeAddress   string          `json:"payee_address"`
	PaymentDate    time.Time       `json:"payment_date"`
	WhtForm        string          `json:"wht_form"`
	IncomeType     string          `json:"income_type"`
	Base           decimal.Decimal `json:"base"`
	Rate           string          `json:"rate"`
	Withheld       decimal.Decimal `json:"withheld"`
	RequestedAt    *time.Time      `json:"requested_at,omitempty"`
	HasCertificate bool            `json:"has_certificate"`
}

func (s *Server) whtRequestView(p *models.Payment) (*whtRequestView, error) {
	doc, err := s.DocumentStore.Find(p.DocumentID)
	if err != nil {
		return nil, err
	}
	files, err := s.FileStore.ListByOwner(models.FileOwnerPaymentWht, p.ID)
	if err != nil {
		return nil, err
	}
	v := &whtRequestView{
		PaymentID: p.ID, DocumentID: doc.ID, DocumentCode: doc.Code, InvoiceNo: doc.ReceivedTaxInvoiceNumber,
		PayeeName: doc.BuyerName, PayeeTaxNumber: doc.BuyerTaxNumber, PayeeBranch: doc.BuyerBranchCode,
		PayeeAddress: doc.BuyerAddress, PaymentDate: p.PaymentDate, WhtForm: p.WhtForm,
		Base: p.SettledAmount, Withheld: p.WithholdingAmount, RequestedAt: p.WhtRequestedAt,
	}
	// The base on a 50 ทวิ is the amount before VAT: this payment's share of
	// the expense's pre-VAT amount.
	if doc.NetAmount.IsPositive() {
		v.Base = doc.PreTaxAmount.Mul(p.SettledAmount).Div(doc.NetAmount).Round(2)
	}
	if v.Base.IsPositive() {
		v.Rate = p.WithholdingAmount.Mul(decimal.NewFromInt(100)).Div(v.Base).Round(2).String()
	}
	kinds := []string{}
	for _, it := range doc.Items {
		if !it.IsDescription && it.WithholdingRate.IsPositive() && strings.TrimSpace(it.Description) != "" {
			kinds = append(kinds, strings.TrimSpace(it.Description))
		}
	}
	v.IncomeType = strings.Join(kinds, " / ")
	for _, f := range files {
		if f.Status == models.FileStatusReady {
			v.HasCertificate = true
		}
	}
	return v, nil
}

// taxHandoffView is one month's forms on their way through the firm.
type taxHandoffView struct {
	Month string         `json:"month"`
	Forms []*taxFormView `json:"forms"`
}

// GetAccounting handles GET /api/docs/accounting: the 50 ทวิ to ask for, to
// wait for and to pass on, and the tax months still open with the firm.
func (s *Server) GetAccounting(c echo.Context) error {
	pending, _, err := s.PaymentStore.List(models.PaymentFilter{
		Direction: models.PaymentOut, WhtCertStatus: models.WhtCertPending, Limit: 200,
	})
	if err != nil {
		return s.serverError(c, err)
	}
	toRequest, waiting, toSend := []*whtRequestView{}, []*whtRequestView{}, []*whtRequestView{}
	for _, p := range pending {
		v, err := s.whtRequestView(p)
		if err != nil {
			return s.serverError(c, err)
		}
		switch {
		case v.HasCertificate:
			toSend = append(toSend, v)
		case v.RequestedAt != nil:
			waiting = append(waiting, v)
		default:
			toRequest = append(toRequest, v)
		}
	}

	// Tax: every closed month of the last twelve with a form still open,
	// and always the last closed month, newest first.
	last := thisMonth().AddDate(0, -1, 0)
	from := last.AddDate(0, -11, 0)
	book, err := s.taxBook(from, last)
	if err != nil {
		return s.serverError(c, err)
	}
	months := []taxHandoffView{}
	for m := last; !m.Before(from); m = m.AddDate(0, -1, 0) {
		view := taxHandoffView{Month: monthKey(m), Forms: []*taxFormView{}}
		open := false
		for _, form := range models.TaxForms() {
			if !book.required(form, m) {
				continue
			}
			fv, err := s.taxFormView(book, form, m, false)
			if err != nil {
				return s.serverError(c, err)
			}
			if fv.Filing == nil || fv.Filing.Status != models.TaxFilingFiled {
				open = true
			}
			view.Forms = append(view.Forms, fv)
		}
		if len(view.Forms) > 0 && (open || m.Equal(last)) {
			months = append(months, view)
		}
	}

	return c.JSON(http.StatusOK, map[string]interface{}{
		"wht_to_request": toRequest,
		"wht_waiting":    waiting,
		"wht_to_send":    toSend,
		"tax_months":     months,
	})
}

type whtRequestedBody struct {
	PaymentIDs []uint `json:"payment_ids"`
}

// MarkWhtRequested handles POST /api/docs/accounting/wht-requested: the
// message asking for these 50 ทวิ was sent to the firm.
func (s *Server) MarkWhtRequested(c echo.Context) error {
	var body whtRequestedBody
	if err := c.Bind(&body); err != nil || len(body.PaymentIDs) == 0 {
		return badRequest(c, "เลือกรายการที่ส่งคำขอแล้ว")
	}
	if len(body.PaymentIDs) > 200 {
		return badRequest(c, "ส่งได้ครั้งละไม่เกิน 200 รายการ")
	}
	marked, err := s.PaymentStore.MarkWhtRequested(body.PaymentIDs, actor(c).ID)
	if err != nil {
		return s.serverError(c, err)
	}
	return c.JSON(http.StatusOK, map[string]interface{}{"marked": len(marked)})
}

// MarkTaxSent handles POST /api/docs/tax/filings/:fid/sent.
func (s *Server) MarkTaxSent(c echo.Context) error {
	row, err := s.loadTaxFiling(c)
	if err != nil {
		return err
	}
	updated, err := s.TaxStore.MarkSent(row.ID, actor(c).ID)
	if err != nil {
		return s.taxError(c, err)
	}
	return c.JSON(http.StatusOK, updated)
}

type taxDueBody struct {
	Amount decimal.Decimal `json:"amount"`
}

// SetTaxDue handles POST /api/docs/tax/filings/:fid/due: the amount on the
// firm's QR. It may differ from ours (a surcharge, a correction); the screen
// shows both.
func (s *Server) SetTaxDue(c echo.Context) error {
	row, err := s.loadTaxFiling(c)
	if err != nil {
		return err
	}
	var body taxDueBody
	if err := c.Bind(&body); err != nil {
		return badRequest(c, "ข้อมูลที่ส่งมาไม่ถูกต้อง")
	}
	amount := body.Amount.Round(2)
	if amount.IsNegative() {
		return c.JSON(http.StatusUnprocessableEntity, errorBody("ยอดตาม QR ติดลบไม่ได้"))
	}
	updated, err := s.TaxStore.SetDue(row.ID, actor(c).ID, amount)
	if err != nil {
		return s.taxError(c, err)
	}
	return c.JSON(http.StatusOK, updated)
}
