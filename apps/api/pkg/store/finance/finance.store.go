// Package finance is the read-only repository behind the finance overview
// and the monthly export for the accounting firm. What each figure counts is
// written down on models.FinanceStore.
package finance

import (
	"time"

	"github.com/shopspring/decimal"
	"go.uber.org/fx"
	"gorm.io/gorm"

	"github.com/owldayhouse/odh-internal-api/pkg/models"
)

type financeStoreService struct {
	db *gorm.DB
}

// New builds the finance repository.
func New(db *gorm.DB) models.FinanceStore {
	return &financeStoreService{db: db}
}

// Module is the FX wiring for this repository.
var Module = fx.Module("store.finance", fx.Provide(New))

// The SQL pieces shared below. revenueSign is +1 for a receipt, tax invoice
// or debit note, −1 for a credit note, and nothing counts otherwise.
const (
	revenueDocs = `d.status = 'issued' AND d.doc_type IN (103, 104, 105, 107)`
	revenueSign = `CASE WHEN d.doc_type = 105 THEN -1 ELSE 1 END`
	expenseDocs = `d.status = 'issued' AND d.doc_type = 202`
	// An expense costs its pre-VAT amount, and its VAT too when there is no
	// tax invoice to claim it with.
	expenseCost = `d.pre_tax_amount + CASE WHEN d.received_tax_invoice_number = '' THEN d.vat_amount ELSE 0 END`
)

func (s *financeStoreService) MonthlyTotals(from, to time.Time) (map[string]models.MonthTotals, error) {
	var rows []struct {
		Month  string
		Kind   string
		Amount decimal.Decimal
	}
	err := s.db.Raw(`
		SELECT to_char(d.issued_date, 'YYYY-MM') AS month, 'revenue' AS kind,
		       COALESCE(SUM(`+revenueSign+` * d.pre_tax_amount), 0) AS amount
		FROM documents d WHERE `+revenueDocs+` AND d.issued_date >= ? AND d.issued_date < ? GROUP BY 1
		UNION ALL
		SELECT to_char(d.issued_date, 'YYYY-MM'), 'expense', COALESCE(SUM(`+expenseCost+`), 0)
		FROM documents d WHERE `+expenseDocs+` AND d.issued_date >= ? AND d.issued_date < ? GROUP BY 1
		UNION ALL
		SELECT to_char(p.payment_date, 'YYYY-MM'), 'cash_' || p.direction, COALESCE(SUM(p.received_amount), 0)
		FROM payments p WHERE p.status = 'active' AND p.payment_date >= ? AND p.payment_date < ? GROUP BY 1, p.direction`,
		from, to, from, to, from, to).Scan(&rows).Error
	if err != nil {
		return nil, err
	}
	out := map[string]models.MonthTotals{}
	for _, r := range rows {
		m := out[r.Month]
		m.Month = r.Month
		switch r.Kind {
		case "revenue":
			m.Revenue = r.Amount
		case "expense":
			m.Expense = r.Amount
		case "cash_in":
			m.CashIn = r.Amount
		case "cash_out":
			m.CashOut = r.Amount
		}
		out[r.Month] = m
	}
	return out, nil
}

// openItems lists issued documents with what was settled on them. extra is
// added to each document's own payments (a billing note also counts what was
// paid on its invoice).
func (s *financeStoreService) openItems(where string, settled string) ([]models.OpenItem, error) {
	var rows []models.OpenItem
	err := s.db.Raw(`
		SELECT d.id, d.doc_type, d.code, d.contact_id, COALESCE(c.name, '') AS contact_name, d.lead_id,
		       d.issued_date, d.due_date, d.net_amount, ` + settled + ` AS settled
		FROM documents d LEFT JOIN billing_contacts c ON c.id = d.contact_id
		WHERE ` + where + `
		ORDER BY COALESCE(d.due_date, d.issued_date), d.id`).Scan(&rows).Error
	if err != nil {
		return nil, err
	}
	open := rows[:0]
	for _, r := range rows {
		if r.NetAmount.Sub(r.Settled).IsPositive() {
			open = append(open, r)
		}
	}
	return open, nil
}

