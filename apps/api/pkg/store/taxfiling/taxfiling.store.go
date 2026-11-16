// Package taxfiling is the repository for the monthly tax figures and the
// filings that lock them.
//
// The figures are sums over documents and payments, grouped by month. What
// counts where is decided here, once:
//
//   - Output VAT: issued tax invoices (a receipt that is a tax invoice, or a
//     tax invoice) and debit notes in the month of their date; credit notes
//     subtract.
//   - Input VAT: issued expenses with the vendor's tax invoice number, in the
//     month chosen to claim it (input_vat_period, else the tax invoice's
//     date, else the expense's date). Without a tax invoice nothing counts.
//   - Withholding: active payments out with tax withheld, by the form kept on
//     the payment, in the month of the payment.
package taxfiling

import (
	"database/sql"
	"time"

	"github.com/shopspring/decimal"
	"go.uber.org/fx"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"

	"github.com/owldayhouse/odh-internal-api/pkg/docmath"
	"github.com/owldayhouse/odh-internal-api/pkg/leadrules"
	"github.com/owldayhouse/odh-internal-api/pkg/models"
)

type taxStoreService struct {
	db *gorm.DB
}

// New builds the tax repository.
func New(db *gorm.DB) models.TaxStore {
	return &taxStoreService{db: db}
}

// Module is the FX wiring for this repository.
var Module = fx.Module("store.taxfiling", fx.Provide(New))

// The SQL pieces shared by the sums and the line lists.
const (
	outputWhere = `d.status = 'issued' AND (
		(d.doc_type IN (103, 104) AND d.is_tax_invoice) OR d.doc_type IN (105, 107))`
	inputMonth = `COALESCE(d.input_vat_period, d.received_tax_invoice_date, d.issued_date)`
	inputWhere = `d.status = 'issued' AND d.doc_type = 202 AND d.received_tax_invoice_number <> ''`
	paidWhere  = `p.status = 'active' AND p.direction = 'out' AND p.withholding_amount > 0`
)

type monthRow struct {
	Month  string
	Form   string
	Amount decimal.Decimal
	Count  int
}

func toMap(rows []monthRow) map[string]models.MonthAmount {
	out := map[string]models.MonthAmount{}
	for _, r := range rows {
		out[r.Month] = models.MonthAmount{Amount: r.Amount, Count: r.Count}
	}
	return out
}

func (s *taxStoreService) OutputVat(from, to time.Time) (map[string]models.MonthAmount, error) {
	var rows []monthRow
	err := s.db.Raw(`
		SELECT to_char(d.issued_date, 'YYYY-MM') AS month,
		       COALESCE(SUM(CASE WHEN d.doc_type = 105 THEN -d.vat_amount ELSE d.vat_amount END), 0) AS amount,
		       COUNT(*) AS count
		FROM documents d
		WHERE `+outputWhere+` AND d.issued_date >= ? AND d.issued_date < ?
		GROUP BY 1`, from, to).Scan(&rows).Error
	return toMap(rows), err
}

func (s *taxStoreService) InputVat(from, to time.Time) (map[string]models.MonthAmount, error) {
	var rows []monthRow
	err := s.db.Raw(`
		SELECT to_char(`+inputMonth+`, 'YYYY-MM') AS month,
		       COALESCE(SUM(d.vat_amount), 0) AS amount, COUNT(*) AS count
		FROM documents d
		WHERE `+inputWhere+` AND `+inputMonth+` >= ? AND `+inputMonth+` < ?
		GROUP BY 1`, from, to).Scan(&rows).Error
	return toMap(rows), err
}

func (s *taxStoreService) Withheld(from, to time.Time) (map[string]map[string]models.MonthAmount, error) {
	var rows []monthRow
	err := s.db.Raw(`
		SELECT to_char(p.payment_date, 'YYYY-MM') AS month, p.wht_form AS form,
		       COALESCE(SUM(p.withholding_amount), 0) AS amount, COUNT(*) AS count
		FROM payments p
		WHERE `+paidWhere+` AND p.payment_date >= ? AND p.payment_date < ?
		GROUP BY 1, 2`, from, to).Scan(&rows).Error
	if err != nil {
		return nil, err
	}
	out := map[string]map[string]models.MonthAmount{}
	for _, r := range rows {
		if out[r.Form] == nil {
			out[r.Form] = map[string]models.MonthAmount{}
		}
		out[r.Form][r.Month] = models.MonthAmount{Amount: r.Amount, Count: r.Count}
	}
	return out, nil
}

