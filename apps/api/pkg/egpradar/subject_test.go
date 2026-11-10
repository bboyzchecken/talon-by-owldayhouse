package egpradar

import (
	"strings"
	"testing"
	"time"
)

// Titles from real e-GP exports.
func TestSubjectCutsOffThePurpose(t *testing.T) {
	cases := []struct{ title, subject string }{
		{"จ้างเหมาบริการรถโดยสารไม่ประจำทางไปกลับ เพื่อเข้าร่วมอบรมโครงการประชุมสัมมนาบุคลากร", "จ้างเหมาบริการรถโดยสารไม่ประจำทาง"},
		{"จ้างเหมาพาหนะเดินทางรับ - ส่ง ผู้เข้าฝึกอบรมและเจ้าหน้าที่ ตามโครงการฝึกอบรมอาสาสมัคร", "จ้างเหมาพาหนะ"},
		{"จ้างเหมารถโครงการห้องเรียนส่งเสริมและพัฒนาคุณภาพการศึกษา", "จ้างเหมารถ"},
		{"จ้างเหมาจัดทำป้ายไวนิล ใช้ในการจัดกิจกรรมหนูน้อยวิถีพุทธ", "จ้างเหมาจัดทำป้ายไวนิล"},
		{"จ้างเหมาจัดทำอาหารพร้อมน้ำดื่ม โครงการจัดงานประเพณีลอยกระทง ประจำปี 2569", "จ้างเหมาจัดทำอาหารพร้อมน้ำดื่ม"},
		{"ประกวดราคาจ้างก่อสร้างกิจกรรมบำรุงรักษาทางหลวง ปี 2570", "ประกวดราคาจ้างก่อสร้าง"},
		// The project itself is hired: nothing is cut.
		{"จ้างจัดโครงการส่งเสริมการจัดงานประเพณี (จัดงานประเพณีลอยกระทงท่าเหนือ)", "จ้างจัดโครงการส่งเสริมการจัดงานประเพณี (จัดงานประเพณีลอยกระทงท่าเหนือ)"},
		{"ประกวดราคาจ้างโครงการ ชลบุรี คอฟฟี่ ออน เดอะ บีช บางแสน", "ประกวดราคาจ้างโครงการ ชลบุรี คอฟฟี่ ออน เดอะ บีช บางแสน"},
		{"จ้างพัฒนาระบบลงทะเบียนนักศึกษา เพื่อการบริหารงานทะเบียน", "จ้างพัฒนาระบบลงทะเบียนนักศึกษา"},
		// A generic subject: the purpose is the work.
		{"จ้างที่ปรึกษาเพื่อพัฒนาระบบสารสนเทศ", "จ้างที่ปรึกษาเพื่อพัฒนาระบบสารสนเทศ"},
		{"ประกวดราคาจ้างค่าใช้จ่ายในการจัดกิจกรรมวันเด็ก", "ประกวดราคาจ้างค่าใช้จ่ายในการจัดกิจกรรมวันเด็ก"},
		{"จ้างจัดส่งไปรษณีย์ด่วนพิเศษ", "จ้างจัดส่งไปรษณีย์ด่วนพิเศษ"},
	}
	for _, c := range cases {
		if got := Subject(c.title); got != c.subject {
			t.Errorf("Subject(%q)\n got %q\nwant %q", c.title, got, c.subject)
		}
	}
}

// The user's report: a 5,000-baht van hire to a training reached the inbox
// because the title mentions อบรม and they had added อบรม as a keyword.
func TestKeywordInThePurposeDoesNotMatch(t *testing.T) {
	s := Defaults()
	s.ExcludeKeywords = nil // as if saved before vehicles were excluded
	s.BudgetMin = 0
	for i := range s.ServiceGroups {
		if s.ServiceGroups[i].Key == "event" {
			s.ServiceGroups[i].Keywords = append(s.ServiceGroups[i].Keywords, "อบรม")
		}
	}
	today := time.Date(2026, 11, 10, 0, 0, 0, 0, time.UTC)
	r := Evaluate(Input{
		Agency: "โรงเรียนบัวใหญ่", Title: "จ้างเหมารถตู้ไปอบรมครู ณ จังหวัดขอนแก่น",
		Budget: 5000, Hire: true, ProjectStatus: "หนังสือเชิญชวน/ประกาศเชิญชวน",
	}, s, today)
	if r.Passed {
		t.Fatalf("van hire passed: %+v", r)
	}
	if !hasExclusion(r, "purpose_only") || !strings.Contains(r.Exclusions[0].Reason, "อบรม") {
		t.Fatalf("want purpose_only naming อบรม, got %+v", r.Exclusions)
	}

	// The training itself is hired: it passes.
	r = Evaluate(Input{
		Agency: "โรงเรียนบัวใหญ่", Title: "จ้างจัดอบรมครูด้านดิจิทัล เพื่อพัฒนาทักษะ",
		Budget: 300000, Hire: true, ProjectStatus: "หนังสือเชิญชวน/ประกาศเชิญชวน",
	}, s, today)
	if !r.Passed {
		t.Fatalf("training hire excluded: %+v", r.Exclusions)
	}
}