const ownPayments = `(SELECT COALESCE(SUM(p.settled_amount), 0) FROM payments p WHERE p.status = 'active' AND p.document_id = d.id)`

func (s *financeStoreService) OpenReceivables() ([]models.OpenItem, error) {
	return s.openItems(`d.status = 'issued' AND (
			d.doc_type = 106 OR (d.doc_type = 102 AND NOT EXISTS (
				SELECT 1 FROM documents b WHERE b.source_document_id = d.id AND b.doc_type = 106 AND b.status = 'issued')))`,
		ownPayments+` + CASE WHEN d.doc_type = 106 AND d.source_document_id IS NOT NULL THEN
			(SELECT COALESCE(SUM(p.settled_amount), 0) FROM payments p WHERE p.status = 'active' AND p.document_id = d.source_document_id)
			ELSE 0 END`)
}

func (s *financeStoreService) OpenPayables() ([]models.OpenItem, error) {
	return s.openItems(expenseDocs, ownPayments)
}

// RevenueByService splits each receipt over the lines of the document it was
// issued for, in proportion to their amounts, by the service of the product
// on each line. Lines without a product, and notes, are "other".
func (s *financeStoreService) RevenueByService(from, to time.Time) ([]models.AmountRow, error) {
	var rows []models.AmountRow
	err := s.db.Raw(`
		WITH r AS (
			SELECT d.id, d.source_document_id, `+revenueSign+` * d.pre_tax_amount AS amount
			FROM documents d WHERE `+revenueDocs+` AND d.issued_date >= ? AND d.issued_date < ?
		), lines AS (
			SELECT i.document_id, COALESCE(NULLIF(p.interest, ''), 'other') AS service, i.line_amount,
			       SUM(i.line_amount) OVER (PARTITION BY i.document_id) AS total
			FROM document_items i LEFT JOIN products p ON p.id = i.product_id
			WHERE NOT i.is_description AND i.document_id IN (SELECT source_document_id FROM r)
		), split AS (
			SELECT l.service AS key, r.amount * l.line_amount / l.total AS amount
			FROM r JOIN lines l ON l.document_id = r.source_document_id AND l.total <> 0
			UNION ALL
			SELECT 'other', r.amount FROM r
			WHERE r.source_document_id IS NULL OR NOT EXISTS (
				SELECT 1 FROM lines l WHERE l.document_id = r.source_document_id AND l.total <> 0)
		)
		SELECT key, ROUND(SUM(amount), 2) AS amount FROM split GROUP BY key ORDER BY amount DESC`,
		from, to).Scan(&rows).Error
	return rows, err
}

func (s *financeStoreService) RevenueByCustomer(from, to time.Time, limit int) ([]models.AmountRow, error) {
	var rows []models.AmountRow
	err := s.db.Raw(`
		SELECT d.contact_id AS id, COALESCE(c.name, '') AS name, SUM(`+revenueSign+` * d.pre_tax_amount) AS amount
		FROM documents d LEFT JOIN billing_contacts c ON c.id = d.contact_id
		WHERE `+revenueDocs+` AND d.issued_date >= ? AND d.issued_date < ?
		GROUP BY d.contact_id, c.name ORDER BY amount DESC LIMIT ?`, from, to, limit).Scan(&rows).Error
	return rows, err
}

// JobProfit: revenue and expenses tied to the same lead.
func (s *financeStoreService) JobProfit(from, to time.Time, limit int) ([]models.AmountRow, error) {
	var rows []models.AmountRow
	err := s.db.Raw(`
		WITH money AS (
			SELECT d.lead_id, `+revenueSign+` * d.pre_tax_amount AS revenue, 0 AS cost
			FROM documents d WHERE `+revenueDocs+` AND d.lead_id IS NOT NULL AND d.issued_date >= ? AND d.issued_date < ?
			UNION ALL
			SELECT d.lead_id, 0, `+expenseCost+`
			FROM documents d WHERE `+expenseDocs+` AND d.lead_id IS NOT NULL AND d.issued_date >= ? AND d.issued_date < ?
		)
		SELECT m.lead_id AS id, COALESCE(l.name, '') AS name, SUM(m.revenue) AS amount, SUM(m.cost) AS cost
		FROM money m LEFT JOIN leads l ON l.id = m.lead_id
		GROUP BY m.lead_id, l.name ORDER BY SUM(m.revenue) - SUM(m.cost) DESC LIMIT ?`,
		from, to, from, to, limit).Scan(&rows).Error
	return rows, err
}

