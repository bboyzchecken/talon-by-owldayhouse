package api

import (
	"archive/zip"
	"encoding/csv"
	"fmt"
	"io"
	"net/http"
	"path"
	"strconv"
	"strings"
	"time"

	"github.com/labstack/echo/v4"
	"github.com/shopspring/decimal"

	"github.com/owldayhouse/odh-internal-api/pkg/models"
)

// ExportFinanceMonth handles GET /api/docs/finance/export?month=YYYY-MM: one
// zip for the accounting firm with the month's sales and purchase VAT
// reports, the withholding lists for ภ.ง.ด.3/53, every document and payment
// in PEAK's own field order (so they can be keyed into PEAK, or imported
// later), and the evidence files. The figures come from the same queries as
// the tax screen, so the reports and the screen always agree.
func (s *Server) ExportFinanceMonth(c echo.Context) error {
	month, err := parseMonth(c.QueryParam("month"))
	if err != nil {
		return badRequest(c, err.Error())
	}
	end := month.AddDate(0, 1, 0)
	vatLines, err := s.TaxStore.Lines(models.TaxFormPP30, month)
	if err != nil {
		return s.serverError(c, err)
	}
	pnd53, err := s.TaxStore.Lines(models.TaxFormPND53, month)
	if err != nil {
		return s.serverError(c, err)
	}
	pnd3, err := s.TaxStore.Lines(models.TaxFormPND3, month)
	if err != nil {
		return s.serverError(c, err)
	}
	docs, err := s.FinanceStore.ExportDocuments(month, end)
	if err != nil {
		return s.serverError(c, err)
	}
	payments, err := s.FinanceStore.ExportPayments(month, end)
	if err != nil {
		return s.serverError(c, err)
	}
	evidence, err := s.FinanceStore.EvidenceFiles(month, end)
	if err != nil {
		return s.serverError(c, err)
	}

	key := monthKey(month)
	res := c.Response()
	res.Header().Set(echo.HeaderContentType, "application/zip")
	res.Header().Set(echo.HeaderContentDisposition, fmt.Sprintf(`attachment; filename="odh-accounting-%s.zip"`, key))
	res.WriteHeader(http.StatusOK)

	zw := zip.NewWriter(res)
	write := func(name string, header []string, rows [][]string) error {
		w, err := zipCreate(zw, name)
		if err != nil {
			return err
		}
		// A byte-order mark so Excel opens the Thai as UTF-8.
		if _, err := w.Write([]byte("\xEF\xBB\xBF")); err != nil {
			return err
		}
		cw := csv.NewWriter(w)
		if err := cw.Write(header); err != nil {
			return err
		}
		for _, row := range rows {
			for i := range row {
				row[i] = csvSafe(row[i])
			}
			if err := cw.Write(row); err != nil {
				return err
			}
		}
		cw.Flush()
		return cw.Error()
	}

	steps := []func() error{
		func() error { return writeReadme(zw, month) },
		func() error {
			return write("1-รายงานภาษีขาย-"+key+".csv", salesVatHeader, salesVatRows(vatLines))
		},
		func() error {
			return write("2-รายงานภาษีซื้อ-"+key+".csv", purchaseVatHeader, purchaseVatRows(vatLines))
		},
		func() error {
			return write("3-หัก-ณ-ที่จ่าย-ภงด53-"+key+".csv", whtHeader, whtRows(pnd53))
		},
		func() error {
			return write("4-หัก-ณ-ที่จ่าย-ภงด3-"+key+".csv", whtHeader, whtRows(pnd3))
		},
		func() error { return write("5-peak-documents-"+key+".csv", peakDocumentHeader, peakDocumentRows(docs)) },
		func() error {
			return write("6-peak-payments-"+key+".csv", peakPaymentHeader, peakPaymentRows(payments))
		},
		func() error { return s.writeEvidence(c, zw, evidence) },
	}
	for _, step := range steps {
		if err := step(); err != nil {
			// The headers are gone already; all that is left is to stop and
			// leave a truncated zip the browser reports as broken.
			s.Log.WithError(err).Error("monthly export failed part-way")
			return nil
		}
	}
	if err := zw.Close(); err != nil {
		s.Log.WithError(err).Error("monthly export: closing the zip")
	}
	return nil
}

