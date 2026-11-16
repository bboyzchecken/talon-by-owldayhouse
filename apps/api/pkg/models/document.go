package models

import (
	"errors"
	"strings"
	"time"

	"github.com/lib/pq"
	"github.com/shopspring/decimal"
)

// The sales document system: quotations, invoices, receipts/tax invoices,
// credit and debit notes, billing notes, and expenses, all in one shape.
//
// The tables follow PEAK's own model (docs/internal-tools/document-system.md,
// "ต่อกับ PEAK"): column names are ours, in snake_case, but every enum value
// is PEAK's own number, so a later adapter (pkg/peak) only renames fields and
// reformats dates. Money is decimal, never float: a tax document has to show
// to the satang what was printed.

// Document types. The values are PEAK's TransactionType numbers.
const (
	DocQuotation   = 101
	DocInvoice     = 102
	DocReceipt     = 103 // our receipt doubles as the tax invoice (is_tax_invoice)
	DocTaxInvoice  = 104
	DocCreditNote  = 105
	DocBillingNote = 106
	DocDebitNote   = 107
	DocExpense     = 202
)

// DocumentTypes lists every type the system issues or records.
func DocumentTypes() []int {
	return []int{
		DocQuotation, DocInvoice, DocReceipt, DocTaxInvoice,
		DocCreditNote, DocBillingNote, DocDebitNote, DocExpense,
	}
}

// Document statuses. A number is reserved only when a draft is issued, and an
// issued document is never deleted or edited: it is voided, keeping its number.
const (
	DocStatusDraft  = "draft"
	DocStatusIssued = "issued"
	DocStatusVoided = "voided"
)

// Tax status of a document, PEAK's taxStatus.
const (
	TaxExclusive = 0 // prices are before VAT
	TaxInclusive = 1 // prices include VAT
)

// VAT type of a line, PEAK's vatType.
const (
	VatNone  = 1
	VatZero  = 2
	VatSeven = 3
)

// Contact types, PEAK's ContactType.
const (
	ContactLimitedPartnership = 1
	ContactCompany            = 2
	ContactPublicCompany      = 3
	ContactShop               = 4
	ContactPerson             = 5
	ContactBodyOfPersons      = 6
	ContactOther              = 7
	ContactOrdinaryPartner    = 8
	ContactFoundation         = 9
	ContactAssociation        = 10
	ContactJointVenture       = 11
)

// Which side of the business a contact is on (PEAK's contactFinanceType).
const (
	FinanceCustomer = "customer"
	FinanceVendor   = "vendor"
	FinanceBoth     = "both"
)

// Withholding-tax forms. Which one applies depends on who was paid.
const (
	WhtFormPND3  = "pnd3"  // individuals and non-juristic groups
	WhtFormPND53 = "pnd53" // juristic persons
)

// DefaultWhtForm is the form a contact type files under. It is a default the
// person can change: a shop (4) can be either.
func DefaultWhtForm(contactType int) string {
	switch contactType {
	case ContactPerson, ContactBodyOfPersons, ContactOrdinaryPartner, ContactShop:
		return WhtFormPND3
	default:
		return WhtFormPND53
	}
}

// PeakSync is carried by every table that can later be sent to PEAK. It stays
// empty until the adapter exists.
type PeakSync struct {
	PeakID        string     `gorm:"size:64;index" json:"peak_id,omitempty"`
	PeakSyncedAt  *time.Time `json:"peak_synced_at,omitempty"`
	PeakSyncError string     `gorm:"size:500" json:"peak_sync_error,omitempty"`
}

