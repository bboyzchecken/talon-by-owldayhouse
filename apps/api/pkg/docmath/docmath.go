// Package docmath computes a document's amounts: line totals, the document
// discount, VAT and withholding tax. It is pure arithmetic on decimals — no
// database, no floats — so every rule is tested on its own.
//
// The rules follow PEAK's model (taxStatus on the document, vatType per line)
// and Thai practice:
//
//   - A line is quantity × price, less its own discount (an amount, or a
//     percentage written "10%").
//   - The document discount (an amount) comes off after the lines, shared
//     across the lines in proportion to their amounts, so the VAT on a mixed
//     document falls on the right lines.
//   - VAT is 7% on the vatType 3 lines only. With prices before VAT
//     (TaxExclusive) it is added on top; with prices including VAT
//     (TaxInclusive) it is the 7/107 already inside them.
//   - Withholding is a rate on a line's amount before VAT, after its share of
//     the document discount.
//   - Every amount is rounded to the satang, half away from zero, once, at
//     the point it is printed. Totals are sums of rounded parts, so the
//     printed lines always add up to the printed total.
package docmath

import (
	"errors"
	"fmt"
	"strings"

	"github.com/shopspring/decimal"

	"github.com/owldayhouse/odh-internal-api/pkg/models"
)

var (
	hundred      = decimal.NewFromInt(100)
	vatRate      = decimal.NewFromInt(7)
	vatInclusive = decimal.NewFromInt(107)
)

// Line is one line as entered.
type Line struct {
	IsDescription   bool
	Quantity        decimal.Decimal
	Price           decimal.Decimal
	Discount        string // "", "100", "10%"
	VatType         int
	WithholdingRate decimal.Decimal // 3 means 3%
}

// LineResult is what the document stores for a line.
type LineResult struct {
	LineAmount        decimal.Decimal // after the line's own discount, before the document discount
	WithholdingAmount decimal.Decimal
}

// Result is the document's stored totals.
type Result struct {
	Lines            []LineResult
	Subtotal         decimal.Decimal // sum of line amounts
	DiscountTotal    decimal.Decimal
	PreTaxAmount     decimal.Decimal
	VatAmount        decimal.Decimal
	NetAmount        decimal.Decimal
	WithholdingTotal decimal.Decimal
	// PayableAmount is what the customer actually transfers: net less what
	// they withhold.
	PayableAmount decimal.Decimal
}

func round(d decimal.Decimal) decimal.Decimal { return d.Round(2) }

// ParseDiscount reads a discount: an amount ("100", "100.50") or a
// percentage ("10%"). It returns the amount it takes off base.
func ParseDiscount(raw string, base decimal.Decimal) (decimal.Decimal, error) {
	raw = strings.TrimSpace(strings.ReplaceAll(raw, ",", ""))
	if raw == "" {
		return decimal.Zero, nil
	}
	if strings.HasSuffix(raw, "%") {
		pct, err := decimal.NewFromString(strings.TrimSpace(strings.TrimSuffix(raw, "%")))
		if err != nil || pct.IsNegative() || pct.GreaterThan(hundred) {
			return decimal.Zero, fmt.Errorf("ส่วนลด %q ไม่ถูกต้อง", raw)
		}
		return round(base.Mul(pct).Div(hundred)), nil
	}
	amount, err := decimal.NewFromString(raw)
	if err != nil || amount.IsNegative() {
		return decimal.Zero, fmt.Errorf("ส่วนลด %q ไม่ถูกต้อง", raw)
	}
	return round(amount), nil
}

