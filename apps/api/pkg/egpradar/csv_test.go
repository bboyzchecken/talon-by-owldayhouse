package egpradar

import (
	"strings"
	"testing"
	"time"

	"golang.org/x/text/encoding/charmap"
)

// The columns of e-GP's results table, as on the user's screenshot.
const sampleCSV = "\ufeffลำดับ,หน่วยงาน,หน่วยจัดซื้อ,ชื่อโครงการ,วงเงินงบประมาณ (บาท),สถานะโครงการ\n" +
	`1,ธนาคารอิสลามแห่งประเทศไทย,ฝ่ายจัดซื้อจัดจ้าง ธนาคารอิสลามแห่งประเทศไทย,"ประกวดราคาจ้างเช่าใช้สิทธิ์ซอฟต์แวร์ระบบบริหารจัดการฐานข้อมูล เพื่อรองรับบริการ Bulk Payment ด้วยวิธีประกวดราคาอิเล็กทรอนิกส์ (e-bidding) (เลขที่โครงการ : 69109061081)","2,000,000.00",หนังสือเชิญชวน/ประกาศเชิญชวน` + "\n" +
	`2,มหาวิทยาลัยเชียงใหม่,กองคลัง,"จ้างพัฒนาเว็บไซต์ โดยวิธีเฉพาะเจาะจง (เลขที่โครงการ : 69119000001)","480,000.00",ลงนามสัญญา` + "\n" +
	`3,มหาวิทยาลัยเชียงใหม่,กองคลัง,"จ้างทำของไม่มีเลข","10,000.00",-` + "\n" +
	",,,,,\n"

func TestParseCSVReadsTheResultsTableColumns(t *testing.T) {
	rows, problems, err := ParseCSV(strings.NewReader(sampleCSV))
	if err != nil {
		t.Fatal(err)
	}
	if len(rows) != 2 {
		t.Fatalf("rows = %d, want 2: %+v", len(rows), rows)
	}
	if len(problems) != 1 || problems[0].Reason != "ไม่มีเลขที่โครงการ" {
		t.Errorf("problems = %+v, want the row with no project number", problems)
	}

	bank := rows[0]
	if bank.ProjectID != "69109061081" || bank.Budget != 2_000_000 || bank.Method != MethodEBidding {
		t.Errorf("bank row = %+v", bank)
	}
	if bank.ProcurementUnit != "ฝ่ายจัดซื้อจัดจ้าง ธนาคารอิสลามแห่งประเทศไทย" {
		t.Errorf("unit = %q", bank.ProcurementUnit)
	}
	if rows[1].Method != MethodSpecific || rows[1].Budget != 480_000 {
		t.Errorf("second row = %+v", rows[1])
	}
}

func TestParseCSVAcceptsWindows874(t *testing.T) {
	encoded, err := charmap.Windows874.NewEncoder().String(strings.TrimPrefix(sampleCSV, "\ufeff"))
	if err != nil {
		t.Fatal(err)
	}
	rows, _, err := ParseCSV(strings.NewReader(encoded))
	if err != nil {
		t.Fatal(err)
	}
	if len(rows) != 2 || rows[0].Agency != "ธนาคารอิสลามแห่งประเทศไทย" {
		t.Fatalf("TIS-620 file not decoded: %+v", rows)
	}
}

func TestParseCSVFindsTheHeaderBelowATitleLine(t *testing.T) {
	withTitle := "รายงานผลการค้นหาโครงการ\n\n" + strings.TrimPrefix(sampleCSV, "\ufeff")
	rows, _, err := ParseCSV(strings.NewReader(withTitle))
	if err != nil || len(rows) != 2 {
		t.Fatalf("rows=%d err=%v", len(rows), err)
	}
}

func TestParseCSVRejectsAFileWithoutTheColumns(t *testing.T) {
	if _, _, err := ParseCSV(strings.NewReader("a,b,c\n1,2,3\n")); err == nil {
		t.Fatal("a file without หน่วยงาน / ชื่อโครงการ must be rejected")
	}
}

func TestParseCSVUsesExtraColumnsWhenPresent(t *testing.T) {
	file := "เลขที่โครงการ,หน่วยงาน,ชื่อโครงการ,วิธีการจัดหา,จังหวัด,วันที่ประกาศ,วันที่ยื่นข้อเสนอ,วงเงินงบประมาณ\n" +
		`69119000002,โรงพยาบาลนครพิงค์,"จ้างผลิตวิดีโอประชาสัมพันธ์",เฉพาะเจาะจง,เชียงใหม่,10/11/2569,25 พ.ย. 2569,"150,000"` + "\n"
	rows, problems, err := ParseCSV(strings.NewReader(file))
	if err != nil || len(problems) != 0 || len(rows) != 1 {
		t.Fatalf("rows=%+v problems=%+v err=%v", rows, problems, err)
	}
	r := rows[0]
	if r.ProjectID != "69119000002" || r.Method != MethodSpecific || r.Province != "เชียงใหม่" {
		t.Errorf("row = %+v", r)
	}
	if r.AnnouncedAt == nil || r.AnnouncedAt.Year() != 2026 || r.AnnouncedAt.Month() != time.November || r.AnnouncedAt.Day() != 10 {
		t.Errorf("AnnouncedAt = %v", r.AnnouncedAt)
	}
	if r.DeadlineAt == nil || r.DeadlineAt.Day() != 25 || r.DeadlineAt.Year() != 2026 {
		t.Errorf("DeadlineAt = %v", r.DeadlineAt)
	}
}

func TestParseThaiDate(t *testing.T) {
	cases := map[string]string{
		"10/11/2569":       "2026-11-10",
		"10/11/2569 14:30": "2026-11-10",
		"1 ม.ค. 2570":      "2027-01-01",
		"31 ธันวาคม 2569":  "2026-12-31",
		"2026-11-10":       "2026-11-10",
	}
	for in, want := range cases {
		got := ParseThaiDate(in)
		if got == nil || got.Format("2006-01-02") != want {
			t.Errorf("ParseThaiDate(%q) = %v, want %s", in, got, want)
		}
	}
	for _, bad := range []string{"", "-", "ไม่ระบุ", "40/13/2569"} {
		if ParseThaiDate(bad) != nil {
			t.Errorf("ParseThaiDate(%q) should be nil", bad)
		}
	}
}