// BillingContact is a customer, a vendor or both — PEAK keeps one register,
// so do we. (PEAK calls it a contact; ours is named apart from the Lead
// Tracker's Contact, which is a person at a lead.)
// It can belong to a lead in the Lead Tracker, and a lead can have several
// (head office and a branch, say).
type BillingContact struct {
	ID          uint   `gorm:"primarykey" json:"id"`
	Code        string `gorm:"size:32;not null;uniqueIndex" json:"code"`
	Name        string `gorm:"size:255;not null" json:"name"`
	ContactType int    `gorm:"not null;default:2" json:"contact_type"`
	NamePrefix  int    `gorm:"not null;default:0" json:"name_prefix"` // PEAK prefixNameType, for a person
	FinanceSide string `gorm:"size:16;not null;default:customer;index" json:"finance_side"`
	WhtForm     string `gorm:"size:8;not null;default:pnd53" json:"wht_form"`

	TaxNumber  string `gorm:"size:20;index" json:"tax_number"`
	BranchCode string `gorm:"size:5;not null;default:00000" json:"branch_code"`

	Address     string `gorm:"size:500" json:"address"`
	SubDistrict string `gorm:"size:100" json:"sub_district"`
	District    string `gorm:"size:100" json:"district"`
	Province    string `gorm:"size:100" json:"province"`
	PostCode    string `gorm:"size:10" json:"post_code"`
	Country     string `gorm:"size:100;not null;default:Thailand" json:"country"`

	PersonFirstName string `gorm:"size:100" json:"person_first_name"`
	PersonLastName  string `gorm:"size:100" json:"person_last_name"`
	PersonPosition  string `gorm:"size:100" json:"person_position"`
	PersonPhone     string `gorm:"size:40" json:"person_phone"`
	PersonEmail     string `gorm:"size:200" json:"person_email"`

	LeadID *uint `gorm:"index" json:"lead_id,omitempty"`
	Lead   *Lead `gorm:"foreignKey:LeadID" json:"lead,omitempty"`

	PeakSync
	CreatedBy uint      `gorm:"not null" json:"created_by"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// Product is an item sold or bought often. Almost everything here is a
// service (product_type 2).
type Product struct {
	ID          uint            `gorm:"primarykey" json:"id"`
	Code        string          `gorm:"size:32;not null;uniqueIndex" json:"code"`
	Name        string          `gorm:"size:255;not null" json:"name"`
	Description string          `gorm:"size:1000" json:"description"`
	ProductType int             `gorm:"not null;default:2" json:"product_type"` // 1 product · 2 service
	UnitName    string          `gorm:"size:50" json:"unit_name"`
	SellPrice   decimal.Decimal `gorm:"type:numeric(14,2);not null;default:0" json:"sell_price"`
	SellVatType int             `gorm:"not null;default:3" json:"sell_vat_type"`
	// Interest ties the item to one of the Lead Tracker's six services, for
	// revenue by service.
	Interest string `gorm:"size:32" json:"interest"`
	Active   bool   `gorm:"not null;default:true" json:"active"`

	PeakSync
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// Payment-method kinds, PEAK's PaymentMethod Type.
const (
	PayMethodCash    = 1
	PayMethodBank    = 2
	PayMethodEWallet = 4
)

// PaymentMethod is where money comes in or goes out: cash, a bank account.
type PaymentMethod struct {
	ID         uint   `gorm:"primarykey" json:"id"`
	Code       string `gorm:"size:32;not null;uniqueIndex" json:"code"`
	Name       string `gorm:"size:200;not null" json:"name"`
	MethodType int    `gorm:"not null;default:2" json:"method_type"`
	BankName   string `gorm:"size:100" json:"bank_name"`
	AccountNo  string `gorm:"size:40" json:"account_no"`
	Active     bool   `gorm:"not null;default:true" json:"active"`

	PeakSync
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// Document is one quotation, invoice, receipt/tax invoice, note or expense.
//
// Code is empty while it is a draft. It is reserved, in the same transaction
// that issues the document, from document_counters (pkg/docnumber), so a
// discarded draft never uses up a number and two people issuing at once can
// never get the same one. The totals are stored as computed and never
// recomputed on read: the document has to show forever what was printed.
type Document struct {
	ID      uint   `gorm:"primarykey" json:"id"`
	DocType int    `gorm:"not null;index" json:"doc_type"`
	Code    string `gorm:"size:40;not null;default:''" json:"code"`
	Status  string `gorm:"size:16;not null;default:draft;index" json:"status"`

	ContactID uint            `gorm:"not null;index" json:"contact_id"`
	Contact   *BillingContact `gorm:"foreignKey:ContactID" json:"contact,omitempty"`
	// LeadID is copied from the contact when the document is created, so the
	// Lead Tracker can show a customer's documents without a join through
	// contacts, and keeps them if the contact is later re-linked.
	LeadID *uint `gorm:"index" json:"lead_id,omitempty"`

	// The buyer (or vendor) as they were when the document was issued. A tax
	// invoice must keep showing these even if the contact is edited later,
	// so they are copied at issue and printed from here, never from the
	// contact. Empty on a draft.
	BuyerName        string `gorm:"size:255;not null;default:''" json:"buyer_name"`
	BuyerContactType int    `gorm:"not null;default:0" json:"buyer_contact_type"`
	BuyerTaxNumber   string `gorm:"size:20;not null;default:''" json:"buyer_tax_number"`
	BuyerBranchCode  string `gorm:"size:5;not null;default:''" json:"buyer_branch_code"`
	BuyerAddress     string `gorm:"size:1000;not null;default:''" json:"buyer_address"`

	IssuedDate time.Time      `gorm:"type:date;not null;index" json:"issued_date"`
	DueDate    *time.Time     `gorm:"type:date" json:"due_date,omitempty"`
	Reference  string         `gorm:"size:200" json:"reference"`
	Remark     string         `gorm:"size:2000" json:"remark"`
	Tags       pq.StringArray `gorm:"type:text[]" json:"tags"`

	TaxStatus     int             `gorm:"not null;default:0" json:"tax_status"`
	IsTaxInvoice  bool            `gorm:"not null;default:false" json:"is_tax_invoice"`
	DiscountTotal decimal.Decimal `gorm:"type:numeric(14,2);not null;default:0" json:"discount_total"`
	PreTaxAmount  decimal.Decimal `gorm:"type:numeric(14,2);not null;default:0" json:"pre_tax_amount"`
	VatAmount     decimal.Decimal `gorm:"type:numeric(14,2);not null;default:0" json:"vat_amount"`
	NetAmount     decimal.Decimal `gorm:"type:numeric(14,2);not null;default:0" json:"net_amount"`
	// WithholdingTotal is what is expected to be withheld across the lines;
	// what actually was is on the payment.
	WithholdingTotal decimal.Decimal `gorm:"type:numeric(14,2);not null;default:0" json:"withholding_total"`

	// SourceDocumentID is the document this one was made from: the
	// quotation behind an invoice, the invoice behind a receipt.
	SourceDocumentID *uint     `gorm:"index" json:"source_document_id,omitempty"`
	SourceDocument   *Document `gorm:"foreignKey:SourceDocumentID" json:"source_document,omitempty"`

	// Expenses only: the vendor's tax invoice. Without a number the input VAT
	// cannot be claimed. InputVatPeriod is the month it is claimed in (any
	// day of that month), at most six months after the invoice date.
	ReceivedTaxInvoiceNumber string     `gorm:"size:60" json:"received_tax_invoice_number"`
	ReceivedTaxInvoiceDate   *time.Time `gorm:"type:date" json:"received_tax_invoice_date,omitempty"`
	InputVatPeriod           *time.Time `gorm:"type:date;index" json:"input_vat_period,omitempty"`

	IssuedBy   *uint      `json:"issued_by,omitempty"`
	IssuedAt   *time.Time `json:"issued_at,omitempty"`
	VoidedBy   *uint      `json:"voided_by,omitempty"`
	VoidedAt   *time.Time `json:"voided_at,omitempty"`
	VoidReason string     `gorm:"size:500" json:"void_reason"`

	Items []DocumentItem `gorm:"foreignKey:DocumentID" json:"items,omitempty"`

	PeakSync
	CreatedBy uint      `gorm:"not null;index" json:"created_by"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// DocumentItem is one line. A description-only line (a heading or a note
// between lines) has IsDescription set and no amounts.
type DocumentItem struct {
	ID            uint            `gorm:"primarykey" json:"id"`
	DocumentID    uint            `gorm:"not null;index" json:"document_id"`
	Position      int             `gorm:"not null" json:"position"`
	ProductID     *uint           `gorm:"index" json:"product_id,omitempty"`
	Product       *Product        `gorm:"foreignKey:ProductID" json:"product,omitempty"`
	Description   string          `gorm:"size:2000" json:"description"`
	IsDescription bool            `gorm:"not null;default:false" json:"is_description"`
	Quantity      decimal.Decimal `gorm:"type:numeric(14,4);not null;default:0" json:"quantity"`
	UnitName      string          `gorm:"size:50" json:"unit_name"`
	Price         decimal.Decimal `gorm:"type:numeric(14,2);not null;default:0" json:"price"`
	// Discount is an amount, or a percentage written with % (PEAK's format).
	Discount string `gorm:"size:20" json:"discount"`
	VatType  int    `gorm:"not null;default:3" json:"vat_type"`
	// WithholdingRate is a percentage of the line's net amount (3 = 3%).
	WithholdingRate   decimal.Decimal `gorm:"type:numeric(5,2);not null;default:0" json:"withholding_rate"`
	LineAmount        decimal.Decimal `gorm:"type:numeric(14,2);not null;default:0" json:"line_amount"`
	WithholdingAmount decimal.Decimal `gorm:"type:numeric(14,2);not null;default:0" json:"withholding_amount"`
}

// Numbering resets.
const (
	ResetMonthly = "monthly"
	ResetYearly  = "yearly"
)

// DocumentNumbering is how one document type's numbers look:
// Prefix + "-" + period + sequence padded to Digits. The default is PEAK's
// own (QO-202611 then 00001), which is also what owl-docs has been printing.
type DocumentNumbering struct {
	DocType   int       `gorm:"primarykey;autoIncrement:false" json:"doc_type"`
	Prefix    string    `gorm:"size:10;not null" json:"prefix"`
	Reset     string    `gorm:"size:10;not null;default:monthly" json:"reset"`
	Digits    int       `gorm:"not null;default:5" json:"digits"`
	UpdatedBy *uint     `json:"updated_by,omitempty"`
	UpdatedAt time.Time `json:"updated_at"`
}

// DocumentCounter holds the next sequence number for one document type in
// one period. A row is locked while a number is taken from it, so two
// transactions can never take the same number.
type DocumentCounter struct {
	ID        uint      `gorm:"primarykey" json:"id"`
	DocType   int       `gorm:"not null;uniqueIndex:idx_document_counters_type_period" json:"doc_type"`
	Period    string    `gorm:"size:8;not null;uniqueIndex:idx_document_counters_type_period" json:"period"`
	NextValue int64     `gorm:"not null;default:1" json:"next_value"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// Document event actions.
const (
	DocEventCreated      = "created"
	DocEventEdited       = "edited"
	DocEventIssued       = "issued"
	DocEventEmailDrafted = "email_drafted" // a draft for the person to send themselves
	DocEventSent         = "sent"          // the person says they sent it
	DocEventVoided       = "voided"
	DocEventPayment      = "payment"
	DocEventNumberSet    = "number_set" // an admin moved a counter
	// A change that moves the figures of a tax month already filed, made
	// after the person confirmed it.
	DocEventFiledPeriod = "filed_period_edit"
	// A monthly tax filing confirmed, or reopened (tax_filing_id is set).
	DocEventTaxFiled    = "tax_filed"
	DocEventTaxReopened = "tax_reopened"
)

// DocumentEvent is the log of who did what to a document, and when.
type DocumentEvent struct {
	ID         uint  `gorm:"primarykey" json:"id"`
	DocumentID *uint `gorm:"index" json:"document_id,omitempty"`
	// TaxFilingID is set on the events of a monthly tax filing.
	TaxFilingID *uint     `gorm:"index" json:"tax_filing_id,omitempty"`
	UserID      uint      `gorm:"not null;index" json:"user_id"`
	User        *User     `gorm:"foreignKey:UserID" json:"user,omitempty"`
	Action      string    `gorm:"size:32;not null" json:"action"`
	Note        string    `gorm:"size:1000" json:"note"`
	CreatedAt   time.Time `gorm:"index" json:"created_at"`
}

// Errors the document store returns for a document in the wrong state.
var (
	ErrDocumentNotDraft  = errors.New("เอกสารนี้ออกเลขแล้ว แก้ไขหรือลบไม่ได้ ต้องยกเลิกแล้วออกใหม่")
	ErrDocumentNotIssued = errors.New("ยกเลิกได้เฉพาะเอกสารที่ออกเลขแล้วและยังไม่ถูกยกเลิก")
)

// DocumentFilter narrows the document list.
type DocumentFilter struct {
	DocType   int
	Status    string
	ContactID uint
	LeadID    uint
	// OwnerUserID limits the list to documents of leads this person owns —
	// how a sales account sees only its own customers' documents.
	OwnerUserID *uint
	From, To    *time.Time // issued_date range, inclusive
	Search      string     // code, contact name or reference
	Page, Limit int
}

// DocumentStore is the data access contract for documents. Every method that
// changes a document's state locks its row first, so two people acting on
// one document at once cannot both succeed.
type DocumentStore interface {
	CreateDraft(doc *Document, userID uint) error
	UpdateDraft(doc *Document, userID uint) error
	DeleteDraft(id uint) error
	// Issue reserves a number (pkg/docnumber) and issues the draft in one
	// transaction. check runs inside it, on the locked row, so a rule like
	// "the contact needs a tax ID" is judged on what is actually issued.
	Issue(id, userID uint, check func(*Document) error) (*Document, error)
	Void(id, userID uint, reason string) (*Document, error)
	Find(id uint) (*Document, error)
	List(filter DocumentFilter) ([]*Document, int64, error)
	AddEvent(event *DocumentEvent) error
	ListEvents(documentID uint) ([]*DocumentEvent, error)
	FindContact(id uint) (*BillingContact, error)
}

// FullAddress is the contact's address on one line, as printed.
func (c *BillingContact) FullAddress() string {
	parts := []string{}
	for _, p := range []string{c.Address, c.SubDistrict, c.District, c.Province, c.PostCode} {
		if p != "" {
			parts = append(parts, p)
		}
	}
	return strings.Join(parts, " ")
}
