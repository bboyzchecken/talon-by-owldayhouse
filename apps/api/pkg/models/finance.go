package models

import (
	"time"

	"github.com/shopspring/decimal"
)

// The finance overview (step 8 of docs/internal-tools/document-system.md):
// sums over the documents and payments already recorded, read-only.
//
// What the words mean, once:
//
//   - Revenue (รายได้): before VAT, on receipts/tax invoices and tax invoices
//     issued (the company issues them only once paid), debit notes added and
//     credit notes taken off, in the month of their date.
//   - Expense (ค่าใช้จ่าย): before VAT on issued expenses, plus the VAT of an
//     expense with no tax invoice (it cannot be claimed, so it is a cost), in
//     the month of the expense.
//   - Cash in/out (เงินเข้า/ออก): what actually moved on active payments.

// MonthTotals is one month of the overview, keyed "YYYY-MM".
type MonthTotals struct {
	Month   string          `json:"month"`
	Revenue decimal.Decimal `json:"revenue"`
	Expense decimal.Decimal `json:"expense"`
	CashIn  decimal.Decimal `json:"cash_in"`
	CashOut decimal.Decimal `json:"cash_out"`
}

// OpenItem is an issued document still owed on: an invoice or billing note
// a customer has not fully paid, or an expense we have not.
type OpenItem struct {
	ID          uint            `json:"id"`
	DocType     int             `json:"doc_type"`
	Code        string          `json:"code"`
	ContactID   uint            `json:"contact_id"`
	ContactName string          `json:"contact_name"`
	LeadID      *uint           `json:"lead_id,omitempty"`
	IssuedDate  time.Time       `json:"issued_date"`
	DueDate     *time.Time      `json:"due_date,omitempty"`
	NetAmount   decimal.Decimal `json:"net_amount"`
	Settled     decimal.Decimal `json:"settled"`
}

// AmountRow is one line of a breakdown: a service, a customer, a job.
type AmountRow struct {
	Key    string          `json:"key"`
	ID     uint            `json:"id,omitempty"`
	Name   string          `json:"name"`
	Amount decimal.Decimal `json:"amount"`
	// Cost is the expenses tied to the same job (job profit only).
	Cost decimal.Decimal `json:"cost"`
}

// MethodRow is money in and out through one payment method.
type MethodRow struct {
	ID   uint            `json:"id"`
	Name string          `json:"name"`
	In   decimal.Decimal `json:"in"`
	Out  decimal.Decimal `json:"out"`
}

// CountSum is how many, and how much.
type CountSum struct {
	Count  int             `json:"count"`
	Amount decimal.Decimal `json:"amount"`
}

// EvidenceFile is a file to put in the month's export, with where it belongs.
type EvidenceFile struct {
	File
	// Folder: slips, wht-received, wht-issued, tax-filings.
	Folder string
	// Label names what it is evidence of (a document code, a tax form).
	Label string
}

// FinanceStore is the data access contract for the overview and the export.
// Ranges are dates, from inclusive and to exclusive.
type FinanceStore interface {
	MonthlyTotals(from, to time.Time) (map[string]MonthTotals, error)
	// OpenReceivables: issued invoices and billing notes not fully settled.
	// A billing note made from an invoice carries that invoice's debt, so the
	// invoice is left out and money recorded on either counts.
	OpenReceivables() ([]OpenItem, error)
	OpenPayables() ([]OpenItem, error)
	RevenueByService(from, to time.Time) ([]AmountRow, error)
	RevenueByCustomer(from, to time.Time, limit int) ([]AmountRow, error)
	JobProfit(from, to time.Time, limit int) ([]AmountRow, error)
	CashByMethod(from, to time.Time) ([]MethodRow, error)
	// WhtCertPending: certificates still owed (direction in: to us; out: by us).
	WhtCertPending(direction string) (CountSum, error)
	// ExpensesWithoutTaxInvoice: issued expenses with VAT but no tax invoice.
	ExpensesWithoutTaxInvoice() (CountSum, error)

	// The export: every document issued or voided in the range with its
	// lines and contact, the payments, and the evidence files.
	ExportDocuments(from, to time.Time) ([]*Document, error)
	ExportPayments(from, to time.Time) ([]*Payment, error)
	EvidenceFiles(from, to time.Time) ([]EvidenceFile, error)
}