func writeReadme(zw *zip.Writer, month time.Time) error {
	w, err := zipCreate(zw, "อ่านก่อน.txt")
	if err != nil {
		return err
	}
	text := `ไฟล์ส่งสำนักบัญชี งวด ` + month.Format("01/2006") + ` จากระบบเอกสารของ Owl Day House
สร้างเมื่อ ` + time.Now().In(month.Location()).Format("02/01/2006 15:04") + `

1 รายงานภาษีขาย    ใบเสร็จ/ใบกำกับภาษี ใบกำกับภาษี ใบเพิ่มหนี้ และใบลดหนี้ (ติดลบ) ที่ออกในเดือน
2 รายงานภาษีซื้อ    รายจ่ายที่มีใบกำกับภาษีของผู้ขาย และใช้ภาษีซื้อในเดือนนี้
3-4 หัก ณ ที่จ่าย  ที่บริษัทหักผู้รับเงินในเดือน แยก ภ.ง.ด.53 (นิติบุคคล) และ ภ.ง.ด.3 (บุคคล)
5 peak-documents   เอกสารทุกใบที่ออกหรือยกเลิกในเดือน หนึ่งแถวต่อหนึ่งบรรทัดรายการ หัวคอลัมน์เป็นชื่อช่องของ PEAK
6 peak-payments    การรับเงินและจ่ายเงินในเดือน (รวมที่ยกเลิก ดูคอลัมน์ status)
evidence/          สลิป (slips) หนังสือรับรอง 50 ทวิ ที่ได้รับ (wht-received) ที่ออกให้ (wht-issued)
                   และใบเสร็จการยื่นภาษี (tax-filings)

ยอดเงินเป็นบาท ทศนิยม 2 ตำแหน่ง วันที่เป็น ปปปปดดวว (ค.ศ.) แบบที่ PEAK ใช้
`
	_, err = io.WriteString(w, text)
	return err
}

func peakDate(t time.Time) string { return t.Format("20060102") }

func peakDatePtr(t *time.Time) string {
	if t == nil {
		return ""
	}
	return peakDate(*t)
}

func amountText(d decimal.Decimal) string { return d.StringFixed(2) }

var salesVatHeader = []string{"ลำดับ", "วันที่", "เลขที่เอกสาร", "ประเภท", "ชื่อผู้ซื้อ", "เลขประจำตัวผู้เสียภาษี", "สาขา", "มูลค่าสินค้า/บริการ", "ภาษีมูลค่าเพิ่ม"}

func salesVatRows(lines []models.TaxLine) [][]string {
	rows := [][]string{}
	base, vat := decimal.Zero, decimal.Zero
	for _, l := range lines {
		if l.Kind == "input" {
			continue
		}
		b := l.Base
		if l.Kind == "credit_note" {
			b = b.Neg()
		}
		base, vat = base.Add(b), vat.Add(l.Amount)
		rows = append(rows, []string{strconv.Itoa(len(rows) + 1), peakDate(l.Date), l.Code, taxLineKinds[l.Kind],
			l.Name, l.TaxNumber, l.BranchCode, amountText(b), amountText(l.Amount)})
	}
	return append(rows, []string{"", "", "", "", "รวม", "", "", amountText(base), amountText(vat)})
}

var purchaseVatHeader = []string{"ลำดับ", "วันที่ใบกำกับภาษี", "เลขที่ใบกำกับภาษี", "ชื่อผู้ขาย", "เลขประจำตัวผู้เสียภาษี", "สาขา", "มูลค่าสินค้า/บริการ", "ภาษีมูลค่าเพิ่ม", "เลขรายจ่ายในระบบ"}

func purchaseVatRows(lines []models.TaxLine) [][]string {
	rows := [][]string{}
	base, vat := decimal.Zero, decimal.Zero
	for _, l := range lines {
		if l.Kind != "input" {
			continue
		}
		base, vat = base.Add(l.Base), vat.Add(l.Amount)
		rows = append(rows, []string{strconv.Itoa(len(rows) + 1), peakDate(l.Date), l.InvoiceNo, l.Name, l.TaxNumber, l.BranchCode,
			amountText(l.Base), amountText(l.Amount), l.Code})
	}
	return append(rows, []string{"", "", "", "รวม", "", "", amountText(base), amountText(vat), ""})
}