func (s *taxStoreService) FirstActivity() (*time.Time, error) {
	// sql.NullTime: with nothing taxable yet, MIN is NULL, which a plain
	// *time.Time cannot be scanned from.
	var first sql.NullTime
	err := s.db.Raw(`
		SELECT MIN(m) FROM (
			SELECT MIN(d.issued_date) AS m FROM documents d WHERE ` + outputWhere + `
			UNION ALL
			SELECT MIN(` + inputMonth + `) FROM documents d WHERE ` + inputWhere + `
			UNION ALL
			SELECT MIN(p.payment_date) FROM payments p WHERE ` + paidWhere + `
		) t`).Scan(&first).Error
	if err != nil || !first.Valid {
		return nil, err
	}
	month := time.Date(first.Time.Year(), first.Time.Month(), 1, 0, 0, 0, 0, leadrules.Bangkok)
	return &month, nil
}

func (s *taxStoreService) Lines(form string, period time.Time) ([]models.TaxLine, error) {
	end := period.AddDate(0, 1, 0)
	if form == models.TaxFormPP30 {
		var docs []models.Document
		if err := s.db.Table("documents d").Select("d.*").
			Where(outputWhere+" AND d.issued_date >= ? AND d.issued_date < ?", period, end).
			Order("d.issued_date, d.code").Find(&docs).Error; err != nil {
			return nil, err
		}
		var expenses []models.Document
		if err := s.db.Table("documents d").Select("d.*").
			Where(inputWhere+" AND "+inputMonth+" >= ? AND "+inputMonth+" < ?", period, end).
			Order("d.received_tax_invoice_date, d.code").Find(&expenses).Error; err != nil {
			return nil, err
		}
		lines := make([]models.TaxLine, 0, len(docs)+len(expenses))
		for _, d := range docs {
			kind, amount := "output", d.VatAmount
			switch d.DocType {
			case models.DocCreditNote:
				kind, amount = "credit_note", d.VatAmount.Neg()
			case models.DocDebitNote:
				kind = "debit_note"
			}
			lines = append(lines, models.TaxLine{
				Kind: kind, DocumentID: d.ID, Code: d.Code, Date: d.IssuedDate,
				Name: d.BuyerName, TaxNumber: d.BuyerTaxNumber, BranchCode: d.BuyerBranchCode,
				Base: d.PreTaxAmount, Amount: amount,
			})
		}
		for _, d := range expenses {
			date := d.IssuedDate
			if d.ReceivedTaxInvoiceDate != nil {
				date = *d.ReceivedTaxInvoiceDate
			}
			lines = append(lines, models.TaxLine{
				Kind: "input", DocumentID: d.ID, Code: d.Code, Date: date,
				Name: d.BuyerName, TaxNumber: d.BuyerTaxNumber, BranchCode: d.BuyerBranchCode,
				InvoiceNo: d.ReceivedTaxInvoiceNumber, Base: d.PreTaxAmount, Amount: d.VatAmount,
			})
		}
		return lines, nil
	}

	var payments []models.Payment
	if err := s.db.Table("payments p").Select("p.*").
		Where(paidWhere+" AND p.wht_form = ? AND p.payment_date >= ? AND p.payment_date < ?", form, period, end).
		Preload("Document").Order("p.payment_date, p.id").Find(&payments).Error; err != nil {
		return nil, err
	}
	lines := make([]models.TaxLine, 0, len(payments))
	for _, p := range payments {
		id := p.ID
		line := models.TaxLine{
			Kind: "withheld", DocumentID: p.DocumentID, Date: p.PaymentDate, PaymentID: &id,
			// What the withholding was taken from: the amount paid plus the
			// tax kept back is the amount before withholding, VAT included.
			// The base on the form is before VAT, which the document holds.
			Base:        p.SettledAmount,
			Amount:      p.WithholdingAmount,
			WhtCertDone: p.WhtCertStatus == models.WhtCertDone,
		}
		if d := p.Document; d != nil {
			line.Code, line.Name, line.TaxNumber, line.BranchCode = d.Code, d.BuyerName, d.BuyerTaxNumber, d.BuyerBranchCode
			if d.NetAmount.IsPositive() {
				// The share of the document's pre-VAT amount this payment
				// settles: what the 50 ทวิ and the form show as paid.
				line.Base = d.PreTaxAmount.Mul(p.SettledAmount).Div(d.NetAmount).Round(2)
			}
		}
		lines = append(lines, line)
	}
	return lines, nil
}