func (s *financeStoreService) CashByMethod(from, to time.Time) ([]models.MethodRow, error) {
	var rows []models.MethodRow
	err := s.db.Raw(`
		SELECT m.id, m.name,
		       COALESCE(SUM(p.received_amount) FILTER (WHERE p.direction = 'in'), 0) AS "in",
		       COALESCE(SUM(p.received_amount) FILTER (WHERE p.direction = 'out'), 0) AS "out"
		FROM payments p JOIN payment_methods m ON m.id = p.payment_method_id
		WHERE p.status = 'active' AND p.payment_date >= ? AND p.payment_date < ?
		GROUP BY m.id, m.name ORDER BY m.id`, from, to).Scan(&rows).Error
	return rows, err
}

func (s *financeStoreService) WhtCertPending(direction string) (models.CountSum, error) {
	var out models.CountSum
	err := s.db.Raw(`
		SELECT COUNT(*) AS count, COALESCE(SUM(withholding_amount), 0) AS amount
		FROM payments WHERE status = 'active' AND direction = ? AND wht_cert_status = 'pending'`, direction).Scan(&out).Error
	return out, err
}

func (s *financeStoreService) ExpensesWithoutTaxInvoice() (models.CountSum, error) {
	var out models.CountSum
	err := s.db.Raw(`
		SELECT COUNT(*) AS count, COALESCE(SUM(d.vat_amount), 0) AS amount
		FROM documents d WHERE ` + expenseDocs + ` AND d.received_tax_invoice_number = '' AND d.vat_amount > 0`).Scan(&out).Error
	return out, err
}

func (s *financeStoreService) ExportDocuments(from, to time.Time) ([]*models.Document, error) {
	var rows []*models.Document
	err := s.db.Preload("Items", func(db *gorm.DB) *gorm.DB { return db.Order("position") }).
		Preload("Items.Product").Preload("Contact").Preload("SourceDocument").
		Where("status IN ? AND issued_date >= ? AND issued_date < ?",
			[]string{models.DocStatusIssued, models.DocStatusVoided}, from, to).
		Order("doc_type, code").Find(&rows).Error
	return rows, err
}

func (s *financeStoreService) ExportPayments(from, to time.Time) ([]*models.Payment, error) {
	var rows []*models.Payment
	err := s.db.Preload("PaymentMethod").Preload("Receipt").Preload("Document").Preload("Document.Contact").
		Where("payment_date >= ? AND payment_date < ?", from, to).
		Order("direction, payment_date, id").Find(&rows).Error
	return rows, err
}

func (s *financeStoreService) EvidenceFiles(from, to time.Time) ([]models.EvidenceFile, error) {
	var rows []struct {
		models.File
		Folder string
		Label  string
	}
	err := s.db.Raw(`
		SELECT f.*, CASE f.owner_type
		           WHEN 'payment' THEN 'slips'
		           WHEN 'payment_wht' THEN CASE WHEN p.direction = 'in' THEN 'wht-received' ELSE 'wht-issued' END
		       END AS folder, d.code AS label
		FROM files f JOIN payments p ON p.id = f.owner_id JOIN documents d ON d.id = p.document_id
		WHERE f.owner_type IN ('payment', 'payment_wht') AND f.status = 'ready'
		  AND p.status = 'active' AND p.payment_date >= ? AND p.payment_date < ?
		UNION ALL
		SELECT f.*, 'tax-filings', t.form || '-' || to_char(t.period, 'YYYY-MM')
		FROM files f JOIN tax_filings t ON t.id = f.owner_id
		WHERE f.owner_type = 'tax_filing' AND f.status = 'ready' AND t.period >= ? AND t.period < ?
		ORDER BY 1`, from, to, from, to).Scan(&rows).Error
	if err != nil {
		return nil, err
	}
	out := make([]models.EvidenceFile, len(rows))
	for i, r := range rows {
		out[i] = models.EvidenceFile{File: r.File, Folder: r.Folder, Label: r.Label}
	}
	return out, nil
}
