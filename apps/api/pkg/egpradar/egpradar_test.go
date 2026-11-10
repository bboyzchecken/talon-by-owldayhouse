package egpradar

import (
	"strings"
	"testing"
	"time"
)

var bangkok = time.FixedZone("ICT", 7*60*60)

func day(y int, m time.Month, d int) time.Time { return time.Date(y, m, d, 0, 0, 0, 0, bangkok) }

func ptr(t time.Time) *time.Time { return &t }

// The announcement from the user's e-GP screenshot.
const bankTitle = "ประกวดราคาจ้างเช่าใช้สิทธิ์ซอฟต์แวร์ระบบบริหารจัดการฐานข้อมูล เพื่อรองรับบริการ Bulk Payment ด้วยวิธีประกวดราคาอิเล็กทรอนิกส์ (e-bidding) (เลขที่โครงการ : 69109061081)"

func TestParseTitleReadsTheRealE_GPTitle(t *testing.T) {
	p := ParseTitle(bankTitle)
	if p.ProjectID != "69109061081" {
		t.Errorf("ProjectID = %q", p.ProjectID)
	}
	if p.Method != MethodEBidding {
		t.Errorf("Method = %q, want e-bidding", p.Method)
	}
	if !p.Hire {
		t.Error("ประกวดราคาจ้าง… is a hire, not a purchase")
	}
	if strings.Contains(p.Title, "เลขที่โครงการ") {
		t.Errorf("the project number should be stripped from the title: %q", p.Title)
	}
	if !strings.HasSuffix(p.Title, "(e-bidding)") {
		t.Errorf("Title = %q", p.Title)
	}
}

func TestParseTitleMethods(t *testing.T) {
	cases := map[string]string{
		"จ้างทำเว็บไซต์ โดยวิธีเฉพาะเจาะจง":                       MethodSpecific,
		"จ้างจัดงานนิทรรศการ ด้วยวิธีคัดเลือก":                    MethodSelection,
		"ซื้อวัสดุสำนักงาน ด้วยวิธีตลาดอิเล็กทรอนิกส์ (e-market)": MethodEMarket,
		"จ้างผลิตวิดีโอ": MethodUnknown,
	}
	for title, want := range cases {
		if got := ParseTitle(title).Method; got != want {
			t.Errorf("ParseTitle(%q).Method = %q, want %q", title, got, want)
		}
	}
	if ParseTitle("ซื้อครุภัณฑ์คอมพิวเตอร์").Hire {
		t.Error("ซื้อ… is a purchase")
	}
}

func TestClassify(t *testing.T) {
	cases := map[string]string{
		"มหาวิทยาลัยธรรมศาสตร์":                               GroupUniversity,
		"คณะแพทยศาสตร์ มหาวิทยาลัยเชียงใหม่":                  GroupUniversity,
		"วิทยาลัยเทคนิคเชียงใหม่":                             GroupSchool,
		"โรงเรียนยุพราชวิทยาลัย":                              GroupSchool,
		"สำนักงานเขตพื้นที่การศึกษาประถมศึกษาเชียงใหม่ เขต 1": GroupSchool,
		"โรงพยาบาลนครพิงค์":                                   GroupHealth,
		"สำนักงานสาธารณสุขจังหวัดเชียงใหม่":                   GroupHealth,
		"องค์การบริหารส่วนจังหวัดเชียงใหม่":                   GroupLocal,
		"เทศบาลนครเชียงใหม่":                                  GroupLocal,
		"กรุงเทพมหานคร":                                       GroupLocal,
		"ธนาคารอิสลามแห่งประเทศไทย":                           GroupStateEnterprise,
		"การท่องเที่ยวแห่งประเทศไทย":                          GroupStateEnterprise,
		"กรมบัญชีกลาง":                                        GroupMinistry,
		"ร้านลุงสมชาย":                                        GroupOther,
	}
	for agency, want := range cases {
		if got := Classify(agency); got != want {
			t.Errorf("Classify(%q) = %q, want %q", agency, got, want)
		}
	}
}