func (s *taxStoreService) Filings(from, to time.Time) ([]*models.TaxFiling, error) {
	var rows []*models.TaxFiling
	err := s.db.Preload("Filer").Where("period >= ? AND period < ?", from, to).
		Order("period, form").Find(&rows).Error
	return rows, err
}

func (s *taxStoreService) FindFiling(id uint) (*models.TaxFiling, error) {
	var row models.TaxFiling
	if err := s.db.Preload("Filer").First(&row, id).Error; err != nil {
		return nil, err
	}
	return &row, nil
}

func (s *taxStoreService) EnsureFiling(form string, period time.Time) (*models.TaxFiling, error) {
	row := models.TaxFiling{Form: form, Period: period, Status: models.TaxFilingOpen}
	// Two people opening the same month at once: one row, whoever wins.
	if err := s.db.Clauses(clause.OnConflict{DoNothing: true}).Create(&row).Error; err != nil {
		return nil, err
	}
	var saved models.TaxFiling
	if err := s.db.Preload("Filer").Where("form = ? AND period = ?", form, period).First(&saved).Error; err != nil {
		return nil, err
	}
	return &saved, nil
}

func lockFiling(tx *gorm.DB, id uint) (*models.TaxFiling, error) {
	var row models.TaxFiling
	if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(&row, id).Error; err != nil {
		return nil, err
	}
	return &row, nil
}

func formLabel(form string) string {
	switch form {
	case models.TaxFormPP30:
		return "ภ.พ.30"
	case models.TaxFormPND3:
		return "ภ.ง.ด.3"
	case models.TaxFormPND53:
		return "ภ.ง.ด.53"
	}
	return form
}

func (s *taxStoreService) MarkFiled(id, userID uint, figures models.TaxFigures, paid models.TaxFiling) (*models.TaxFiling, error) {
	err := s.db.Transaction(func(tx *gorm.DB) error {
		row, err := lockFiling(tx, id)
		if err != nil {
			return err
		}
		if row.Status == models.TaxFilingFiled {
			return models.ErrTaxFilingFiled
		}
		var files int64
		if err := tx.Model(&models.File{}).Where("owner_type = ? AND owner_id = ? AND status = ?",
			models.FileOwnerTaxFiling, id, models.FileStatusReady).Count(&files).Error; err != nil {
			return err
		}
		if files == 0 {
			return models.ErrNoTaxReceipt
		}
		now := time.Now()
		if err := tx.Model(&models.TaxFiling{}).Where("id = ?", id).Updates(map[string]interface{}{
			"status":                 models.TaxFilingFiled,
			"output_vat":             figures.OutputVat,
			"input_vat":              figures.InputVat,
			"credit_brought_forward": figures.CreditBroughtForward,
			"tax_amount":             figures.TaxAmount,
			"credit_carried":         figures.CreditCarried,
			"line_count":             figures.LineCount,
			"paid_amount":            paid.PaidAmount,
			"paid_date":              paid.PaidDate,
			"reference":              paid.Reference,
			"note":                   paid.Note,
			"filed_by":               userID,
			"filed_at":               now,
			"updated_at":             now,
		}).Error; err != nil {
			return err
		}
		note := formLabel(row.Form) + " งวด " + row.Period.Format("01/2006") + ": ยื่นแล้ว ชำระ " +
			docmath.Baht(paid.PaidAmount) + " บาท"
		if paid.Reference != "" {
			note += " อ้างอิง " + paid.Reference
		}
		return tx.Create(&models.DocumentEvent{
			TaxFilingID: &id, UserID: userID, Action: models.DocEventTaxFiled, Note: note,
		}).Error
	})
	if err != nil {
		return nil, err
	}
	return s.FindFiling(id)
}

