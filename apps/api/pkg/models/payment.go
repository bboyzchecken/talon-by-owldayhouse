package models

import (
	"errors"
	"time"

	"github.com/shopspring/decimal"
)

// Payment directions. "in" is a customer paying us (this step); "out" is us
// paying a vendor (expenses, a later step).
const (
	PaymentIn  = "in"
	PaymentOut = "out"
)

// Payment statuses. A payment recorded by mistake is voided, not deleted,
// and voiding it voids the receipt issued for it.
const (
	PaymentActive = "active"
	PaymentVoided = "voided"
)

// The withholding-tax certificate (หนังสือรับรองการหักภาษี ณ ที่จ่าย, 50 ทวิ)
// that has to change hands when tax is withheld. For money in, the customer
// owes us one; without it the amount withheld cannot be claimed against our
// income tax. For money out, we owe the vendor one.
const (
	WhtCertNone    = "none"    // nothing withheld
	WhtCertPending = "pending" // withheld, certificate not yet in hand / not yet sent
	WhtCertDone    = "done"    // received (in) or sent (out), with the file attached
)

// Payment is money that moved against a document. Settled is what it clears
// off the document: the money that arrived plus what the customer withheld.
type Payment struct {
	ID         uint      `gorm:"primarykey" json:"id"`
	DocumentID uint      `gorm:"not null;index" json:"document_id"`
	Document   *Document `gorm:"foreignKey:DocumentID" json:"document,omitempty"`
	Direction  string    `gorm:"size:4;not null;default:in;index" json:"direction"`
	Status     string    `gorm:"size:10;not null;default:active;index" json:"status"`

	PaymentDate     time.Time      `gorm:"type:date;not null;index" json:"payment_date"`
	PaymentMethodID uint           `gorm:"not null" json:"payment_method_id"`
	PaymentMethod   *PaymentMethod `gorm:"foreignKey:PaymentMethodID" json:"payment_method,omitempty"`

	ReceivedAmount    decimal.Decimal `gorm:"type:numeric(14,2);not null" json:"received_amount"`
	WithholdingAmount decimal.Decimal `gorm:"type:numeric(14,2);not null;default:0" json:"withholding_amount"`
	SettledAmount     decimal.Decimal `gorm:"type:numeric(14,2);not null" json:"settled_amount"`
	Note              string          `gorm:"size:500" json:"note"`

	// The receipt/tax invoice issued for this payment, if one has been.
	ReceiptID *uint     `gorm:"index" json:"receipt_id,omitempty"`
	Receipt   *Document `gorm:"foreignKey:ReceiptID" json:"receipt,omitempty"`

	// WhtForm is the form the withheld tax is filed on (pnd3 / pnd53), taken
	// from the vendor when we pay and withhold. Empty for money in: the
	// customer files that, not us. Kept on the payment so a later edit of the
	// vendor does not move tax already withheld to another form.
	WhtForm string `gorm:"size:8;not null;default:''" json:"wht_form"`

	// WhtRequestedAt: money out only. The 50 ทวิ we owe a vendor is issued by
	// the accounting firm, never by this system; this is when we asked them
	// for it. The copy they send back is attached as payment_wht.
	WhtRequestedAt *time.Time `json:"wht_requested_at,omitempty"`

	WhtCertStatus string     `gorm:"size:10;not null;default:none;index" json:"wht_cert_status"`
	WhtCertAt     *time.Time `json:"wht_cert_at,omitempty"`

	VoidedBy   *uint      `json:"voided_by,omitempty"`
	VoidedAt   *time.Time `json:"voided_at,omitempty"`
	VoidReason string     `gorm:"size:500" json:"void_reason"`

	PeakSync
	CreatedBy uint      `gorm:"not null" json:"created_by"`
	Creator   *User     `gorm:"foreignKey:CreatedBy" json:"creator,omitempty"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// Payment errors a person can act on.
var (
	ErrOverpaid         = errors.New("ยอดที่รับเกินยอดค้างของเอกสาร")
	ErrNotPayable       = errors.New("รับเงินได้เฉพาะใบเสนอราคา ใบแจ้งหนี้ หรือใบวางบิลที่ออกเลขแล้ว")
	ErrPaymentVoided    = errors.New("รายการรับเงินนี้ถูกยกเลิกแล้ว")
	ErrReceiptExists    = errors.New("รายการรับเงินนี้ออกใบเสร็จแล้ว")
	ErrNoWhtCertificate = errors.New("แนบไฟล์หนังสือรับรองการหักภาษี ณ ที่จ่ายก่อน")
	ErrNothingWithheld  = errors.New("รายการนี้ไม่มีการหัก ณ ที่จ่าย")
)

// PaymentFilter narrows the payment list.
type PaymentFilter struct {
	Direction     string
	WhtCertStatus string
	DocumentID    uint
	From, To      *time.Time
	IncludeVoided bool
	Page, Limit   int
}

// ReceiptPlan is a receipt to issue in the same transaction as a payment.
// Build fills it once the source document is locked and its payments so far
// are known, so the amounts can close the balance exactly.
type ReceiptPlan struct {
	Build func(source *Document, settledBefore, vatBefore decimal.Decimal) (*Document, error)
	// Check runs on the built receipt, with its contact, before a number is
	// taken (the tax-invoice rules).
	Check func(*Document) error
}

// PaymentStore is the data access contract for payments.
type PaymentStore interface {
	// Record stores a payment against a locked document. If receipt is set,
	// the receipt is built, numbered and issued in the same transaction.
	Record(payment *Payment, receipt *ReceiptPlan) error
	// IssueReceipt issues the receipt for a payment recorded without one.
	IssueReceipt(paymentID, userID uint, receipt *ReceiptPlan) (*Payment, error)
	Void(paymentID, userID uint, reason string) (*Payment, error)
	MarkWhtCert(paymentID uint) (*Payment, error)
	// MarkWhtRequested records that the accounting firm was asked for the
	// 50 ทวิ of these payments (active, money out, certificate pending). It
	// returns the payments it marked.
	MarkWhtRequested(paymentIDs []uint, userID uint) ([]*Payment, error)
	Find(id uint) (*Payment, error)
	ListByDocument(documentID uint) ([]*Payment, error)
	List(filter PaymentFilter) ([]*Payment, int64, error)
	// Settled sums the active payments of a document.
	Settled(documentID uint) (decimal.Decimal, error)
	// SettledFor sums the active payments of many documents at once.
	SettledFor(documentIDs []uint) (map[uint]decimal.Decimal, error)
}

// ErrHasPayments means a document still has money recorded against it.
var ErrHasPayments = errors.New("เอกสารนี้มีการรับ/จ่ายเงินแล้ว ยกเลิกรายการเงินก่อน แล้วจึงยกเลิกเอกสาร")
