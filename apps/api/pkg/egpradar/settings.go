// Package egpradar holds e-GP Radar's rules as pure functions: which public
// procurement announcements are worth a look, how they score, and which carry
// a warning. Everything is driven by Settings, which an admin edits on the
// Radar settings screen, so changing a setting re-evaluates every stored
// announcement at once without fetching anything again.
//
// Announcements come from the CSV that e-GP's own "Export .CSV" button
// produces after a person has searched. The system never signs in to e-GP and
// never goes around its bot protection.
package egpradar

import (
	"errors"
	"strings"
)

// Agency groups. An agency is classified from its name (see Classify).
const (
	GroupUniversity      = "university"
	GroupSchool          = "school"
	GroupHealth          = "health"
	GroupMinistry        = "ministry"
	GroupLocal           = "local"
	GroupStateEnterprise = "state_enterprise"
	GroupOther           = "other"
)

// AllGroups lists every agency group in display order.
func AllGroups() []string {
	return []string{
		GroupUniversity, GroupSchool, GroupHealth, GroupMinistry,
		GroupLocal, GroupStateEnterprise, GroupOther,
	}
}

// ServiceGroup is one kind of work ODH sells through public procurement,
// recognised by keywords in the project title.
type ServiceGroup struct {
	Key      string   `json:"key"`
	Label    string   `json:"label"`
	Enabled  bool     `json:"enabled"`
	Keywords []string `json:"keywords"`
	// Interest is the Lead Tracker interest tag a match maps to.
	Interest string `json:"interest"`
}

// SettingsVersion goes up whenever Defaults gains words that settings saved
// earlier should pick up (see Upgrade).
const SettingsVersion = 2

// DefaultBudgetMin drops tiny purchases (stamps, vinyl banners, a van for a
// day) that are not worth a bid.
const DefaultBudgetMin = 50_000

// Settings is everything an admin can change on the Radar settings screen.
type Settings struct {
	// Version is the SettingsVersion these settings were last saved under.
	Version int `json:"version"`

	AgencyGroups []string `json:"agency_groups"`
	// Provinces filters only announcements whose province is known.
	Provinces []string `json:"provinces"`
	// Watchlist agencies always pass the agency-group filter and score higher.
	Watchlist []string `json:"watchlist"`
	// Blocklist agencies are always excluded.
	Blocklist []string `json:"blocklist"`

	BudgetMin float64 `json:"budget_min"`
	// BudgetMax is a warning line, not a filter: a project above it is kept
	// and labelled, because the user asked to see those with a warning.
	BudgetMax float64 `json:"budget_max"`

	ServiceGroups   []ServiceGroup `json:"service_groups"`
	ExcludeKeywords []string       `json:"exclude_keywords"`
	// HireOnly keeps procurements to hire someone (จ้าง) and drops purchases
	// of goods (ซื้อ), which ODH does not sell.
	HireOnly bool `json:"hire_only"`

	// MinPrepDays is how many days before the closing date are needed to
	// prepare a bid; fewer earns a warning.
	MinPrepDays int `json:"min_prep_days"`
	// HideFlaggedByDefault hides announcements with a warning from the main
	// view (one click shows them).
	HideFlaggedByDefault bool `json:"hide_flagged_by_default"`

	// DefaultAssigneeID is the account new leads go to; nil = the admin who
	// sends them.
	DefaultAssigneeID *uint `json:"default_assignee_id"`
	// LeadTimeDays sets the lead's follow-up date this many days before the
	// project closes.
	LeadTimeDays int `json:"lead_time_days"`

	// AnalysisContext is what the admin writes about the company (registered
	// capital, contracts and reference letters, team, partners). It heads
	// every export for Claude, so the analysis is about this company.
	AnalysisContext string `json:"analysis_context"`
}

// MaxAnalysisContext keeps the company notes to a size worth reading.
const MaxAnalysisContext = 4000