func (s *taxStoreService) Reopen(id, userID uint, reason string) (*models.TaxFiling, error) {
	err := s.db.Transaction(func(tx *gorm.DB) error {
		row, err := lockFiling(tx, id)
		if err != nil {
			return err
		}
		if row.Status != models.TaxFilingFiled {
			return models.ErrTaxFilingNotFiled
		}
		// The locked figures stay on the row for the record until it is
		// filed again; the status is what says they no longer stand.
		if err := tx.Model(&models.TaxFiling{}).Where("id = ?", id).Updates(map[string]interface{}{
			"status": models.TaxFilingOpen, "updated_at": time.Now(),
		}).Error; err != nil {
			return err
		}
		return tx.Create(&models.DocumentEvent{
			TaxFilingID: &id, UserID: userID, Action: models.DocEventTaxReopened,
			Note: formLabel(row.Form) + " งวด " + row.Period.Format("01/2006") + ": เปิดแก้ไข — " + reason,
		}).Error
	})
	if err != nil {
		return nil, err
	}
	return s.FindFiling(id)
}

func (s *taxStoreService) MarkSent(id, userID uint) (*models.TaxFiling, error) {
	return s.step(id, userID, func(tx *gorm.DB, row *models.TaxFiling, now time.Time) (string, string, error) {
		if err := tx.Model(&models.TaxFiling{}).Where("id = ?", id).
			Updates(map[string]interface{}{"sent_at": now, "updated_at": now}).Error; err != nil {
			return "", "", err
		}
		return models.DocEventTaxSent, "ส่งข้อมูลให้สำนักบัญชีแล้ว", nil
	})
}

func (s *taxStoreService) SetDue(id, userID uint, amount decimal.Decimal) (*models.TaxFiling, error) {
	return s.step(id, userID, func(tx *gorm.DB, row *models.TaxFiling, now time.Time) (string, string, error) {
		if err := tx.Model(&models.TaxFiling{}).Where("id = ?", id).
			Updates(map[string]interface{}{"due_amount": amount, "due_set_at": now, "updated_at": now}).Error; err != nil {
			return "", "", err
		}
		return models.DocEventTaxDue, "สำนักบัญชีแจ้งยอดชำระตาม QR " + docmath.Baht(amount) + " บาท", nil
	})
}

// step runs one hand-off step on an open filing (a filed month is done)
// and logs it.
func (s *taxStoreService) step(id, userID uint, apply func(*gorm.DB, *models.TaxFiling, time.Time) (string, string, error)) (*models.TaxFiling, error) {
	err := s.db.Transaction(func(tx *gorm.DB) error {
		row, err := lockFiling(tx, id)
		if err != nil {
			return err
		}
		if row.Status == models.TaxFilingFiled {
			return models.ErrTaxFilingFiled
		}
		action, note, err := apply(tx, row, time.Now())
		if err != nil {
			return err
		}
		return tx.Create(&models.DocumentEvent{
			TaxFilingID: &id, UserID: userID, Action: action,
			Note: formLabel(row.Form) + " งวด " + row.Period.Format("01/2006") + ": " + note,
		}).Error
	})
	if err != nil {
		return nil, err
	}
	return s.FindFiling(id)
}

func (s *taxStoreService) Events(filingID uint) ([]*models.DocumentEvent, error) {
	var rows []*models.DocumentEvent
	err := s.db.Preload("User").Where("tax_filing_id = ?", filingID).Order("created_at, id").Find(&rows).Error
	return rows, err
}