func input(agency, title string, budget float64, deadline *time.Time) Input {
	p := ParseTitle(title)
	return Input{Agency: agency, Title: p.Title, Budget: budget, Hire: p.Hire, DeadlineAt: deadline}
}

func TestTheScreenshotAnnouncementUnderDefaults(t *testing.T) {
	today := day(2026, time.November, 10)
	r := Evaluate(input("ธนาคารอิสลามแห่งประเทศไทย", bankTitle, 2_000_000, nil), Defaults(), today)

	// A state bank is not in the default agency groups, so it is filtered out…
	if r.Passed {
		t.Fatalf("expected the default agency groups to filter a state bank out: %+v", r)
	}
	if !hasExclusion(r, "agency_group") {
		t.Errorf("exclusions = %+v, want agency_group", r.Exclusions)
	}
	// …but the reasons are still worked out, so the list can be tuned.
	if !hasFlag(r, FlagOverBudget) {
		t.Errorf("2,000,000 against a 1,000,000 ceiling must be flagged: %+v", r.Flags)
	}
	if len(r.MatchedServices) == 0 {
		t.Error("ซอฟต์แวร์ / ฐานข้อมูล should match the system service group")
	}
}

func TestAWatchlistedAgencyPassesTheGroupFilter(t *testing.T) {
	s := Defaults()
	s.Watchlist = []string{"ธนาคารอิสลาม"}
	r := Evaluate(input("ธนาคารอิสลามแห่งประเทศไทย", bankTitle, 2_000_000, nil), s, day(2026, time.November, 10))
	if !r.Passed {
		t.Fatalf("a watchlisted agency must pass: %+v", r.Exclusions)
	}
	if !r.Flagged {
		t.Error("over budget is still a warning")
	}
}

func TestAGoodAnnouncementPassesAndScoresWell(t *testing.T) {
	today := day(2026, time.November, 10)
	r := Evaluate(input(
		"มหาวิทยาลัยเชียงใหม่",
		"จ้างพัฒนาระบบลงทะเบียนนักศึกษาและเว็บไซต์ โดยวิธีเฉพาะเจาะจง (เลขที่โครงการ : 69119000001)",
		480_000, ptr(day(2026, time.November, 30)),
	), Defaults(), today)

	if !r.Passed {
		t.Fatalf("should pass: %+v", r.Exclusions)
	}
	if r.Flagged {
		t.Errorf("nothing to warn about: %+v", r.Flags)
	}
	if r.Industry != "education" {
		t.Errorf("Industry = %q", r.Industry)
	}
	if len(r.Interests) != 1 || r.Interests[0] != "system" {
		t.Errorf("Interests = %v, want [system]", r.Interests)
	}
	if r.DaysLeft == nil || *r.DaysLeft != 20 {
		t.Errorf("DaysLeft = %v, want 20", r.DaysLeft)
	}
	if r.Score < 80 {
		t.Errorf("Score = %d, a clear multi-keyword match within budget with time to prepare should rank high", r.Score)
	}
}

func TestShortPreparationTimeIsAWarning(t *testing.T) {
	today := day(2026, time.November, 10)
	r := Evaluate(input("มหาวิทยาลัยเชียงใหม่", "จ้างจัดงานนิทรรศการวิชาการ", 300_000, ptr(day(2026, time.November, 13))), Defaults(), today)
	if !r.Passed || !hasFlag(r, FlagShortPrep) {
		t.Fatalf("3 days left must pass with a short-prep warning: passed=%v flags=%+v", r.Passed, r.Flags)
	}
}

func TestAClosedAnnouncementIsExcluded(t *testing.T) {
	today := day(2026, time.November, 10)
	r := Evaluate(input("มหาวิทยาลัยเชียงใหม่", "จ้างจัดงานนิทรรศการ", 300_000, ptr(day(2026, time.November, 9))), Defaults(), today)
	if r.Passed || !hasExclusion(r, "closed") {
		t.Fatalf("a closing date in the past must exclude: %+v", r.Exclusions)
	}
}