// Compute works out every amount on a document.
func Compute(taxStatus int, lines []Line, documentDiscount string) (Result, error) {
	if taxStatus != models.TaxExclusive && taxStatus != models.TaxInclusive {
		return Result{}, errors.New("สถานะภาษีของเอกสารไม่ถูกต้อง")
	}

	res := Result{Lines: make([]LineResult, len(lines))}
	priced := 0
	for i, line := range lines {
		if line.IsDescription {
			continue
		}
		priced++
		if line.VatType != models.VatNone && line.VatType != models.VatZero && line.VatType != models.VatSeven {
			return Result{}, fmt.Errorf("บรรทัด %d: ประเภท VAT ไม่ถูกต้อง", i+1)
		}
		if !line.Quantity.IsPositive() {
			return Result{}, fmt.Errorf("บรรทัด %d: จำนวนต้องมากกว่า 0", i+1)
		}
		if line.Price.IsNegative() {
			return Result{}, fmt.Errorf("บรรทัด %d: ราคาติดลบไม่ได้", i+1)
		}
		if line.WithholdingRate.IsNegative() || line.WithholdingRate.GreaterThan(hundred) {
			return Result{}, fmt.Errorf("บรรทัด %d: อัตราหัก ณ ที่จ่ายไม่ถูกต้อง", i+1)
		}
		gross := round(line.Quantity.Mul(line.Price))
		discount, err := ParseDiscount(line.Discount, gross)
		if err != nil {
			return Result{}, fmt.Errorf("บรรทัด %d: %w", i+1, err)
		}
		if discount.GreaterThan(gross) {
			return Result{}, fmt.Errorf("บรรทัด %d: ส่วนลดมากกว่ายอดของบรรทัด", i+1)
		}
		res.Lines[i].LineAmount = gross.Sub(discount)
		res.Subtotal = res.Subtotal.Add(res.Lines[i].LineAmount)
	}
	if priced == 0 {
		return Result{}, errors.New("เอกสารต้องมีรายการที่มีราคาอย่างน้อย 1 บรรทัด")
	}

	discount, err := ParseDiscount(documentDiscount, res.Subtotal)
	if err != nil {
		return Result{}, fmt.Errorf("ส่วนลดท้ายบิล: %w", err)
	}
	if discount.GreaterThan(res.Subtotal) {
		return Result{}, errors.New("ส่วนลดท้ายบิลมากกว่ายอดรวม")
	}
	res.DiscountTotal = discount
	afterDiscount := res.Subtotal.Sub(discount)

	// Share the document discount across the lines. The last priced line
	// takes the remainder, so the shares add up to the discount exactly.
	shares := make([]decimal.Decimal, len(lines))
	if discount.IsPositive() && res.Subtotal.IsPositive() {
		remaining := discount
		last := -1
		for i, line := range lines {
			if !line.IsDescription {
				last = i
			}
		}
		for i, line := range lines {
			if line.IsDescription {
				continue
			}
			if i == last {
				shares[i] = remaining
				break
			}
			shares[i] = round(discount.Mul(res.Lines[i].LineAmount).Div(res.Subtotal))
			remaining = remaining.Sub(shares[i])
		}
	}

	// VAT on the vatType 3 lines, after their share of the discount.
	vatBase := decimal.Zero
	for i, line := range lines {
		if line.IsDescription || line.VatType != models.VatSeven {
			continue
		}
		vatBase = vatBase.Add(res.Lines[i].LineAmount.Sub(shares[i]))
	}
	if taxStatus == models.TaxExclusive {
		res.VatAmount = round(vatBase.Mul(vatRate).Div(hundred))
		res.PreTaxAmount = afterDiscount
		res.NetAmount = afterDiscount.Add(res.VatAmount)
	} else {
		res.VatAmount = round(vatBase.Mul(vatRate).Div(vatInclusive))
		res.PreTaxAmount = afterDiscount.Sub(res.VatAmount)
		res.NetAmount = afterDiscount
	}

	// Withholding on each line's amount before VAT.
	for i, line := range lines {
		if line.IsDescription || !line.WithholdingRate.IsPositive() {
			continue
		}
		base := res.Lines[i].LineAmount.Sub(shares[i])
		if taxStatus == models.TaxInclusive && line.VatType == models.VatSeven {
			base = base.Mul(hundred).Div(vatInclusive)
		}
		res.Lines[i].WithholdingAmount = round(base.Mul(line.WithholdingRate).Div(hundred))
		res.WithholdingTotal = res.WithholdingTotal.Add(res.Lines[i].WithholdingAmount)
	}

	res.PayableAmount = res.NetAmount.Sub(res.WithholdingTotal)
	return res, nil
}
