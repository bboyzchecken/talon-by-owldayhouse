package api

import "testing"

func TestCSVSafe(t *testing.T) {
	cases := map[string]string{
		"": "",
		"บริษัท เอ จำกัด":         "บริษัท เอ จำกัด",
		"=HYPERLINK(\"x\",\"y\")": "'=HYPERLINK(\"x\",\"y\")",
		"+66 92 455 2450":         "'+66 92 455 2450",
		"-2+3":                    "'-2+3",
		"@SUM(A1)":                "'@SUM(A1)",
		"\t=1":                    "'\t=1",
		"\r=1":                    "'\r=1",
		"1500.00":                 "1500.00",
		"a=b":                     "a=b",
	}
	for in, want := range cases {
		if got := csvSafe(in); got != want {
			t.Errorf("csvSafe(%q) = %q, want %q", in, got, want)
		}
	}
}
