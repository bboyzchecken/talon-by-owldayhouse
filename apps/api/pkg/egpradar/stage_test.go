package egpradar

import (
	"strings"
	"testing"
	"time"
)

// The statuses in the first real export (1,000 rows, budget year 2570).
func TestStageOfTheRealStatuses(t *testing.T) {
	cases := []struct {
		status string
		winner bool
		want   string
	}{
		{"หนังสือเชิญชวน/ประกาศเชิญชวน", false, StageOpen},
		{"จัดทำ TOR", false, StageUpcoming},
		{"รายงานขอซื้อขอจ้าง", false, StageUpcoming},
		{"อนุมัติสั่งซื้อสั่งจ้างและประกาศผู้ชนะการเสนอราคา", true, StageAwarded},
		{"จัดทำสัญญา/บริหารสัญญา", true, StageAwarded},
		{"ยกเลิกโครงการ", false, StageCancelled},
		// A row with no status but a winner date is still decided.
		{"", true, StageAwarded},
		{"", false, StageUnknown},
	}
	for _, tc := range cases {
		if got := StageOf(tc.status, tc.winner); got != tc.want {
			t.Errorf("StageOf(%q, %v) = %q, want %q", tc.status, tc.winner, got, tc.want)
		}
	}
}

func TestAwardedProjectsAreHistoryNotOpportunities(t *testing.T) {
	today := day(2026, time.November, 10)
	in := input("โรงเรียนสตรีวัดมหาพฤฒาราม", "จ้างค่าบำรุงระบบสารสนเทศและบัตรนักเรียน โดยวิธีเฉพาะเจาะจง", 152_100, nil)
	in.ProjectStatus, in.WinnerAnnounced = "จัดทำสัญญา/บริหารสัญญา", true

	r := Evaluate(in, Defaults(), today)
	if r.Passed || !hasExclusion(r, "awarded") {
		t.Fatalf("an awarded project must not pass: %+v", r.Exclusions)
	}
	if hasFlag(r, FlagNoDeadline) {
		t.Error("a closing date is irrelevant once a winner is announced")
	}
}

func TestAnOpenTenderFromTheRealExportPasses(t *testing.T) {
	today := day(2026, time.November, 10)
	in := input("มหาวิทยาลัยธรรมศาสตร์ ศูนย์รังสิต",
		"ประกวดราคาจ้างทำระบบสารสนเทศอัจฉริยะ TU GPT ระยะ 2 จำนวน 1 ระบบ ด้วยวิธีประกวดราคาอิเล็กทรอนิกส์ (e-bidding)", 0, nil)
	in.ProjectStatus = "หนังสือเชิญชวน/ประกาศเชิญชวน"

	r := Evaluate(in, Defaults(), today)
	if !r.Passed || r.Stage != StageOpen {
		t.Fatalf("passed=%v stage=%s exclusions=%+v", r.Passed, r.Stage, r.Exclusions)
	}
	if !hasFlag(r, FlagNoDeadline) {
		t.Error("an open tender with no closing date should ask for one")
	}
}

func TestTheEarliestStageScoresHigherAndIsLabelled(t *testing.T) {
	today := day(2026, time.November, 10)
	open := input("มหาวิทยาลัยเชียงใหม่", "จ้างพัฒนาเว็บไซต์", 400_000, nil)
	open.ProjectStatus = "หนังสือเชิญชวน/ประกาศเชิญชวน"
	upcoming := open
	upcoming.ProjectStatus = "จัดทำ TOR"

	ro := Evaluate(open, Defaults(), today)
	ru := Evaluate(upcoming, Defaults(), today)
	if !ru.Passed || !hasFlag(ru, FlagUpcoming) {
		t.Fatalf("an upcoming project passes with a ระยะเตรียมการ label: %+v", ru)
	}
	if ru.Score <= ro.Score {
		t.Errorf("upcoming %d should outscore open %d: there is time to be known first", ru.Score, ro.Score)
	}
}

func TestBusHireForASeminarIsExcluded(t *testing.T) {
	// A false positive from the real export: it matched "สัมมนา".
	r := Evaluate(input("โรงเรียนบัวใหญ่", "จ้างเหมาบริการรถโดยสารไม่ประจำทางไปกลับ เพื่อเข้าร่วมอบรมโครงการประชุมสัมมนาบุคลากร", 30_000, nil),
		Defaults(), day(2026, time.November, 10))
	if r.Passed || !hasExclusion(r, "exclude_keyword") {
		t.Fatalf("bus hire must be excluded: %+v", r.Exclusions)
	}
}

// The header and a few rows exactly as the real "Export .CSV" file has them:
// a title line, a blank line of commas, then the columns.
const realExport = "\ufeffข้อมูลโครงการจัดซื้อจัดจ้าง ประจำปีงบประมาณ พ.ศ. 2570\n" +
	",,,,,,,,,\n" +
	"ลำดับ,หน่วยงาน,จังหวัด,เลขที่โครงการ,ชื่อโครงการ,วันที่ประกาศเชิญชวน,วงเงินงบประมาณ(บาท),ราคากลาง(บาท),วันที่ประกาศผู้ชนะ,สถานะโครงการ\n" +
	`1,โรงเรียนสตรีวัดมหาพฤฒาราม,กรุงเทพมหานคร,69119000101,"จ้างค่าบำรุงระบบสารสนเทศและบัตรนักเรียน โดยวิธีเฉพาะเจาะจง",,"152,100.00","152,100.00",10/11/2569,จัดทำสัญญา/บริหารสัญญา` + "\n" +
	`2,มหาวิทยาลัยธรรมศาสตร์ ศูนย์รังสิต,ปทุมธานี,69119000102,"ประกวดราคาจ้างทำระบบสารสนเทศอัจฉริยะ TU GPT ระยะ 2 จำนวน 1 ระบบ ด้วยวิธีประกวดราคาอิเล็กทรอนิกส์ (e-bidding)",10/11/2569,"4,500,000.00","4,480,000.00",,หนังสือเชิญชวน/ประกาศเชิญชวน` + "\n"

func TestParseCSVReadsTheRealExportLayout(t *testing.T) {
	rows, problems, err := ParseCSV(strings.NewReader(realExport))
	if err != nil || len(problems) != 0 || len(rows) != 2 {
		t.Fatalf("rows=%d problems=%+v err=%v", len(rows), problems, err)
	}
	contract, tender := rows[0], rows[1]

	if contract.WinnerAt == nil || contract.WinnerAt.Format("2006-01-02") != "2026-11-10" {
		t.Errorf("WinnerAt = %v", contract.WinnerAt)
	}
	if contract.Province != "กรุงเทพมหานคร" || contract.ReferencePrice != 152_100 {
		t.Errorf("contract row = %+v", contract)
	}
	if tender.ProjectID != "69119000102" || tender.Method != MethodEBidding || tender.WinnerAt != nil {
		t.Errorf("tender row = %+v", tender)
	}
	if tender.AnnouncedAt == nil || tender.Budget != 4_500_000 || tender.ReferencePrice != 4_480_000 {
		t.Errorf("tender dates/money = %+v", tender)
	}
}
