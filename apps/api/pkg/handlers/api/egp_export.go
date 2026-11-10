package api

import (
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/labstack/echo/v4"

	"github.com/owldayhouse/odh-internal-api/pkg/egpradar"
	"github.com/owldayhouse/odh-internal-api/pkg/models"
)

// maxBriefProjects keeps an export small enough to analyse well in one go.
const maxBriefProjects = 20

// agencyHistoryRows is how many other projects of the same agency go with
// each shortlisted project.
const agencyHistoryRows = 10

type shortlistEgpBody struct {
	On bool `json:"on"`
}

// ShortlistEgpAnnouncement stars or un-stars a project for analysis.
func (s *Server) ShortlistEgpAnnouncement(c echo.Context) error {
	row, errResponse := s.loadEgp(c)
	if errResponse != nil {
		return errResponse
	}
	var body shortlistEgpBody
	if err := c.Bind(&body); err != nil {
		return badRequest(c, "ข้อมูลที่ส่งมาไม่ถูกต้อง")
	}
	if body.On && row.ShortlistedAt == nil {
		now := time.Now()
		row.ShortlistedAt = &now
	}
	if !body.On {
		row.ShortlistedAt = nil
	}
	if err := s.EgpStore.Update(row); err != nil {
		return s.serverError(c, err)
	}
	return c.JSON(http.StatusOK, row)
}

// ExportEgpBrief returns the shortlisted projects (or ?ids=1,2,3) as one
// Markdown document to hand to Claude: a request for a go / no-go analysis,
// the admin's notes about the company, every project with the Radar's
// reasons, and the agency's other projects from the imported data.
func (s *Server) ExportEgpBrief(c echo.Context) error {
	settings, err := s.egpSettings()
	if err != nil {
		return s.serverError(c, err)
	}

	wanted := map[uint]bool{}
	for _, part := range strings.Split(c.QueryParam("ids"), ",") {
		if id, err := strconv.ParseUint(strings.TrimSpace(part), 10, 64); err == nil {
			wanted[uint(id)] = true
		}
	}

	rows, err := s.EgpStore.List("", 0)
	if err != nil {
		return s.serverError(c, err)
	}
	today := startOfToday()
	items := []egpItem{}
	for _, row := range rows {
		picked := wanted[row.ID] || (len(wanted) == 0 && row.ShortlistedAt != nil)
		if !picked {
			continue
		}
		items = append(items, egpItem{
			EgpAnnouncement: row,
			MethodLabel:     egpradar.MethodLabel(row.Method),
			Result:          egpradar.Evaluate(egpInput(row), settings, today),
		})
	}
	if len(items) == 0 {
		return badRequest(c, "ยังไม่มีงานที่คัดไว้ กดดาวที่การ์ดงานก่อน")
	}
	if len(items) > maxBriefProjects {
		return badRequest(c, fmt.Sprintf("ส่งออกได้ครั้งละไม่เกิน %d งาน เอาดาวออกบางงานก่อน", maxBriefProjects))
	}

	history := map[uint][]*models.EgpAnnouncement{}
	for _, item := range items {
		others, err := s.EgpStore.ListByAgency(item.Agency, item.ID, agencyHistoryRows)
		if err != nil {
			return s.serverError(c, err)
		}
		history[item.ID] = others
	}

	now := time.Now()
	return c.JSON(http.StatusOK, map[string]interface{}{
		"filename": "egp-brief-" + now.Format("2006-01-02") + ".md",
		"count":    len(items),
		"markdown": buildEgpBrief(items, history, settings, now),
	})
}

// companyTemplate is shown when the admin has not described the company yet.
const companyTemplate = `(ยังไม่ได้กรอกในหน้าตั้งค่า Radar — กรอกครั้งเดียวแล้วจะติดมากับทุกไฟล์)
- ทุนจดทะเบียน:
- ผลงานที่มีสัญญาหรือหนังสือรับรองผลงาน (หน่วยงาน, ปี, มูลค่า, งานอะไร):
- ทีมที่ลงงานได้จริง (จำนวนคน, ความถนัด):
- พาร์ทเนอร์ที่ร่วมยื่นหรือรับช่วงได้:
- ขนาดงานที่รับไหว และงานที่ไม่รับ:`