func TestExcludedWordAfterTheServiceDoesNotCount(t *testing.T) {
	s := Defaults()
	s.AgencyGroups = AllGroups()
	today := time.Date(2026, 11, 10, 0, 0, 0, 0, time.UTC)
	open := "หนังสือเชิญชวน/ประกาศเชิญชวน"

	r := Evaluate(Input{Agency: "กรมการขนส่งทางบก", Title: "ประกวดราคาจ้างจ้างเหมาพัฒนาระบบสารสนเทศลงทะเบียนยานพาหนะ", Budget: 900000, Hire: true, ProjectStatus: open}, s, today)
	if !r.Passed {
		t.Fatalf("a vehicle registration system is a system job: %+v", r.Exclusions)
	}
	r = Evaluate(Input{Agency: "กรมประชาสัมพันธ์", Title: "จ้างผลิตวิดีโอประชาสัมพันธ์การก่อสร้างรถไฟทางคู่", Budget: 900000, Hire: true, ProjectStatus: open}, s, today)
	if !r.Passed {
		t.Fatalf("a video about construction is a video job: %+v", r.Exclusions)
	}
	// Events keep the whole subject, so an admin can drop school trips.
	s.ExcludeKeywords = append(s.ExcludeKeywords, "ทัศนศึกษา")
	r = Evaluate(Input{Agency: "โรงเรียนเตรียมอุดมศึกษา", Title: "ประกวดราคาจ้างเหมาบริการจัดกิจกรรมทัศนศึกษาแหล่งเรียนรู้นอกห้องเรียน", Budget: 900000, Hire: true, ProjectStatus: open}, s, today)
	if !hasExclusion(r, "exclude_keyword") {
		t.Fatalf("a school trip with ทัศนศึกษา excluded should not pass: %+v", r)
	}
	r = Evaluate(Input{Agency: "เทศบาลตำบลศรีชุม", Title: "จ้างโครงการปรับปรุงระบบประปาหมู่บ้าน หมู่ที่ ๘", Budget: 360000, Hire: true, ProjectStatus: open}, s, today)
	if r.Passed {
		t.Fatalf("village plumbing passed: %+v", r)
	}
}

func TestUpgradeAddsNewDefaultsAndKeepsChoices(t *testing.T) {
	saved := Settings{
		Version:         0,
		AgencyGroups:    []string{GroupUniversity, GroupLocal},
		ExcludeKeywords: []string{"ก่อสร้าง", "งานศพ"},
		ServiceGroups: []ServiceGroup{
			{Key: "event", Label: "อีเวนต์", Enabled: true, Keywords: []string{"จัดงาน", "อบรม"}},
			{Key: "system", Label: "ระบบ", Enabled: false, Keywords: []string{"ปรับปรุงระบบ", "เว็บไซต์"}},
		},
		BudgetMax: 1_000_000,
	}
	got, changed := saved.Upgrade()
	if !changed || got.Version != SettingsVersion {
		t.Fatalf("not upgraded: %+v", got)
	}
	for _, w := range []string{"งานศพ", "เหมารถ", "รถโดยสาร", "พาหนะ"} {
		if !contains(got.ExcludeKeywords, w) {
			t.Errorf("exclude keywords lack %q: %v", w, got.ExcludeKeywords)
		}
	}
	event, system := got.ServiceGroups[0], got.ServiceGroups[1]
	if !contains(event.Keywords, "อบรม") || !contains(event.Keywords, "จัดอบรม") || event.Label != "อีเวนต์" {
		t.Errorf("event group: %+v", event)
	}
	if contains(system.Keywords, "ปรับปรุงระบบ") || system.Enabled {
		t.Errorf("system group: %+v", system)
	}
	if got.BudgetMin != DefaultBudgetMin || len(got.AgencyGroups) != 2 {
		t.Errorf("choices changed: %+v", got)
	}
	if again, changed := got.Upgrade(); changed || len(again.ExcludeKeywords) != len(got.ExcludeKeywords) {
		t.Errorf("second upgrade changed settings")
	}
}

