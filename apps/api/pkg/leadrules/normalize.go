// Package leadrules holds the Lead Tracker's ownership and duplicate rules as
// pure functions, so they can be tested without a database and reused by the
// create, update, assign and CSV-import paths alike.
package leadrules

import (
	"strings"
	"unicode"
)

// thaiLegalForms are stripped as substrings because Thai company names are
// written without spaces, so "บริษัทอาวล์เดย์เฮ้าส์จำกัด" has to normalize the
// same way as "บริษัท อาวล์ เดย์ เฮ้าส์ จำกัด". Longest first.
var thaiLegalForms = []string{
	"ห้างหุ้นส่วนจำกัด",
	"ห้างหุ้นส่วนสามัญ",
	"บริษัทมหาชนจำกัด",
	"บริษัท",
	"จำกัด",
	"มหาชน",
	"บมจ",
	"หจก",
}

// latinLegalForms are stripped as whole words only — removing "co" as a
// substring would also eat the "co" in "coca" or "cosmo".
var latinLegalForms = map[string]bool{
	"co":           true,
	"company":      true,
	"companies":    true,
	"corp":         true,
	"corporation":  true,
	"inc":          true,
	"incorporated": true,
	"limited":      true,
	"llc":          true,
	"ltd":          true,
	"pcl":          true,
	"plc":          true,
	"public":       true,
}

// NormalizeName reduces a company name to the key used for duplicate
// detection: lower-cased, legal forms removed, and every space and punctuation
// mark dropped. It never returns a leading or trailing space.
//
//	"บริษัท อาวล์ เดย์ เฮ้าส์ จำกัด" -> "อาวล์เดย์เฮ้าส์"
//	"Owl Day House Co., Ltd."        -> "owldayhouse"
func NormalizeName(name string) string {
	lowered := strings.ToLower(strings.TrimSpace(name))

	// 1. Every separator becomes a single space so words can be inspected.
	//    Combining marks are kept: Thai vowel and tone marks (อาวล์, บริษัท)
	//    are Unicode Mn, not letters, and dropping them would mangle every
	//    Thai name and stop the legal forms below from ever matching.
	var spaced strings.Builder
	for _, r := range lowered {
		switch {
		case unicode.IsLetter(r), unicode.IsDigit(r), unicode.IsMark(r):
			spaced.WriteRune(r)
		default:
			spaced.WriteRune(' ')
		}
	}

	// 2. Drop Latin legal forms word by word.
	kept := make([]string, 0, 8)
	for _, word := range strings.Fields(spaced.String()) {
		if latinLegalForms[word] {
			continue
		}
		kept = append(kept, word)
	}
	joined := strings.Join(kept, "")

	// 3. Drop Thai legal forms, which may be glued to the name.
	for _, form := range thaiLegalForms {
		joined = strings.ReplaceAll(joined, form, "")
	}

	return joined
}

// NormalizeTaxID keeps the digits only, so "0-1055-43000-19-1" and
// "0105543000191" are the same tax ID. Returns "" when there are no digits.
func NormalizeTaxID(taxID string) string {
	var b strings.Builder
	for _, r := range taxID {
		if unicode.IsDigit(r) {
			b.WriteRune(r)
		}
	}
	return b.String()
}