const briefRequest = `ช่วยวิเคราะห์ความเป็นไปได้ที่บริษัทเราจะยื่นแต่ละโครงการด้านล่าง โดยใช้ข้อมูลบริษัทในหัวข้อถัดไป

สำหรับแต่ละโครงการ ขอ:
1. งานนี้ตรงกับสิ่งที่เราทำได้แค่ไหน และส่วนไหนต้องหาพาร์ทเนอร์
2. คุณสมบัติผู้ยื่นที่งานแบบนี้มักกำหนด (ผลงานอ้างอิง มูลค่าขั้นต่ำ ทุนจดทะเบียน บุคลากร) และเราผ่านหรือไม่ — ถ้าไม่แน่ใจ ให้บอกว่าต้องดูข้อไหนใน TOR
3. สัญญาณที่ควรระวัง เช่น สเปกที่เขียนให้เจ้าเดิม วงเงินสูงผิดปกติ เวลาเตรียมสั้น และวิธีเช็กจากเอกสาร
4. เวลาและแรงที่ต้องใช้เตรียมข้อเสนอ เทียบกับโอกาสชนะ
5. แนวทางราคาเทียบกับราคากลาง
6. สรุป: ยื่นเอง / ยื่นร่วมกับพาร์ทเนอร์ / รับช่วงต่อ / ไม่ยื่น พร้อมเหตุผล และสิ่งที่ต้องหาข้อมูลเพิ่ม

แล้วจัดอันดับว่าควรทุ่มให้งานไหนก่อน

ข้อสำคัญ:
- ข้อมูลในไฟล์นี้มาจากไฟล์ export ของ e-GP ไม่มี TOR และไม่มีชื่อผู้ชนะ อย่าเดาสิ่งที่ไม่มีในข้อมูล ให้บอกตรง ๆ ว่าต้องหาอะไรเพิ่ม
- ถ้าแนบไฟล์ TOR หรือร่างประกาศมาด้วย ให้ใช้เอกสารนั้นเป็นหลัก
- ป้าย “ระวัง” มาจากตัวกรองของเราเอง (เช่น วงเงินเกินเพดานที่ตั้งไว้) เป็นสัญญาณให้ตรวจ ไม่ได้แปลว่างานไม่โปร่งใส`