// Defaults are the settings the Radar starts with: the user's current work —
// projects up to 1 million baht from universities, schools and public health.
func Defaults() Settings {
	return Settings{
		Version:       SettingsVersion,
		AgencyGroups:  []string{GroupUniversity, GroupSchool, GroupHealth},
		Provinces:     []string{},
		Watchlist:     []string{},
		Blocklist:     []string{},
		BudgetMin:     DefaultBudgetMin,
		BudgetMax:     1_000_000,
		ServiceGroups: DefaultServiceGroups(),
		// Matched against what is hired (see Subject), so a video about a
		// construction project is not dropped for "ก่อสร้าง".
		ExcludeKeywords: []string{"ก่อสร้าง", "ครุภัณฑ์", "จัดซื้อวัสดุ", "เช่ารถ", "เหมารถ", "รถตู้", "รถโดยสาร", "พาหนะ", "อาหาร", "น้ำดื่ม", "ที่พัก", "ซ่อมแซม", "ทำความสะอาด", "ไฟฟ้า", "ปรับอากาศ", "ประปา", "กล้องวงจรปิด", "รักษาความปลอดภัย", "ถ่ายเอกสาร", "ตรายาง"},
		HireOnly:        true,

		MinPrepDays:          7,
		HideFlaggedByDefault: true,
		DefaultAssigneeID:    nil,
		LeadTimeDays:         3,
	}
}

// DefaultServiceGroups are the four kinds of work ODH sells to the state.
func DefaultServiceGroups() []ServiceGroup {
	return []ServiceGroup{
		{
			Key: "system", Label: "ระบบ / เว็บ", Enabled: true, Interest: "system",
			Keywords: []string{"พัฒนาระบบ", "ระบบสารสนเทศ", "ระบบบริหารจัดการ", "ระบบลงทะเบียน", "ระบบฐานข้อมูล", "ฐานข้อมูล", "จัดทำระบบ", "เว็บไซต์", "website", "แอปพลิเคชัน", "แอปพลิเคชั่น", "application", "ซอฟต์แวร์", "แพลตฟอร์ม", "dashboard"},
		},
		{
			Key: "event", Label: "จัดงาน / กิจกรรม", Enabled: true, Interest: "event",
			Keywords: []string{"จัดงาน", "จัดกิจกรรม", "นิทรรศการ", "อีเวนต์", "อีเว้นท์", "event", "สัมมนา", "จัดอบรม", "จัดฝึกอบรม", "จัดประชุม", "เปิดตัว", "บูธ"},
		},
		{
			Key: "media", Label: "สื่อ / วิดีโอ", Enabled: true, Interest: "kol",
			Keywords: []string{"วิดีโอ", "วีดีโอ", "วีดิทัศน์", "คลิป", "ถ่ายทำ", "ผลิตสื่อ", "สื่อประชาสัมพันธ์", "อินฟลูเอนเซอร์", "influencer", "kol", "แอนิเมชัน", "ภาพยนตร์สั้น", "สกู๊ป", "สารคดี", "อินโฟกราฟิก"},
		},
		{
			Key: "digital", Label: "การตลาดออนไลน์", Enabled: true, Interest: "digital_marketing",
			Keywords: []string{"สื่อออนไลน์", "การตลาดออนไลน์", "ประชาสัมพันธ์ออนไลน์", "โซเชียล", "social media", "เฟซบุ๊ก", "facebook", "digital marketing", "ดิจิทัลมาร์เก็ตติ้ง", "โฆษณาออนไลน์"},
		},
	}
}

// Upgrade brings settings saved under an older SettingsVersion up to date
// without undoing the admin's choices: new built-in excluded words and service
// keywords are added to what was saved, and a minimum budget is set only if
// none was. It reports whether anything changed.
func (s Settings) Upgrade() (Settings, bool) {
	if s.Version >= SettingsVersion {
		return s, false
	}
	d := Defaults()
	s.ExcludeKeywords = union(s.ExcludeKeywords, d.ExcludeKeywords)
	for i := range s.ServiceGroups {
		g := &s.ServiceGroups[i]
		g.Keywords = without(g.Keywords, retiredKeywords[g.Key])
		for _, dg := range d.ServiceGroups {
			if dg.Key == g.Key {
				g.Keywords = union(g.Keywords, dg.Keywords)
			}
		}
	}
	if s.BudgetMin == 0 && (s.BudgetMax == 0 || s.BudgetMax >= DefaultBudgetMin) {
		s.BudgetMin = DefaultBudgetMin
	}
	s.Version = SettingsVersion
	return s, true
}

