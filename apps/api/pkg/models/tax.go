package models

import (
	"errors"
	"time"

	"github.com/shopspring/decimal"
)

// Monthly tax (step 7 of docs/internal-tools/document-system.md).
//
// The system works out what each month owes from the documents and payments
// already recorded; a person files and pays on the Revenue Department's site
// and comes back to say so, with the receipt attached. At that moment the
// figures are copied onto the filing row and never move again: a later void
// or a late expense shows up as "the figures no longer match what was filed",
// for the accountant to decide on, instead of rewriting a filed month.

// Tax forms. The withholding forms share their values with WhtFormPND3/53, so
// a payment's wht_form names the filing it belongs to.
const (
	TaxFormPP30  = "pp30"       // ภ.พ.30: output VAT less input VAT
	TaxFormPND3  = WhtFormPND3  // ภ.ง.ด.3: tax we withheld from individuals
	TaxFormPND53 = WhtFormPND53 // ภ.ง.ด.53: tax we withheld from juristic persons
)

// TaxForms lists the forms in the order they are shown.
func TaxForms() []string { return []string{TaxFormPP30, TaxFormPND53, TaxFormPND3} }

// Filing statuses. A row exists from the moment someone starts attaching the
// receipt (open); it is filed once they confirm. Reopening a filed month puts
// it back to open and is logged.
const (
	TaxFilingOpen  = "open"
	TaxFilingFiled = "filed"
)

// Settings the tax screen reads (an admin changes them there).
const (
	// SettingTaxFirstPeriod is the first month (YYYY-MM) this system files
	// for. Months before it were filed elsewhere and are never asked about.
	SettingTaxFirstPeriod = "tax_first_period"
	// SettingTaxOpeningVatCredit is the VAT credit carried into the first
	// period from the last return filed elsewhere (baht, 2 decimals).
	SettingTaxOpeningVatCredit = "tax_opening_vat_credit"
	// SettingTaxEfilingExtraDays is how many days later than the paper
	// deadline an online filing may be. The Revenue Department extends it
	// round by round, so it is a setting, not a constant.
	SettingTaxEfilingExtraDays = "tax_efiling_extra_days"
)

// DefaultEfilingExtraDays is used until an admin sets the value.
const DefaultEfilingExtraDays = 8

// TaxFigures is what one form owes for one month.
//
// For ภ.พ.30: TaxAmount = OutputVat − InputVat − CreditBroughtForward when
// that is positive; otherwise nothing is payable and the difference is
// CreditCarried into the next month. For ภ.ง.ด.3/53, TaxAmount is the tax
// withheld and LineCount the number of payments it came from.
type TaxFigures struct {
	OutputVat            decimal.Decimal `gorm:"type:numeric(14,2);not null;default:0" json:"output_vat"`
	InputVat             decimal.Decimal `gorm:"type:numeric(14,2);not null;default:0" json:"input_vat"`
	CreditBroughtForward decimal.Decimal `gorm:"type:numeric(14,2);not null;default:0" json:"credit_brought_forward"`
	TaxAmount            decimal.Decimal `gorm:"type:numeric(14,2);not null;default:0" json:"tax_amount"`
	CreditCarried        decimal.Decimal `gorm:"type:numeric(14,2);not null;default:0" json:"credit_carried"`
	LineCount            int             `gorm:"not null;default:0" json:"line_count"`
}

// Equal reports whether two sets of figures would be filed the same.
func (f TaxFigures) Equal(o TaxFigures) bool {
	return f.OutputVat.Equal(o.OutputVat) && f.InputVat.Equal(o.InputVat) &&
		f.CreditBroughtForward.Equal(o.CreditBroughtForward) && f.TaxAmount.Equal(o.TaxAmount) &&
		f.CreditCarried.Equal(o.CreditCarried)
}

