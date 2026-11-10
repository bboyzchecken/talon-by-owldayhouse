package egpradar

import (
	"fmt"
	"math"
	"strings"
	"time"
)

// Severity of a flag. Only warnings count as "flagged" for the default view;
// notices are shown but never hide anything.
const (
	SeverityWarn = "warn"
	SeverityInfo = "info"
)

// Flag codes.
const (
	FlagOverBudget = "over_budget"
	FlagShortPrep  = "short_prep"
	FlagNoDeadline = "no_deadline"
)

// Flag is a label on an announcement, always with the reason behind it. The
// wording stays neutral on purpose: these are signals from the numbers, never
// an accusation against an agency.
type Flag struct {
	Code     string `json:"code"`
	Label    string `json:"label"`
	Reason   string `json:"reason"`
	Severity string `json:"severity"`
}

// Exclusion explains why an announcement did not pass the filters, so a
// keyword list can be tuned against real titles.
type Exclusion struct {
	Code   string `json:"code"`
	Reason string `json:"reason"`
}

// Input is one stored announcement, as the rules see it.
type Input struct {
	Agency          string
	ProcurementUnit string
	Title           string
	Budget          float64
	Province        string
	Hire            bool
	DeadlineAt      *time.Time
}

// Result is the verdict on one announcement under the current settings.
type Result struct {
	Group           string      `json:"group"`
	GroupLabel      string      `json:"group_label"`
	Industry        string      `json:"industry"`
	Passed          bool        `json:"passed"`
	Exclusions      []Exclusion `json:"exclusions"`
	Flags           []Flag      `json:"flags"`
	Flagged         bool        `json:"flagged"`
	Score           int         `json:"score"`
	MatchedServices []string    `json:"matched_services"`
	MatchedKeywords []string    `json:"matched_keywords"`
	Interests       []string    `json:"interests"`
	Watchlisted     bool        `json:"watchlisted"`
	// DaysLeft is whole days from today to the closing date; nil when the
	// closing date is not known.
	DaysLeft *int `json:"days_left"`
}