// retiredKeywords were built-in once and caught the wrong work:
// "ปรับปรุงระบบ" matched plumbing (ปรับปรุงระบบประปา) more than software.
var retiredKeywords = map[string][]string{
	"system": {"ปรับปรุงระบบ"},
}

func without(have, drop []string) []string {
	out := make([]string, 0, len(have))
	for _, v := range have {
		keep := true
		for _, d := range drop {
			if strings.EqualFold(strings.TrimSpace(v), d) {
				keep = false
			}
		}
		if keep {
			out = append(out, v)
		}
	}
	return out
}

func union(have, add []string) []string {
	out := append([]string{}, have...)
	seen := map[string]bool{}
	for _, v := range have {
		seen[strings.ToLower(strings.TrimSpace(v))] = true
	}
	for _, v := range add {
		if !seen[strings.ToLower(v)] {
			seen[strings.ToLower(v)] = true
			out = append(out, v)
		}
	}
	return out
}

// Normalize trims every list, drops blanks and fills missing numbers, so a
// half-filled form from the UI never produces nonsense.
func (s Settings) Normalize() Settings {
	clean := func(values []string) []string {
		out := make([]string, 0, len(values))
		seen := map[string]bool{}
		for _, v := range values {
			v = strings.TrimSpace(v)
			key := strings.ToLower(v)
			if v == "" || seen[key] {
				continue
			}
			seen[key] = true
			out = append(out, v)
		}
		return out
	}

	s.AgencyGroups = clean(s.AgencyGroups)
	s.Provinces = clean(s.Provinces)
	s.Watchlist = clean(s.Watchlist)
	s.Blocklist = clean(s.Blocklist)
	s.ExcludeKeywords = clean(s.ExcludeKeywords)
	for i := range s.ServiceGroups {
		s.ServiceGroups[i].Keywords = clean(s.ServiceGroups[i].Keywords)
		s.ServiceGroups[i].Key = strings.TrimSpace(s.ServiceGroups[i].Key)
		s.ServiceGroups[i].Label = strings.TrimSpace(s.ServiceGroups[i].Label)
	}
	if s.ServiceGroups == nil {
		s.ServiceGroups = DefaultServiceGroups()
	}
	s.AnalysisContext = strings.TrimSpace(s.AnalysisContext)
	if s.MinPrepDays < 0 {
		s.MinPrepDays = 0
	}
	if s.LeadTimeDays < 0 {
		s.LeadTimeDays = 0
	}
	if s.BudgetMin < 0 {
		s.BudgetMin = 0
	}
	if s.BudgetMax < 0 {
		s.BudgetMax = 0
	}
	return s
}

// Validate rejects settings that cannot be meant.
func (s Settings) Validate() error {
	known := map[string]bool{}
	for _, g := range AllGroups() {
		known[g] = true
	}
	for _, g := range s.AgencyGroups {
		if !known[g] {
			return errors.New("กลุ่มหน่วยงานไม่ถูกต้อง: " + g)
		}
	}
	if s.BudgetMax > 0 && s.BudgetMin > s.BudgetMax {
		return errors.New("วงเงินขั้นต่ำต้องไม่มากกว่าวงเงินสูงสุด")
	}
	for _, g := range s.ServiceGroups {
		if g.Key == "" || g.Label == "" {
			return errors.New("กลุ่มบริการต้องมีทั้ง key และชื่อ")
		}
	}
	if len([]rune(s.AnalysisContext)) > MaxAnalysisContext {
		return errors.New("ข้อมูลบริษัทสำหรับการวิเคราะห์ยาวเกิน 4,000 ตัวอักษร")
	}
	if s.MinPrepDays > 90 || s.LeadTimeDays > 90 {
		return errors.New("จำนวนวันต้องไม่เกิน 90")
	}
	return nil
}
