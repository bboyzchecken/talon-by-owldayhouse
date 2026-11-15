package main

import (
	"errors"
	"strings"
	"testing"
)

// valid is a submission that should pass, so each test can change one thing.
func valid() quoteRequest {
	return quoteRequest{
		ContactName: "สมหญิง ใจดี",
		Phone:       "0812345678",
		Consent:     true,
		FormMillis:  9000,
		Interests:   []string{"system", "event"},
		Industry:    "healthcare",
		Timeline:    "1_3_months",
		BudgetBand:  "100k_300k",
		Brief:       "อยากได้เว็บใหม่พร้อมระบบจองคิว",
	}
}

func TestNormalizeAcceptsAGoodSubmission(t *testing.T) {
	req := valid()
	row, err := req.normalize()
	if err != nil {
		t.Fatalf("expected the submission to pass, got %v", err)
	}
	if row.ContactName != "สมหญิง ใจดี" {
		t.Errorf("name = %q", row.ContactName)
	}
	if row.Status != "new" || row.Kind != "quote" {
		t.Errorf("a new request must start as new/quote, got %s/%s", row.Status, row.Kind)
	}
	if row.Locale != "th" {
		t.Errorf("locale should default to th, got %q", row.Locale)
	}
	if len(row.Interests) != 2 {
		t.Errorf("interests = %v", row.Interests)
	}
}

// The anti-abuse checks must not say which one caught the caller.
func TestNormalizeDropsAutomatedSubmissionsSilently(t *testing.T) {
	cases := map[string]func(*quoteRequest){
		"honeypot filled":    func(r *quoteRequest) { r.Website = "http://spam.example" },
		"submitted too fast": func(r *quoteRequest) { r.FormMillis = 400 },
		"unknown interest":   func(r *quoteRequest) { r.Interests = []string{"'; DROP TABLE leads; --"} },
		"unknown industry":   func(r *quoteRequest) { r.Industry = "crypto" },
		"unknown timeline":   func(r *quoteRequest) { r.Timeline = "tomorrow" },
		"unknown budget":     func(r *quoteRequest) { r.BudgetBand = "a lot" },
		"too many interests": func(r *quoteRequest) {
			r.Interests = []string{"a", "b", "c", "d", "e", "f", "g", "h"}
		},
	}

	for name, change := range cases {
		t.Run(name, func(t *testing.T) {
			req := valid()
			change(&req)
			_, err := req.normalize()
			if !errors.Is(err, errSilentDrop) {
				t.Fatalf("expected a silent drop, got %v", err)
			}
		})
	}
}

// These are mistakes a person can fix, so they get a message.
func TestNormalizeExplainsWhatAPersonCanFix(t *testing.T) {
	cases := map[string]func(*quoteRequest){
		"no consent": func(r *quoteRequest) { r.Consent = false },
		"no name":    func(r *quoteRequest) { r.ContactName = "   " },
		"no way to reach them": func(r *quoteRequest) {
			r.Phone, r.LineID, r.Email = "", "", ""
		},
		"email without an @": func(r *quoteRequest) {
			r.Phone, r.LineID, r.Email = "", "", "not-an-email"
		},
	}

	for name, change := range cases {
		t.Run(name, func(t *testing.T) {
			req := valid()
			change(&req)
			_, err := req.normalize()
			if err == nil {
				t.Fatal("expected an error")
			}
			if errors.Is(err, errSilentDrop) {
				t.Fatal("a person's mistake must be explained, not dropped silently")
			}
			if err.Error() == "" {
				t.Fatal("the message must say what to fix")
			}
		})
	}
}

func TestNormalizeDeduplicatesInterests(t *testing.T) {
	req := valid()
	req.Interests = []string{"system", "system", "", "event"}
	row, err := req.normalize()
	if err != nil {
		t.Fatalf("unexpected error %v", err)
	}
	if len(row.Interests) != 2 {
		t.Fatalf("expected the duplicate and the blank to be dropped, got %v", row.Interests)
	}
}

func TestNormalizeKeepsEnglishLocale(t *testing.T) {
	req := valid()
	req.Locale = "en"
	row, err := req.normalize()
	if err != nil {
		t.Fatalf("unexpected error %v", err)
	}
	if row.Locale != "en" {
		t.Errorf("locale = %q", row.Locale)
	}
}

// A submission with no timing at all (an old cached page, a browser that
// blocked the script) is judged on everything else rather than refused.
func TestNormalizeAllowsAMissingTimer(t *testing.T) {
	req := valid()
	req.FormMillis = 0
	if _, err := req.normalize(); err != nil {
		t.Fatalf("expected the submission to pass, got %v", err)
	}
}

func TestCleanStripsControlCharactersAndTrims(t *testing.T) {
	got := clean("  สวัสดี\x00\x07 ครับ  ", 100)
	if got != "สวัสดี ครับ" {
		t.Errorf("clean() = %q", got)
	}
	if strings.ContainsRune(got, '\x00') {
		t.Error("a NUL byte survived")
	}
}

// Thai characters are multi-byte: a cut by bytes would split one in half and
// store something that is not text.
func TestCleanCutsOnRunesNotBytes(t *testing.T) {
	got := clean(strings.Repeat("ก", 50), 10)
	if length := len([]rune(got)); length != 10 {
		t.Fatalf("expected 10 runes, got %d", length)
	}
}

func TestCleanKeepsNewlinesInTheBrief(t *testing.T) {
	got := clean("บรรทัดหนึ่ง\nบรรทัดสอง", 100)
	if !strings.Contains(got, "\n") {
		t.Error("a brief written over several lines lost its line breaks")
	}
}

func TestHashIPIsKeyedAndStableAndEmptyWithoutASalt(t *testing.T) {
	withSalt := &intakeServer{ipSalt: "salt-a"}
	other := &intakeServer{ipSalt: "salt-b"}
	none := &intakeServer{}

	first := withSalt.hashIP("203.0.113.9")
	if first == "" {
		t.Fatal("expected a hash")
	}
	if first != withSalt.hashIP("203.0.113.9") {
		t.Error("the same address must hash the same way twice")
	}
	if first == other.hashIP("203.0.113.9") {
		t.Error("a different salt must give a different hash")
	}
	if strings.Contains(first, "203.0.113.9") {
		t.Error("the address itself is in the output")
	}
	if none.hashIP("203.0.113.9") != "" {
		t.Error("with no salt configured nothing should be kept")
	}
}
