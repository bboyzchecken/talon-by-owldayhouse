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

func TestGroupThousands(t *testing.T) {
	cases := map[string]string{"0.00": "0.00", "999.50": "999.50", "1000.00": "1,000.00", "20330.00": "20,330.00", "1234567.89": "1,234,567.89", "-1500.00": "-1,500.00"}
	for in, want := range cases {
		if got := groupThousands(in); got != want {
			t.Errorf("groupThousands(%s) = %s, want %s", in, got, want)
		}
	}
}
