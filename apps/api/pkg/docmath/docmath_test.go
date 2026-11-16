package docmath

import (
	"testing"

	"github.com/shopspring/decimal"

	"github.com/owldayhouse/odh-internal-api/pkg/models"
)

func d(s string) decimal.Decimal { return decimal.RequireFromString(s) }

func line(qty, price string, vat int) Line {
	return Line{Quantity: d(qty), Price: d(price), VatType: vat}
}

func expect(t *testing.T, name string, got decimal.Decimal, want string) {
	t.Helper()
	if !got.Equal(d(want)) {
		t.Errorf("%s = %s, want %s", name, got.StringFixed(2), want)
	}
}

func TestExclusiveVatWithWithholding(t *testing.T) {
	l := line("2", "10000", models.VatSeven)
	l.WithholdingRate = d("3")
	res, err := Compute(models.TaxExclusive, []Line{l}, "")
	if err != nil {
		t.Fatal(err)
	}
	expect(t, "pre-tax", res.PreTaxAmount, "20000")
	expect(t, "vat", res.VatAmount, "1400")
	expect(t, "net", res.NetAmount, "21400")
	expect(t, "withholding", res.WithholdingTotal, "600") // 3% of the amount before VAT
	expect(t, "payable", res.PayableAmount, "20800")
}

func TestInclusiveVat(t *testing.T) {
	l := line("1", "10700", models.VatSeven)
	l.WithholdingRate = d("3")
	res, err := Compute(models.TaxInclusive, []Line{l}, "")
	if err != nil {
		t.Fatal(err)
	}
	expect(t, "vat", res.VatAmount, "700")
	expect(t, "pre-tax", res.PreTaxAmount, "10000")
	expect(t, "net", res.NetAmount, "10700")
	expect(t, "withholding", res.WithholdingTotal, "300")
}

// A line discount, a document discount, and one line without VAT: the
// document discount is shared by amount, and only the VAT line's share
// lowers the VAT.
func TestDiscountsOnAMixedDocument(t *testing.T) {
	a := line("1", "10000", models.VatSeven)
	a.Discount = "10%"
	b := line("1", "1000", models.VatNone)
	res, err := Compute(models.TaxExclusive, []Line{a, {IsDescription: true}, b}, "1000")
	if err != nil {
		t.Fatal(err)
	}
	expect(t, "line A", res.Lines[0].LineAmount, "9000")
	expect(t, "line B", res.Lines[2].LineAmount, "1000")
	expect(t, "subtotal", res.Subtotal, "10000")
	expect(t, "discount", res.DiscountTotal, "1000")
	expect(t, "vat", res.VatAmount, "567") // 7% of 9000 - 900
	expect(t, "pre-tax", res.PreTaxAmount, "9000")
	expect(t, "net", res.NetAmount, "9567")
}

func TestDocumentDiscountAsPercentage(t *testing.T) {
	res, err := Compute(models.TaxExclusive, []Line{line("1", "2000", models.VatSeven)}, "10%")
	if err != nil {
		t.Fatal(err)
	}
	expect(t, "discount", res.DiscountTotal, "200")
	expect(t, "vat", res.VatAmount, "126")
	expect(t, "net", res.NetAmount, "1926")
}

// The shares of a discount that does not divide evenly still add up to it,
// so the VAT comes out as if on the total.
func TestDiscountSharesAddUp(t *testing.T) {
	lines := []Line{line("1", "100", models.VatSeven), line("1", "100", models.VatSeven), line("1", "100", models.VatSeven)}
	res, err := Compute(models.TaxExclusive, lines, "100")
	if err != nil {
		t.Fatal(err)
	}
	expect(t, "vat", res.VatAmount, "14")
	expect(t, "net", res.NetAmount, "214")
}

func TestRoundingToTheSatang(t *testing.T) {
	res, err := Compute(models.TaxExclusive, []Line{line("3", "33.33", models.VatSeven)}, "")
	if err != nil {
		t.Fatal(err)
	}
	expect(t, "line", res.Lines[0].LineAmount, "99.99")
	expect(t, "vat", res.VatAmount, "7.00") // 6.9993
	expect(t, "net", res.NetAmount, "106.99")

	half, err := Compute(models.TaxExclusive, []Line{line("1", "0.50", models.VatSeven)}, "")
	if err != nil {
		t.Fatal(err)
	}
	expect(t, "vat on 0.50", half.VatAmount, "0.04") // 0.035 rounds half away from zero
}

func TestNoVatDocument(t *testing.T) {
	res, err := Compute(models.TaxExclusive, []Line{line("1", "5000", models.VatNone)}, "")
	if err != nil {
		t.Fatal(err)
	}
	expect(t, "vat", res.VatAmount, "0")
	expect(t, "net", res.NetAmount, "5000")
}

func TestRefusals(t *testing.T) {
	over := line("1", "100", models.VatSeven)
	over.Discount = "150"
	badRate := line("1", "100", models.VatSeven)
	badRate.WithholdingRate = d("120")
	cases := map[string]struct {
		tax      int
		lines    []Line
		discount string
	}{
		"no priced line":            {models.TaxExclusive, []Line{{IsDescription: true}}, ""},
		"line discount over line":   {models.TaxExclusive, []Line{over}, ""},
		"bad VAT type":              {models.TaxExclusive, []Line{line("1", "100", 9)}, ""},
		"zero quantity":             {models.TaxExclusive, []Line{line("0", "100", models.VatSeven)}, ""},
		"negative price":            {models.TaxExclusive, []Line{line("1", "-1", models.VatSeven)}, ""},
		"document discount too big": {models.TaxExclusive, []Line{line("1", "100", models.VatSeven)}, "101"},
		"bad percentage":            {models.TaxExclusive, []Line{line("1", "100", models.VatSeven)}, "120%"},
		"bad tax status":            {2, []Line{line("1", "100", models.VatSeven)}, ""},
		"withholding over 100%":     {models.TaxExclusive, []Line{badRate}, ""},
	}
	for name, c := range cases {
		if _, err := Compute(c.tax, c.lines, c.discount); err == nil {
			t.Errorf("%s: want an error", name)
		}
	}
}