// buildEgpBrief writes the Markdown document. It is a pure function so the
// layout can be tested without a database.
func buildEgpBrief(items []egpItem, history map[uint][]*models.EgpAnnouncement, settings egpradar.Settings, now time.Time) string {
	var b strings.Builder
	line := func(format string, args ...interface{}) { fmt.Fprintf(&b, format+"\n", args...) }

	line("# งาน e-GP ที่คัดไว้ให้วิเคราะห์")
	line("")
	line("ส่งออกเมื่อ %s · %d โครงการ · จาก e-GP Radar", thaiDate(&now), len(items))
	line("")
	line("## สิ่งที่อยากให้ช่วย")
	line("")
	line("%s", briefRequest)
	line("")
	line("## ข้อมูลบริษัทเรา")
	line("")
	if settings.AnalysisContext != "" {
		line("%s", settings.AnalysisContext)
	} else {
		line("%s", companyTemplate)
	}
	line("")
	line("ขอบเขตที่ตั้งไว้ใน Radar: วงเงิน %s ถึง %s · เวลาเตรียมอย่างน้อย %d วัน", egpradar.Baht(settings.BudgetMin), egpradar.Baht(settings.BudgetMax), settings.MinPrepDays)

	for i, item := range items {
		r := item.Result
		line("")
		line("---")
		line("")
		line("## โครงการ %d: %s", i+1, cell(item.Title))
		line("")
		line("| หัวข้อ | ข้อมูล |")
		line("|---|---|")
		line("| เลขที่โครงการ | %s |", item.ProjectID)
		line("| หน่วยงาน | %s |", cell(joinNonEmpty(" · ", item.Agency, sameOr(item.ProcurementUnit, item.Agency))))
		line("| กลุ่มหน่วยงาน | %s |", r.GroupLabel)
		line("| จังหวัด | %s |", orDash(item.Province))
		line("| วิธีจัดหา | %s |", orDash(item.MethodLabel))
		line("| สถานะใน e-GP | %s (%s) |", orDash(item.ProjectStatus), r.StageLabel)
		line("| วงเงินงบประมาณ | %s |", moneyOrDash(item.Budget))
		line("| ราคากลาง | %s |", moneyOrDash(item.ReferencePrice))
		line("| วันที่ประกาศเชิญชวน | %s |", thaiDate(item.AnnouncedAt))
		line("| วันปิดรับข้อเสนอ | %s |", dateOr(item.DeadlineAt, "ยังไม่ได้กรอก (ไม่มีในไฟล์ export)"))
		if item.WinnerAnnouncedAt != nil {
			line("| ประกาศผู้ชนะ | %s |", thaiDate(item.WinnerAnnouncedAt))
		}
		line("| งานที่จ้าง (ระบบอ่านจากชื่อ) | %s |", cell(r.Subject))
		if len(r.MatchedServices) > 0 {
			line("| ตรงกับบริการ | %s (คำ: %s) |", strings.Join(r.MatchedServices, ", "), strings.Join(r.MatchedKeywords, ", "))
		}
		if r.Passed {
			line("| คะแนนจาก Radar | %d/100 |", r.Score)
		}
		if item.Decision == models.EgpDecisionSent {
			line("| สถานะในบริษัท | ส่งเข้า Lead Tracker แล้ว |")
		}

		if len(r.Flags) > 0 {
			line("")
			line("**ป้ายและข้อสังเกตจาก Radar**")
			line("")
			for _, f := range r.Flags {
				kind := "ข้อสังเกต"
				if f.Severity == egpradar.SeverityWarn {
					kind = "ระวัง"
				}
				line("- %s · %s: %s", kind, f.Label, f.Reason)
			}
		}
		if len(r.Exclusions) > 0 {
			line("")
			line("**ไม่ผ่านตัวกรองของเราเพราะ** (คัดไว้ดูเอง)")
			line("")
			for _, e := range r.Exclusions {
				line("- %s", e.Reason)
			}
		}

		others := history[item.ID]
		line("")
		line("**งานอื่นของหน่วยงานนี้ในข้อมูลที่นำเข้า**")
		line("")
		if len(others) == 0 {
			line("ไม่มีในข้อมูลที่นำเข้า (ข้อมูลมาจากไฟล์ export ที่นำเข้าเท่านั้น ไม่ใช่ประวัติทั้งหมด)")
			continue
		}
		line("| ประกาศ | ชื่อโครงการ | วงเงิน | ราคากลาง | สถานะ |")
		line("|---|---|---|---|---|")
		for _, o := range others {
			line("| %s | %s | %s | %s | %s |", thaiDate(o.AnnouncedAt), cell(o.Title), moneyOrDash(o.Budget), moneyOrDash(o.ReferencePrice), cell(orDash(o.ProjectStatus)))
		}
		line("")
		line("ข้อมูลนี้มาจากไฟล์ export ที่นำเข้าเท่านั้น ไม่ใช่ประวัติทั้งหมด และไม่มีชื่อผู้ชนะ")
	}
	return b.String()
}

var thaiShortMonths = [...]string{"ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."}

// thaiDate writes "10 พ.ย. 2569 (2026-11-10)": the Buddhist-era year e-GP
// uses, plus the ISO date so nothing is misread.
func thaiDate(t *time.Time) string {
	if t == nil {
		return "—"
	}
	return fmt.Sprintf("%d %s %d (%s)", t.Day(), thaiShortMonths[t.Month()-1], t.Year()+543, t.Format("2006-01-02"))
}

func dateOr(t *time.Time, fallback string) string {
	if t == nil {
		return fallback
	}
	return thaiDate(t)
}

func moneyOrDash(v float64) string {
	if v <= 0 {
		return "—"
	}
	return egpradar.Baht(v)
}

func orDash(s string) string {
	if strings.TrimSpace(s) == "" {
		return "—"
	}
	return s
}

func sameOr(s, other string) string {
	if s == other {
		return ""
	}
	return s
}

func joinNonEmpty(sep string, parts ...string) string {
	out := []string{}
	for _, p := range parts {
		if strings.TrimSpace(p) != "" {
			out = append(out, p)
		}
	}
	return strings.Join(out, sep)
}

// cell keeps text from breaking a Markdown table row.
func cell(s string) string {
	s = strings.ReplaceAll(s, "|", "/")
	return strings.Join(strings.Fields(s), " ")
}