var whtHeader = []string{"ลำดับ", "วันที่จ่าย", "ชื่อผู้รับเงิน", "เลขประจำตัวผู้เสียภาษี", "สาขา", "จำนวนเงินที่จ่าย (ก่อน VAT)", "อัตรา %", "ภาษีที่หัก", "เงื่อนไข", "เลขเอกสาร", "ส่ง 50 ทวิ แล้ว"}

func whtRows(lines []models.TaxLine) [][]string {
	rows := [][]string{}
	base, tax := decimal.Zero, decimal.Zero
	for _, l := range lines {
		rate := ""
		if l.Base.IsPositive() {
			rate = l.Amount.Mul(decimal.NewFromInt(100)).Div(l.Base).Round(2).String()
		}
		sent := "ยังไม่ส่ง"
		if l.WhtCertDone {
			sent = "ส่งแล้ว"
		}
		base, tax = base.Add(l.Base), tax.Add(l.Amount)
		// เงื่อนไข 1 = หัก ณ ที่จ่าย, as on the form.
		rows = append(rows, []string{strconv.Itoa(len(rows) + 1), peakDate(l.Date), l.Name, l.TaxNumber, l.BranchCode,
			amountText(l.Base), rate, amountText(l.Amount), "1", l.Code, sent})
	}
	return append(rows, []string{"", "", "รวม", "", "", amountText(base), "", amountText(tax), "", "", ""})
}

var taxLineKinds = map[string]string{
	"output": "ใบกำกับภาษี", "credit_note": "ใบลดหนี้", "debit_note": "ใบเพิ่มหนี้", "input": "ใบกำกับภาษีซื้อ",
}

// The PEAK field names (docs/internal-tools/document-system.md, "ต่อกับ
// PEAK"), with the Thai the accountant reads. One row per document line;
// the document's own fields repeat on each of its lines.
var peakDocumentHeader = []string{
	"transactionType (ประเภท)", "code (เลขที่)", "status", "issuedDate", "dueDate",
	"contactCode", "contactName", "taxNumber", "branchCode", "reference", "sourceCode (อ้างอิงเอกสาร)",
	"taxStatus", "isTaxInvoice", "discountTotal", "preTaxAmount", "vatAmount", "netAmount", "withHoldingTaxTotal",
	"receivedTaxInvoice.taxInvoiceNumber", "receivedTaxInvoice.taxInvoiceDate", "receivedTaxInvoice.periodDate",
	"products.productCode", "products.description", "products.quantity", "products.price", "products.discount",
	"products.vatType", "products.withHoldingTaxAmount", "lineAmount", "remark", "voidReason",
}

func peakDocumentRows(docs []*models.Document) [][]string {
	rows := [][]string{}
	for _, d := range docs {
		contactCode := ""
		if d.Contact != nil {
			contactCode = d.Contact.Code
		}
		source := ""
		if d.SourceDocument != nil {
			source = d.SourceDocument.Code
		}
		isTax := "0"
		if d.IsTaxInvoice {
			isTax = "1"
		}
		head := []string{
			strconv.Itoa(d.DocType) + " " + docTypeLabels[d.DocType], d.Code, d.Status, peakDate(d.IssuedDate), peakDatePtr(d.DueDate),
			contactCode, d.BuyerName, d.BuyerTaxNumber, d.BuyerBranchCode, d.Reference, source,
			strconv.Itoa(d.TaxStatus), isTax, amountText(d.DiscountTotal), amountText(d.PreTaxAmount), amountText(d.VatAmount),
			amountText(d.NetAmount), amountText(d.WithholdingTotal),
			d.ReceivedTaxInvoiceNumber, peakDatePtr(d.ReceivedTaxInvoiceDate), peakDatePtr(d.InputVatPeriod),
		}
		tail := []string{strings.ReplaceAll(d.Remark, "\n", " "), d.VoidReason}
		lines := 0
		for _, it := range d.Items {
			if it.IsDescription {
				continue
			}
			code := ""
			if it.Product != nil {
				code = it.Product.Code
			}
			wht := ""
			if it.WithholdingRate.IsPositive() {
				wht = it.WithholdingRate.String() + "%"
			}
			line := []string{code, it.Description, it.Quantity.String(), amountText(it.Price), it.Discount,
				strconv.Itoa(it.VatType), wht, amountText(it.LineAmount)}
			rows = append(rows, append(append(append([]string{}, head...), line...), tail...))
			lines++
		}
		if lines == 0 {
			rows = append(rows, append(append(append([]string{}, head...), make([]string, 8)...), tail...))
		}
	}
	return rows
}