// TaxFiling is one form for one month. Period is the first day of the month.
type TaxFiling struct {
	ID     uint      `gorm:"primarykey" json:"id"`
	Form   string    `gorm:"size:8;not null;uniqueIndex:idx_tax_filings_form_period" json:"form"`
	Period time.Time `gorm:"type:date;not null;uniqueIndex:idx_tax_filings_form_period" json:"period"`
	Status string    `gorm:"size:10;not null;default:open;index" json:"status"`

	// The figures as they stood when the filing was confirmed.
	TaxFigures

	// The hand-off to the accounting firm, who files: when our figures were
	// sent to them, and the amount on the e-tax QR they sent back.
	SentAt    *time.Time      `json:"sent_at,omitempty"`
	DueAmount decimal.Decimal `gorm:"type:numeric(14,2);not null;default:0" json:"due_amount"`
	DueSetAt  *time.Time      `json:"due_set_at,omitempty"`

	// What was actually paid (it can include a surcharge), when, and the
	// Revenue Department's reference.
	PaidAmount decimal.Decimal `gorm:"type:numeric(14,2);not null;default:0" json:"paid_amount"`
	PaidDate   *time.Time      `gorm:"type:date" json:"paid_date,omitempty"`
	Reference  string          `gorm:"size:100;not null;default:''" json:"reference"`
	Note       string          `gorm:"size:500;not null;default:''" json:"note"`

	FiledBy   *uint      `json:"filed_by,omitempty"`
	Filer     *User      `gorm:"foreignKey:FiledBy" json:"filer,omitempty"`
	FiledAt   *time.Time `json:"filed_at,omitempty"`
	CreatedAt time.Time  `json:"created_at"`
	UpdatedAt time.Time  `json:"updated_at"`
}

// TaxLine is one document or payment behind a month's figure.
type TaxLine struct {
	// Kind: output (a tax invoice), credit_note, debit_note, input (an
	// expense's tax invoice), withheld (a payment to a vendor).
	Kind        string          `json:"kind"`
	DocumentID  uint            `json:"document_id"`
	Code        string          `json:"code"`
	Date        time.Time       `json:"date"`
	Name        string          `json:"name"`
	TaxNumber   string          `json:"tax_number"`
	BranchCode  string          `json:"branch_code"`
	InvoiceNo   string          `json:"invoice_no,omitempty"` // the vendor's tax invoice number
	Base        decimal.Decimal `json:"base"`                 // before VAT, or the amount paid before withholding
	Amount      decimal.Decimal `json:"amount"`               // the VAT, or the tax withheld
	PaymentID   *uint           `json:"payment_id,omitempty"`
	WhtCertDone bool            `json:"wht_cert_done,omitempty"`
}

// MonthAmount is one month's total, keyed "YYYY-MM".
type MonthAmount struct {
	Amount decimal.Decimal
	Count  int
}

// Tax filing errors a person can act on.
var (
	ErrTaxFilingFiled    = errors.New("งวดนี้บันทึกว่ายื่นแล้ว")
	ErrTaxFilingNotFiled = errors.New("งวดนี้ยังไม่ได้บันทึกว่ายื่น")
	ErrNoTaxReceipt      = errors.New("แนบใบเสร็จหรือหลักฐานการยื่นจากกรมสรรพากรก่อน")
)

// TaxStore is the data access contract for the monthly tax figures and the
// filings. Months are the first day of the month; to is exclusive.
type TaxStore interface {
	OutputVat(from, to time.Time) (map[string]MonthAmount, error)
	InputVat(from, to time.Time) (map[string]MonthAmount, error)
	// Withheld sums the tax we withheld, by form then month.
	Withheld(from, to time.Time) (map[string]map[string]MonthAmount, error)
	// FirstActivity is the earliest month with anything taxable in it, or nil.
	FirstActivity() (*time.Time, error)
	Lines(form string, period time.Time) ([]TaxLine, error)

	Filings(from, to time.Time) ([]*TaxFiling, error)
	FindFiling(id uint) (*TaxFiling, error)
	// EnsureFiling returns the row for a form and month, creating it open.
	EnsureFiling(form string, period time.Time) (*TaxFiling, error)
	// MarkFiled locks the row, checks a receipt is attached, and stores the
	// figures with what was paid.
	MarkFiled(id, userID uint, figures TaxFigures, paid TaxFiling) (*TaxFiling, error)
	Reopen(id, userID uint, reason string) (*TaxFiling, error)
	// MarkSent: our figures went to the accounting firm.
	MarkSent(id, userID uint) (*TaxFiling, error)
	// SetDue: the amount on the QR the accounting firm sent back.
	SetDue(id, userID uint, amount decimal.Decimal) (*TaxFiling, error)
	Events(filingID uint) ([]*DocumentEvent, error)
}