// Evaluate applies the settings to one announcement. today is the start of
// the current day in Asia/Bangkok.
func Evaluate(in Input, s Settings, today time.Time) Result {
	title := strings.ToLower(in.Title)
	agencyText := strings.ToLower(in.Agency + " " + in.ProcurementUnit)

	r := Result{
		Group:           Classify(in.Agency),
		Exclusions:      []Exclusion{},
		Flags:           []Flag{},
		MatchedServices: []string{},
		MatchedKeywords: []string{},
		Interests:       []string{},
	}
	r.GroupLabel = GroupLabel(r.Group)
	r.Industry = IndustryFor(r.Group)
	r.Watchlisted = containsAny(agencyText, s.Watchlist)

	exclude := func(code, reason string) {
		r.Exclusions = append(r.Exclusions, Exclusion{Code: code, Reason: reason})
	}

	// --- hard filters ---------------------------------------------------
	if hit := firstHit(agencyText, s.Blocklist); hit != "" {
		exclude("blocklist", "หน่วยงานอยู่ในรายชื่อที่ไม่เอา ("+hit+")")
	}
	if hit := firstHit(title, s.ExcludeKeywords); hit != "" {
		exclude("exclude_keyword", "มีคำที่ตัดทิ้ง: "+hit)
	}
	if s.HireOnly && !in.Hire {
		exclude("not_hire", "เป็นงานซื้อของ ไม่ใช่งานจ้าง")
	}

	for _, g := range s.ServiceGroups {
		if !g.Enabled {
			continue
		}
		matched := false
		for _, kw := range g.Keywords {
			if kw != "" && strings.Contains(title, strings.ToLower(kw)) {
				r.MatchedKeywords = append(r.MatchedKeywords, kw)
				matched = true
			}
		}
		if matched {
			r.MatchedServices = append(r.MatchedServices, g.Label)
			if g.Interest != "" {
				r.Interests = appendUnique(r.Interests, g.Interest)
			}
		}
	}
	if len(r.MatchedServices) == 0 {
		exclude("no_service", "ชื่องานไม่ตรงกลุ่มบริการที่เลือก")
	}

	if !r.Watchlisted && !contains(s.AgencyGroups, r.Group) {
		exclude("agency_group", "กลุ่มหน่วยงาน "+r.GroupLabel+" ไม่ได้เลือกไว้")
	}
	if len(s.Provinces) > 0 && in.Province != "" && !contains(s.Provinces, in.Province) {
		exclude("province", "จังหวัด "+in.Province+" ไม่ได้เลือกไว้")
	}
	if s.BudgetMin > 0 && in.Budget > 0 && in.Budget < s.BudgetMin {
		exclude("under_budget", fmt.Sprintf("วงเงิน %s ต่ำกว่าขั้นต่ำ %s", baht(in.Budget), baht(s.BudgetMin)))
	}

	if in.DeadlineAt != nil {
		days := int(math.Floor(startOfDay(*in.DeadlineAt).Sub(startOfDay(today)).Hours() / 24))
		r.DaysLeft = &days
		if days < 0 {
			exclude("closed", "ปิดรับข้อเสนอไปแล้ว")
		}
	}

	r.Passed = len(r.Exclusions) == 0

	// --- warnings (kept, never filtered out) ------------------------------
	if s.BudgetMax > 0 && in.Budget > s.BudgetMax {
		r.Flags = append(r.Flags, Flag{
			Code: FlagOverBudget, Label: "เกินวงเงินที่ตั้ง", Severity: SeverityWarn,
			Reason: fmt.Sprintf("วงเงิน %s เกินเพดาน %s", baht(in.Budget), baht(s.BudgetMax)),
		})
	}
	if r.DaysLeft != nil && *r.DaysLeft >= 0 && *r.DaysLeft < s.MinPrepDays {
		r.Flags = append(r.Flags, Flag{
			Code: FlagShortPrep, Label: "เวลาเตรียมสั้น", Severity: SeverityWarn,
			Reason: fmt.Sprintf("เหลือ %d วันก่อนปิดรับ (ตั้งไว้อย่างน้อย %d วัน) คนที่เตรียมไว้ก่อนได้เปรียบ", *r.DaysLeft, s.MinPrepDays),
		})
	}
	if in.DeadlineAt == nil {
		r.Flags = append(r.Flags, Flag{
			Code: FlagNoDeadline, Label: "ไม่ทราบวันปิดรับ", Severity: SeverityInfo,
			Reason: "ไฟล์จาก e-GP ไม่มีวันปิดรับ ดูในหน้าประกาศก่อนตัดสินใจ",
		})
	}
	for _, f := range r.Flags {
		if f.Severity == SeverityWarn {
			r.Flagged = true
		}
	}

	r.Score = score(r, in, s)
	return r
}

// score ranks passing announcements: a clear service match, a watched agency,
// a budget we can bid on and time to prepare push it up; each warning pulls it
// down. 0-100, and 0 for anything that did not pass.
func score(r Result, in Input, s Settings) int {
	if !r.Passed {
		return 0
	}
	total := 50
	total += min(20, 10*(len(r.MatchedKeywords)-1))
	if r.Watchlisted {
		total += 20
	}
	if in.Budget > 0 && (s.BudgetMax <= 0 || in.Budget <= s.BudgetMax) {
		total += 10
	}
	if r.DaysLeft != nil && *r.DaysLeft >= 2*s.MinPrepDays {
		total += 10
	}
	for _, f := range r.Flags {
		if f.Severity == SeverityWarn {
			total -= 20
		}
	}
	return max(0, min(100, total))
}

func startOfDay(t time.Time) time.Time {
	return time.Date(t.Year(), t.Month(), t.Day(), 0, 0, 0, 0, t.Location())
}

func contains(values []string, v string) bool {
	for _, x := range values {
		if x == v {
			return true
		}
	}
	return false
}

func containsAny(text string, needles []string) bool { return firstHit(text, needles) != "" }

func firstHit(text string, needles []string) string {
	for _, n := range needles {
		if n != "" && strings.Contains(text, strings.ToLower(n)) {
			return n
		}
	}
	return ""
}

func appendUnique(values []string, v string) []string {
	if contains(values, v) {
		return values
	}
	return append(values, v)
}

func baht(v float64) string {
	whole := int64(math.Round(v))
	s := fmt.Sprintf("%d", whole)
	var b strings.Builder
	for i, c := range s {
		if i > 0 && (len(s)-i)%3 == 0 {
			b.WriteByte(',')
		}
		b.WriteRune(c)
	}
	return b.String() + " บาท"
}