func TestParseCSVReadsTheFiltersAboveTheHeader(t *testing.T) {
	file := "\ufeffข้อมูลโครงการจัดซื้อจัดจ้าง ประจำปีงบประมาณ พ.ศ. 2570\n" +
		"วิธีการจัดหา \"ประกวดราคาอิเล็กทรอนิกส์ (e-bidding)\"\n" +
		"ประเภทการจัดหา \"จ้างทำของ/จ้างเหมาบริการ\"\n" +
		",,,,,,,,,\n" +
		"ลำดับ,หน่วยงาน,จังหวัด,เลขที่โครงการ,ชื่อโครงการ,วันที่ประกาศเชิญชวน,วงเงินงบประมาณ(บาท),ราคากลาง(บาท),วันที่ประกาศผู้ชนะ,สถานะโครงการ\n" +
		"1,โรงพยาบาลชัยภูมิ,ชัยภูมิ,69119000001,เช่าระบบคิวออนไลน์ 12 เดือน,05/11/2569,\"500,000.00\",\"500,000.00\",,หนังสือเชิญชวน/ประกาศเชิญชวน\n"
	rows, problems, err := ParseCSV(strings.NewReader(file))
	if err != nil || len(problems) != 0 || len(rows) != 1 {
		t.Fatalf("rows=%d problems=%v err=%v", len(rows), problems, err)
	}
	if !rows[0].Hire || rows[0].Method != MethodOf("ประกวดราคาอิเล็กทรอนิกส์ (e-bidding)") {
		t.Fatalf("filters not applied: %+v", rows[0])
	}
}

func TestShortTitle(t *testing.T) {
	cases := map[string]string{
		"ประกวดราคาจ้างบำรุงรักษาโปรแกรมระบบสารสนเทศ จำนวน 2 รายการ ด้วยวิธีประกวดราคาอิเล็กทรอนิกส์ (e-bidding)": "จ้างบำรุงรักษาโปรแกรมระบบสารสนเทศ จำนวน 2 รายการ",
		"ประกวดราคาจ้างจ้างเหมาจัดงานตามโครงการส่งเสริมการท่องเที่ยว":                                             "จ้างเหมาจัดงานตามโครงการส่งเสริมการท่องเที่ยว",
		"ซื้อซื้อวัสดุอุปกรณ์กิจกรรม โดยวิธีเฉพาะเจาะจง":                                                          "ซื้อวัสดุอุปกรณ์กิจกรรม",
		"จ้างทำตรายาง": "จ้างทำตรายาง",
	}
	for in, want := range cases {
		if got := ShortTitle(in, 0); got != want {
			t.Errorf("ShortTitle(%q) = %q, want %q", in, got, want)
		}
	}
	if got := ShortTitle("จ้างพัฒนาระบบลงทะเบียนนักศึกษาและระบบประเมินผลการเรียน", 20); len([]rune(got)) != 21 || !strings.HasSuffix(got, "…") {
		t.Errorf("cut: %q", got)
	}
}

func TestParseCSVReadsTheClosingDateWhateverItIsCalled(t *testing.T) {
	for _, header := range []string{"วันสิ้นสุดเสนอราคา", "วันที่สิ้นสุดการยื่นข้อเสนอ", "วันสิ้นสุดเสนอ", "วันที่ปิดรับข้อเสนอ (วัน/เดือน/ปี)"} {
		file := "หน่วยงาน,เลขที่โครงการ,ชื่อโครงการ,วันที่ประกาศผู้ชนะ," + header + "\n" +
			"มหาวิทยาลัยเชียงใหม่,69119000001,จ้างพัฒนาเว็บไซต์,,20/11/2569 16:30\n"
		rows, problems, err := ParseCSV(strings.NewReader(file))
		if err != nil || len(problems) != 0 || len(rows) != 1 {
			t.Fatalf("%s: rows=%d problems=%v err=%v", header, len(rows), problems, err)
		}
		d := rows[0].DeadlineAt
		if d == nil || d.Year() != 2026 || d.Month() != 11 || d.Day() != 20 {
			t.Errorf("%s: deadline = %v", header, d)
		}
		if rows[0].WinnerAt != nil {
			t.Errorf("%s: the winner column was read as a date", header)
		}
	}
}