func TestExcludeKeywordsAndPurchasesAreFilteredOut(t *testing.T) {
	today := day(2026, time.November, 10)
	s := Defaults()

	r := Evaluate(input("มหาวิทยาลัยเชียงใหม่", "จ้างปรับปรุงระบบไฟฟ้าอาคารเรียน", 900_000, nil), s, today)
	if r.Passed || !hasExclusion(r, "exclude_keyword") {
		t.Errorf("ไฟฟ้า must exclude even though ปรับปรุงระบบ matches: %+v", r.Exclusions)
	}

	r = Evaluate(input("มหาวิทยาลัยเชียงใหม่", "ซื้อซอฟต์แวร์สำนักงาน", 200_000, nil), s, today)
	if r.Passed || !hasExclusion(r, "not_hire") {
		t.Errorf("a purchase must be excluded while HireOnly is on: %+v", r.Exclusions)
	}

	s.HireOnly = false
	r = Evaluate(input("มหาวิทยาลัยเชียงใหม่", "ซื้อซอฟต์แวร์สำนักงาน", 200_000, nil), s, today)
	if !r.Passed {
		t.Errorf("with HireOnly off the purchase should pass: %+v", r.Exclusions)
	}
}

func TestABlocklistedAgencyIsAlwaysExcluded(t *testing.T) {
	s := Defaults()
	s.Blocklist = []string{"เชียงใหม่"}
	r := Evaluate(input("มหาวิทยาลัยเชียงใหม่", "จ้างทำเว็บไซต์", 100_000, nil), s, day(2026, time.November, 10))
	if r.Passed || !hasExclusion(r, "blocklist") {
		t.Fatalf("blocklist must exclude: %+v", r.Exclusions)
	}
}

func TestDisabledServiceGroupsDoNotMatch(t *testing.T) {
	s := Defaults()
	for i := range s.ServiceGroups {
		if s.ServiceGroups[i].Key == "event" {
			s.ServiceGroups[i].Enabled = false
		}
	}
	r := Evaluate(input("มหาวิทยาลัยเชียงใหม่", "จ้างจัดงานนิทรรศการ", 300_000, nil), s, day(2026, time.November, 10))
	if r.Passed || !hasExclusion(r, "no_service") {
		t.Fatalf("with the event group off, an event job must not match: %+v", r)
	}
}

func TestNoDeadlineIsANoticeNotAWarning(t *testing.T) {
	r := Evaluate(input("มหาวิทยาลัยเชียงใหม่", "จ้างผลิตวิดีโอประชาสัมพันธ์", 200_000, nil), Defaults(), day(2026, time.November, 10))
	if !r.Passed || !hasFlag(r, FlagNoDeadline) {
		t.Fatalf("passed=%v flags=%+v", r.Passed, r.Flags)
	}
	if r.Flagged {
		t.Error("a missing closing date is a notice; it must not hide the announcement")
	}
}

func TestSettingsNormalizeAndValidate(t *testing.T) {
	s := Defaults()
	s.Watchlist = []string{"  มช. ", "", "มช."}
	s.MinPrepDays = -3
	n := s.Normalize()
	if len(n.Watchlist) != 1 || n.Watchlist[0] != "มช." {
		t.Errorf("Watchlist = %#v", n.Watchlist)
	}
	if n.MinPrepDays != 0 {
		t.Errorf("MinPrepDays = %d", n.MinPrepDays)
	}
	if err := n.Validate(); err != nil {
		t.Errorf("defaults should validate: %v", err)
	}

	bad := Defaults()
	bad.BudgetMin, bad.BudgetMax = 2_000_000, 1_000_000
	if bad.Validate() == nil {
		t.Error("min above max must be rejected")
	}
	bad = Defaults()
	bad.AgencyGroups = []string{"aliens"}
	if bad.Validate() == nil {
		t.Error("an unknown group must be rejected")
	}
}

func hasFlag(r Result, code string) bool {
	for _, f := range r.Flags {
		if f.Code == code {
			return true
		}
	}
	return false
}

func hasExclusion(r Result, code string) bool {
	for _, e := range r.Exclusions {
		if e.Code == code {
			return true
		}
	}
	return false
}
