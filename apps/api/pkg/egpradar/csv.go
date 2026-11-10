package egpradar

import (
	"bytes"
	"encoding/csv"
	"errors"
	"io"
	"regexp"
	"strconv"
	"strings"
	"time"
	"unicode/utf8"

	"golang.org/x/text/encoding/charmap"
)

// Row is one project read from e-GP's CSV export.
type Row struct {
	Line            int
	ProjectID       string
	Agency          string
	ProcurementUnit string
	Title           string
	Method          string
	Hire            bool
	Budget          float64
	ProjectStatus   string
	Province        string
	ReferencePrice  float64
	AnnouncedAt     *time.Time
	DeadlineAt      *time.Time
	WinnerAt        *time.Time
}

// RowProblem is a line that could not be used, and why.
type RowProblem struct {
	Line   int    `json:"line"`
	Reason string `json:"reason"`
}

// headerAliases maps the column names e-GP uses (the same as on its results
// table) onto fields. Matching is on a squashed form of the header — no
// spaces, no "(บาท)", lower-case — so small wording changes still match.
var headerAliases = map[string]string{
	"เลขที่โครงการ":         "project_id",
	"เลขโครงการ":            "project_id",
	"projectid":             "project_id",
	"หน่วยงาน":              "agency",
	"ชื่อหน่วยงาน":          "agency",
	"หน่วยจัดซื้อ":          "unit",
	"หน่วยงานย่อย":          "unit",
	"ชื่อโครงการ":           "title",
	"โครงการ":               "title",
	"วงเงินงบประมาณ":        "budget",
	"วงเงิน":                "budget",
	"งบประมาณ":              "budget",
	"สถานะโครงการ":          "status",
	"สถานะ":                 "status",
	"วิธีการจัดหา":          "method",
	"วิธีจัดหา":             "method",
	"จังหวัด":               "province",
	"วันที่ประกาศ":          "announced",
	"วันที่ประกาศเชิญชวน":   "announced",
	"วันที่สิ้นสุด":         "deadline",
	"วันที่ยื่นข้อเสนอ":     "deadline",
	"วันสิ้นสุดการเสนอราคา": "deadline",
	"วันที่ปิดรับ":          "deadline",
	"ราคากลาง":              "reference",
	"วันที่ประกาศผู้ชนะ":    "winner",
}

var (
	parenPattern  = regexp.MustCompile(`\([^)]*\)`)
	numberPattern = regexp.MustCompile(`[^0-9.\-]`)
)

func squashHeader(h string) string {
	h = strings.TrimPrefix(h, "\ufeff")
	h = parenPattern.ReplaceAllString(h, "")
	h = strings.ToLower(strings.Join(strings.Fields(h), ""))
	return h
}

// ParseCSV reads e-GP's CSV export. It accepts UTF-8 (with or without a BOM)
// and Windows-874 (TIS-620), finds the header row by its column names, and
// reports lines it cannot use instead of failing the whole file.
func ParseCSV(r io.Reader) ([]Row, []RowProblem, error) {
	raw, err := io.ReadAll(io.LimitReader(r, 10<<20))
	if err != nil {
		return nil, nil, err
	}
	raw = bytes.TrimPrefix(raw, []byte("\xef\xbb\xbf"))
	if !utf8.Valid(raw) {
		decoded, decErr := charmap.Windows874.NewDecoder().Bytes(raw)
		if decErr != nil {
			return nil, nil, errors.New("อ่านไฟล์ไม่ได้: ไม่ใช่ UTF-8 หรือ TIS-620")
		}
		raw = decoded
	}

	reader := csv.NewReader(bytes.NewReader(raw))
	reader.FieldsPerRecord = -1
	reader.LazyQuotes = true
	reader.TrimLeadingSpace = true

	records, err := reader.ReadAll()
	if err != nil {
		return nil, nil, errors.New("อ่าน CSV ไม่ได้: " + err.Error())
	}

	// e-GP exports may start with a title line; the header is the first row
	// that names both a project and an agency.
	headerAt := -1
	columns := map[string]int{}
	for i, rec := range records {
		found := map[string]int{}
		for j, cell := range rec {
			if field, ok := headerAliases[squashHeader(cell)]; ok {
				if _, dup := found[field]; !dup {
					found[field] = j
				}
			}
		}
		if _, hasTitle := found["title"]; hasTitle {
			if _, hasAgency := found["agency"]; hasAgency {
				headerAt, columns = i, found
				break
			}
		}
		if i > 10 {
			break
		}
	}
	if headerAt < 0 {
		return nil, nil, errors.New("ไม่พบหัวตาราง ต้องมีอย่างน้อยคอลัมน์ “หน่วยงาน” และ “ชื่อโครงการ” — ใช้ไฟล์จากปุ่ม Export .CSV ของ e-GP")
	}

	at := func(rec []string, field string) string {
		j, ok := columns[field]
		if !ok || j >= len(rec) {
			return ""
		}
		return strings.TrimSpace(rec[j])
	}

	rows := make([]Row, 0, len(records)-headerAt-1)
	problems := []RowProblem{}
	for i := headerAt + 1; i < len(records); i++ {
		rec := records[i]
		line := i + 1
		if isBlank(rec) {
			continue
		}

		parsed := ParseTitle(at(rec, "title"))
		row := Row{
			Line:            line,
			ProjectID:       strings.TrimSpace(at(rec, "project_id")),
			Agency:          at(rec, "agency"),
			ProcurementUnit: at(rec, "unit"),
			Title:           parsed.Title,
			Method:          parsed.Method,
			Hire:            parsed.Hire,
			ProjectStatus:   at(rec, "status"),
			Province:        at(rec, "province"),
		}
		if row.ProjectID == "" {
			row.ProjectID = parsed.ProjectID
		}
		if m := at(rec, "method"); m != "" {
			if method := MethodOf(m); method != MethodUnknown {
				row.Method = method
			}
		}
		row.Budget = parseMoney(at(rec, "budget"))
		row.ReferencePrice = parseMoney(at(rec, "reference"))
		if row.Budget == 0 {
			row.Budget = row.ReferencePrice
		}
		row.AnnouncedAt = ParseThaiDate(at(rec, "announced"))
		row.DeadlineAt = ParseThaiDate(at(rec, "deadline"))
		row.WinnerAt = ParseThaiDate(at(rec, "winner"))

		switch {
		case row.ProjectID == "":
			problems = append(problems, RowProblem{Line: line, Reason: "ไม่มีเลขที่โครงการ"})
			continue
		case row.Agency == "" || row.Title == "":
			problems = append(problems, RowProblem{Line: line, Reason: "ไม่มีชื่อหน่วยงานหรือชื่อโครงการ"})
			continue
		}
		rows = append(rows, row)
	}
	return rows, problems, nil
}

