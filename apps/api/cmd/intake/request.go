package main

import (
	"errors"
	"strings"
	"unicode"

	"github.com/owldayhouse/odh-internal-api/pkg/models"
)

// Field limits. They are small on purpose: this endpoint is open to the
// internet, and a brief that does not fit in 4000 characters is a conversation,
// not a form.
const (
	maxName     = 200
	maxCompany  = 200
	maxPhone    = 40
	maxLineID   = 100
	maxEmail    = 200
	maxBrief    = 4000
	maxUTM      = 128
	maxReferrer = 500
	maxPath     = 300
	maxAgent    = 300

	// Anything faster than this was not typed by a person.
	minFillMillis = 3000
)

// quoteRequest is the JSON the form posts. Every value is checked against an
// allowlist or a length before it reaches the database; nothing here is ever
// rendered as HTML.
type quoteRequest struct {
	Locale      string   `json:"locale"`
	ContactName string   `json:"contact_name"`
	Company     string   `json:"company"`
	Industry    string   `json:"industry"`
	Phone       string   `json:"phone"`
	LineID      string   `json:"line_id"`
	Email       string   `json:"email"`
	Interests   []string `json:"interests"`
	Brief       string   `json:"brief"`
	Timeline    string   `json:"timeline"`
	BudgetBand  string   `json:"budget_band"`

	UTMSource   string `json:"utm_source"`
	UTMCampaign string `json:"utm_campaign"`
	Referrer    string `json:"referrer"`
	LandingPath string `json:"landing_path"`

	// Consent is the PDPA checkbox. It is not stored as a column: a row only
	// exists because consent was given, and the policy version in effect is
	// recorded by the date on the row.
	Consent bool `json:"consent"`

	// Website is the honeypot. It is hidden from people and left empty by
	// them; a bot that fills every field it finds sets it.
	Website string `json:"website"`

	// FormMillis is how long the form was open before it was sent.
	FormMillis int64 `json:"form_ms"`

	// Token is the Cloudflare Turnstile response.
	Token string `json:"token"`
}

// errSilentDrop means the submission looked automated. The caller answers as
// if it succeeded: telling a bot which check caught it only helps it.
var errSilentDrop = errors.New("submission rejected by an anti-abuse check")

// clean strips control characters and trims, then cuts to a rune limit so a
// multi-byte Thai string is never cut through the middle of a character.
func clean(value string, limit int) string {
	value = strings.Map(func(r rune) rune {
		if r == '\n' || r == '\t' {
			return r
		}
		if unicode.IsControl(r) {
			return -1
		}
		return r
	}, value)
	value = strings.TrimSpace(value)

	runes := []rune(value)
	if len(runes) > limit {
		return strings.TrimSpace(string(runes[:limit]))
	}
	return value
}

func allowed(value string, set []string) bool {
	for _, item := range set {
		if value == item {
			return true
		}
	}
	return false
}

// normalize cleans every field and checks it against its allowlist. It returns
// the row to insert, or an error: errSilentDrop for anything that smells
// automated, and a readable Thai message for anything a person could fix.
func (r *quoteRequest) normalize() (*models.InboundRequest, error) {
	// The automated checks run first, and all of them are silent.
	if strings.TrimSpace(r.Website) != "" {
		return nil, errSilentDrop
	}
	if r.FormMillis > 0 && r.FormMillis < minFillMillis {
		return nil, errSilentDrop
	}

	if !r.Consent {
		return nil, errors.New("กรุณาติ๊กยอมรับนโยบายความเป็นส่วนตัวก่อนส่ง")
	}

	row := &models.InboundRequest{
		Kind:        models.InboundKindQuote,
		Status:      models.InboundStatusNew,
		Locale:      "th",
		ContactName: clean(r.ContactName, maxName),
		Company:     clean(r.Company, maxCompany),
		Phone:       clean(r.Phone, maxPhone),
		LineID:      clean(r.LineID, maxLineID),
		Email:       clean(r.Email, maxEmail),
		Brief:       clean(r.Brief, maxBrief),
		UTMSource:   clean(r.UTMSource, maxUTM),
		UTMCampaign: clean(r.UTMCampaign, maxUTM),
		Referrer:    clean(r.Referrer, maxReferrer),
		LandingPath: clean(r.LandingPath, maxPath),
	}

	if r.Locale == "en" {
		row.Locale = "en"
	}

	if row.ContactName == "" {
		return nil, errors.New("กรุณากรอกชื่อผู้ติดต่อ")
	}
	if row.Phone == "" && row.LineID == "" && row.Email == "" {
		return nil, errors.New("กรุณาให้ช่องทางติดต่อกลับอย่างน้อยหนึ่งช่อง")
	}
	if row.Email != "" && !strings.Contains(row.Email, "@") {
		return nil, errors.New("อีเมลไม่ถูกต้อง")
	}

	// The enums below are the same values the Lead Tracker uses, so an accepted
	// request becomes a lead without translating anything.
	industry := clean(r.Industry, 32)
	if industry != "" {
		if !allowed(industry, models.Industries()) {
			return nil, errSilentDrop
		}
		row.Industry = industry
	}

	timeline := clean(r.Timeline, 32)
	if timeline != "" {
		if !allowed(timeline, models.Timelines()) {
			return nil, errSilentDrop
		}
		row.Timeline = timeline
	}

	budget := clean(r.BudgetBand, 32)
	if budget != "" {
		if !allowed(budget, models.BudgetBands()) {
			return nil, errSilentDrop
		}
		row.BudgetBand = budget
	}

	if len(r.Interests) > len(models.Interests()) {
		return nil, errSilentDrop
	}
	seen := map[string]bool{}
	for _, raw := range r.Interests {
		interest := clean(raw, 32)
		if interest == "" || seen[interest] {
			continue
		}
		if !allowed(interest, models.Interests()) {
			return nil, errSilentDrop
		}
		seen[interest] = true
		row.Interests = append(row.Interests, interest)
	}

	return row, nil
}