var peakPaymentHeader = []string{
	"direction (รับ/จ่าย)", "status", "paymentDate", "documentCode", "contactCode", "contactName",
	"paymentMethodCode", "paymentMethodName", "amount (ยอดที่โอนจริง)", "withHoldingTaxAmount", "settledAmount",
	"receiptCode", "whtForm", "whtCertificate", "note", "voidReason",
}

func peakPaymentRows(payments []*models.Payment) [][]string {
	rows := [][]string{}
	for _, p := range payments {
		dir := "รับเงิน"
		if p.Direction == models.PaymentOut {
			dir = "จ่ายเงิน"
		}
		docCode, contactCode, contactName := "", "", ""
		if d := p.Document; d != nil {
			docCode, contactName = d.Code, d.BuyerName
			if d.Contact != nil {
				contactCode = d.Contact.Code
			}
		}
		methodCode, methodName := "", ""
		if m := p.PaymentMethod; m != nil {
			methodCode, methodName = m.Code, m.Name
		}
		receipt := ""
		if p.Receipt != nil {
			receipt = p.Receipt.Code
		}
		cert := map[string]string{models.WhtCertNone: "", models.WhtCertPending: "รอ", models.WhtCertDone: "เรียบร้อย"}[p.WhtCertStatus]
		rows = append(rows, []string{dir, p.Status, peakDate(p.PaymentDate), docCode, contactCode, contactName,
			methodCode, methodName, amountText(p.ReceivedAmount), amountText(p.WithholdingAmount), amountText(p.SettledAmount),
			receipt, p.WhtForm, cert, strings.ReplaceAll(p.Note, "\n", " "), p.VoidReason})
	}
	return rows
}

// writeEvidence copies each file from R2 into evidence/<folder>/. A file
// that cannot be read is listed in evidence/อ่านไม่ได้.txt instead of
// failing the whole export.
func (s *Server) writeEvidence(c echo.Context, zw *zip.Writer, files []models.EvidenceFile) error {
	missing := []string{}
	used := map[string]int{}
	for _, f := range files {
		name := path.Join("evidence", f.Folder, safeName(f.Label+"-"+f.Filename))
		if n := used[name]; n > 0 {
			ext := path.Ext(name)
			name = strings.TrimSuffix(name, ext) + "-" + strconv.Itoa(n+1) + ext
		}
		used[name]++
		body, err := s.Storage.Open(c.Request().Context(), f.Key)
		if err != nil {
			missing = append(missing, f.Folder+"/"+f.Filename+" ("+f.Label+")")
			continue
		}
		w, err := zipCreate(zw, name)
		if err == nil {
			_, err = io.Copy(w, body)
		}
		body.Close()
		if err != nil {
			return err
		}
	}
	if len(missing) == 0 {
		return nil
	}
	w, err := zipCreate(zw, "evidence/อ่านไม่ได้.txt")
	if err != nil {
		return err
	}
	_, err = io.WriteString(w, "ไฟล์เหล่านี้ดึงจากที่เก็บไฟล์ไม่ได้ เปิดจากหน้าเอกสารในระบบแทน:\n"+strings.Join(missing, "\n")+"\n")
	return err
}

// safeName keeps a file name inside its folder.
func safeName(name string) string {
	return strings.NewReplacer("/", "-", "\\", "-", "..", "-").Replace(name)
}

// zipCreate adds a compressed entry stamped with the time of the export (a
// bare zw.Create leaves it at 1980).
func zipCreate(zw *zip.Writer, name string) (io.Writer, error) {
	return zw.CreateHeader(&zip.FileHeader{Name: name, Method: zip.Deflate, Modified: time.Now()})
}
