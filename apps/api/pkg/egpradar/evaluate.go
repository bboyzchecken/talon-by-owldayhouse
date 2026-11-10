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
	FlagUpcoming   = "upcoming"
	// FlagContinuation: a follow-on phase, probably built on the earlier
	// contractor's work.
	FlagContinuation = "continuation"
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
	// ProjectStatus is e-GP's สถานะโครงการ; WinnerAnnounced is true when the
	// export carries a winner-announced date.
	ProjectStatus   string
	WinnerAnnounced bool
}

// Result is the verdict on one announcement under the current settings.
type Result struct {
	// Subject is the part of the title that names what is hired; keywords
	// and excluded words are matched against it, not the purpose.
	Subject         string      `json:"subject"`
	Stage           string      `json:"stage"`
	StageLabel      string      `json:"stage_label"`
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
	subject := Subject(in.Title)
	agencyText := strings.ToLower(in.Agency + " " + in.ProcurementUnit)

	r := Result{
		Group:           Classify(in.Agency),
		Exclusions:      []Exclusion{},
		Flags:           []Flag{},
		MatchedServices: []string{},
		MatchedKeywords: []string{},
		Interests:       []string{},
		Subject:         subject,
	}
	r.GroupLabel = GroupLabel(r.Group)
	r.Stage = StageOf(in.ProjectStatus, in.WinnerAnnounced)
	r.StageLabel = StageLabel(r.Stage)
	r.Industry = IndustryFor(r.Group)
	r.Watchlisted = containsAny(agencyText, s.Watchlist)

	exclude := func(code, reason string) {
		r.Exclusions = append(r.Exclusions, Exclusion{Code: code, Reason: reason})
	}

	// --- hard filters ---------------------------------------------------
	switch r.Stage {
	case StageAwarded:
		exclude("awarded", "ได้ผู้ชนะแล้ว ยื่นข้อเสนอไม่ได้ (ใช้ดูว่าหน่วยงานนี้จ้างอะไร)")
	case StageCancelled:
		exclude("cancelled", "หน่วยงานยกเลิกโครงการแล้ว")
	}
	if hit := firstHit(agencyText, s.Blocklist); hit != "" {
		exclude("blocklist", "หน่วยงานอยู่ในรายชื่อที่ไม่เอา ("+hit+")")
	}
	if s.HireOnly && !in.Hire {
		exclude("not_hire", "เป็นงานซื้อของ ไม่ใช่งานจ้าง")
	}

	purposeOnly := ""
	var topicKeywords []string
	for _, g := range s.ServiceGroups {
		if !g.Enabled {
			continue
		}
		matched := false
		for _, kw := range g.Keywords {
			if kw == "" {
				continue
			}
			if !strings.Contains(subject, strings.ToLower(kw)) {
				if purposeOnly == "" && strings.Contains(title, strings.ToLower(kw)) {
					purposeOnly = kw
				}
				continue
			}
			r.MatchedKeywords = append(r.MatchedKeywords, kw)
			if topicGroups[g.Key] {
				topicKeywords = append(topicKeywords, kw)
			}
			matched = true
		}
		if matched {
			r.MatchedServices = append(r.MatchedServices, g.Label)
			if g.Interest != "" {
				r.Interests = appendUnique(r.Interests, g.Interest)
			}
		}
	}
	// A system, a video or a campaign is named after its topic: an excluded
	// word after such a keyword says what the work is about
	// ("พัฒนาระบบลงทะเบียนยานพาหนะ" is a system, not a vehicle), so only the
	// words before it count. Events keep the whole subject, so an admin can
	// still drop "จัดกิจกรรมทัศนศึกษา" by excluding ทัศนศึกษา.
	excludeIn := subject
	if first := firstIndex(subject, topicKeywords); first >= 0 {
		excludeIn = subject[:first]
	}
	if hit := firstHit(excludeIn, s.ExcludeKeywords); hit != "" {
		exclude("exclude_keyword", "มีคำที่ตัดทิ้ง: "+hit)
	}

	if len(r.MatchedServices) == 0 {
		if purposeOnly != "" {
			exclude("purpose_only", "คำว่า “"+purposeOnly+"” อยู่ในส่วนวัตถุประสงค์ ส่วนงานที่จ้างจริงคือ “"+shorten(subject, 60)+"”")
		} else {
			exclude("no_service", "ชื่องานไม่ตรงกลุ่มบริการที่เลือก")
		}
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
	if follow, words := Continuation(in.Title); follow {
		r.Flags = append(r.Flags, Flag{
			Code: FlagContinuation, Label: "งานต่อเนื่อง", Severity: SeverityWarn,
			Reason: "ชื่อโครงการมี “" + words + "” อาจมีผู้ทำระยะก่อนอยู่แล้ว เช็ก TOR ว่าต้องต่อยอดจากระบบหรือข้อมูลเดิมไหม และค้นผู้ชนะระยะก่อนใน e-GP ก่อนเตรียมยื่น (อาจเข้าทางรับช่วงกับผู้ชนะแทน)",
		})
	}
	if r.Stage == StageUpcoming {
		r.Flags = append(r.Flags, Flag{
			Code: FlagUpcoming, Label: "ระยะเตรียมการ", Severity: SeverityInfo,
			Reason: "ยังไม่ประกาศเชิญชวน (สถานะ: " + strings.TrimSpace(in.ProjectStatus) + ") แนะนำบริษัทกับหน่วยงานได้ก่อนประกาศ และส่งใบเสนอราคาเมื่อถูกขอ",
		})
	}
	if in.DeadlineAt == nil && (r.Stage == StageOpen || r.Stage == StageUnknown) {
		r.Flags = append(r.Flags, Flag{
			Code: FlagNoDeadline, Label: "ไม่ทราบวันปิดรับ", Severity: SeverityInfo,
			Reason: "ไฟล์ export ของ e-GP ไม่มีวันปิดรับ ดูในหน้าประกาศแล้วกรอกในช่องวันปิดรับ",
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
	// The earliest stage is the most valuable: there is time to be known
	// before the invitation is out.
	if r.Stage == StageUpcoming {
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

// Baht formats an amount as "1,234,567 บาท".
func Baht(v float64) string { return baht(v) }

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

// topicGroups are the service groups whose titles name a topic after the
// keyword.
var topicGroups = map[string]bool{"system": true, "media": true, "digital": true}

// firstIndex is where the earliest of words starts in text, or -1.
func firstIndex(text string, words []string) int {
	first := -1
	for _, w := range words {
		if i := strings.Index(text, strings.ToLower(w)); i >= 0 && (first < 0 || i < first) {
			first = i
		}
	}
	return first
}