func parseMoney(text string) float64 {
	cleaned := numberPattern.ReplaceAllString(text, "")
	if cleaned == "" {
		return 0
	}
	v, err := strconv.ParseFloat(cleaned, 64)
	if err != nil {
		return 0
	}
	return v
}

// ExportLimit is the most rows e-GP puts in one export ("ระบบ export ข้อมูล
// 1,000 รายการแรกเท่านั้น"); a file that size has probably been cut short.
const ExportLimit = 1000

func isBlank(rec []string) bool {
	for _, c := range rec {
		if strings.TrimSpace(c) != "" {
			return false
		}
	}
	return true
}

var thaiMonths = map[string]time.Month{
	"ม.ค.": time.January, "มกราคม": time.January,
	"ก.พ.": time.February, "กุมภาพันธ์": time.February,
	"มี.ค.": time.March, "มีนาคม": time.March,
	"เม.ย.": time.April, "เมษายน": time.April,
	"พ.ค.": time.May, "พฤษภาคม": time.May,
	"มิ.ย.": time.June, "มิถุนายน": time.June,
	"ก.ค.": time.July, "กรกฎาคม": time.July,
	"ส.ค.": time.August, "สิงหาคม": time.August,
	"ก.ย.": time.September, "กันยายน": time.September,
	"ต.ค.": time.October, "ตุลาคม": time.October,
	"พ.ย.": time.November, "พฤศจิกายน": time.November,
	"ธ.ค.": time.December, "ธันวาคม": time.December,
}

var (
	numericDate = regexp.MustCompile(`^(\d{1,2})/(\d{1,2})/(\d{4})`)
	isoDate     = regexp.MustCompile(`^(\d{4})-(\d{2})-(\d{2})`)
	thaiDate    = regexp.MustCompile(`^(\d{1,2})\s+(\S+)\s+(\d{4})`)
)

// ParseThaiDate reads the dates e-GP uses — "10/11/2569", "10 พ.ย. 2569",
// "10 พฤศจิกายน 2569" — and ISO dates. Buddhist-era years (over 2400) are
// converted. Returns nil for anything it cannot read.
func ParseThaiDate(value string) *time.Time {
	v := strings.TrimSpace(value)
	if v == "" || v == "-" {
		return nil
	}

	var y, d int
	var m time.Month
	switch {
	case isoDate.MatchString(v):
		p := isoDate.FindStringSubmatch(v)
		y, _ = strconv.Atoi(p[1])
		mm, _ := strconv.Atoi(p[2])
		m = time.Month(mm)
		d, _ = strconv.Atoi(p[3])
	case numericDate.MatchString(v):
		p := numericDate.FindStringSubmatch(v)
		d, _ = strconv.Atoi(p[1])
		mm, _ := strconv.Atoi(p[2])
		m = time.Month(mm)
		y, _ = strconv.Atoi(p[3])
	case thaiDate.MatchString(v):
		p := thaiDate.FindStringSubmatch(v)
		d, _ = strconv.Atoi(p[1])
		month, ok := thaiMonths[p[2]]
		if !ok {
			return nil
		}
		m = month
		y, _ = strconv.Atoi(p[3])
	default:
		return nil
	}

	if y > 2400 {
		y -= 543
	}
	if m < 1 || m > 12 || d < 1 || d > 31 || y < 2000 || y > 2100 {
		return nil
	}
	t := time.Date(y, m, d, 0, 0, 0, 0, bangkokZone())
	return &t
}

func bangkokZone() *time.Location {
	if loc, err := time.LoadLocation("Asia/Bangkok"); err == nil {
		return loc
	}
	return time.FixedZone("ICT", 7*60*60)
}
