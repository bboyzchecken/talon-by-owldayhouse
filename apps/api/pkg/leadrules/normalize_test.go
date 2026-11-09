package leadrules

import "testing"

func TestNormalizeName(t *testing.T) {
	cases := []struct {
		name string
		in   string
		want string
	}{
		{"thai with spaces and legal forms", "บริษัท อาวล์ เดย์ เฮ้าส์ จำกัด", "อาวล์เดย์เฮ้าส์"},
		{"thai glued together", "บริษัทอาวล์เดย์เฮ้าส์จำกัด", "อาวล์เดย์เฮ้าส์"},
		{"thai public company", "บริษัท ซีพี ออลล์ จำกัด (มหาชน)", "ซีพีออลล์"},
		{"thai partnership", "ห้างหุ้นส่วนจำกัด สมชายการช่าง", "สมชายการช่าง"},
		{"thai abbreviation", "หจก. สมชายการช่าง", "สมชายการช่าง"},
		{"latin co ltd", "Owl Day House Co., Ltd.", "owldayhouse"},
		{"latin spacing and case", "  OWL   DAY  HOUSE  ", "owldayhouse"},
		{"latin company limited", "Owl Day House Company Limited", "owldayhouse"},
		{"latin public company limited", "Owl Day House Public Company Limited", "owldayhouse"},
		{"latin inc", "Acme Inc.", "acme"},
		{"latin plc", "Acme PLC", "acme"},
		{"digits kept", "SCB 10X Co., Ltd.", "scb10x"},
		{"empty", "", ""},
		{"only legal form", "บริษัท จำกัด", ""},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			if got := NormalizeName(tc.in); got != tc.want {
				t.Fatalf("NormalizeName(%q) = %q, want %q", tc.in, got, tc.want)
			}
		})
	}
}

// A "co" inside a real word must survive — this is why Latin legal forms are
// stripped word-by-word rather than as substrings.
func TestNormalizeNameKeepsWordsThatContainLegalForms(t *testing.T) {
	cases := map[string]string{
		"Coca Cola (Thailand) Limited": "cocacolathailand",
		"Cosmo Group Co., Ltd.":        "cosmogroup",
		"Incredible Studio":            "incrediblestudio",
		"Unlimited Design Co., Ltd.":   "unlimiteddesign",
	}
	for in, want := range cases {
		if got := NormalizeName(in); got != want {
			t.Errorf("NormalizeName(%q) = %q, want %q", in, got, want)
		}
	}
}

// Different spellings of the same company must collide, which is what makes the
// unique index on normalized_name a "first to register owns it" guard.
func TestNormalizeNameCollidesForSameCompany(t *testing.T) {
	variants := []string{
		"บริษัท อาวล์ เดย์ เฮ้าส์ จำกัด",
		"บริษัทอาวล์เดย์เฮ้าส์จำกัด",
		"อาวล์ เดย์ เฮ้าส์",
		"  อาวล์เดย์เฮ้าส์  ",
	}
	first := NormalizeName(variants[0])
	for _, v := range variants[1:] {
		if got := NormalizeName(v); got != first {
			t.Errorf("NormalizeName(%q) = %q, want %q", v, got, first)
		}
	}
}

// Two genuinely different companies must NOT collide.
func TestNormalizeNameKeepsDifferentCompaniesApart(t *testing.T) {
	a := NormalizeName("บริษัท อาวล์ เดย์ เฮ้าส์ จำกัด")
	b := NormalizeName("บริษัท อาวล์ ไนท์ เฮ้าส์ จำกัด")
	if a == b {
		t.Fatalf("different companies normalized to the same key: %q", a)
	}
}

func TestNormalizeTaxID(t *testing.T) {
	cases := map[string]string{
		"0-1055-43000-19-1": "0105543000191",
		"0105543000191":     "0105543000191",
		" 010 554 300 0191": "0105543000191",
		"":                  "",
		"ไม่มี":             "",
	}
	for in, want := range cases {
		if got := NormalizeTaxID(in); got != want {
			t.Errorf("NormalizeTaxID(%q) = %q, want %q", in, got, want)
		}
	}
}
