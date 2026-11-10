package api

import (
	"fmt"
	"net/http"
	"net/url"
	"strings"
	"testing"

	"github.com/owldayhouse/odh-internal-api/pkg/models"
)

// Columns as on e-GP's results table (the user's screenshot), plus one more
// project from the same university to check that a second project is
// attached to the existing lead instead of creating a duplicate.
const egpCSV = "ลำดับ,หน่วยงาน,หน่วยจัดซื้อ,ชื่อโครงการ,วงเงินงบประมาณ (บาท),สถานะโครงการ\n" +
	`1,ธนาคารอิสลามแห่งประเทศไทย,ฝ่ายจัดซื้อจัดจ้าง ธนาคารอิสลามแห่งประเทศไทย,"ประกวดราคาจ้างเช่าใช้สิทธิ์ซอฟต์แวร์ระบบบริหารจัดการฐานข้อมูล เพื่อรองรับบริการ Bulk Payment ด้วยวิธีประกวดราคาอิเล็กทรอนิกส์ (e-bidding) (เลขที่โครงการ : 69109061081)","2,000,000.00",หนังสือเชิญชวน/ประกาศเชิญชวน` + "\n" +
	`2,มหาวิทยาลัยเชียงใหม่,กองคลัง,"จ้างพัฒนาระบบลงทะเบียนและเว็บไซต์ โดยวิธีเฉพาะเจาะจง (เลขที่โครงการ : 69119000001)","480,000.00",หนังสือเชิญชวน/ประกาศเชิญชวน` + "\n" +
	`3,มหาวิทยาลัยเชียงใหม่,คณะวิจิตรศิลป์,"จ้างจัดงานนิทรรศการศิลปะ โดยวิธีเฉพาะเจาะจง (เลขที่โครงการ : 69119000002)","250,000.00",หนังสือเชิญชวน/ประกาศเชิญชวน` + "\n" +
	`4,มหาวิทยาลัยเชียงใหม่,กองคลัง,"ซื้อครุภัณฑ์คอมพิวเตอร์ (เลขที่โครงการ : 69119000003)","900,000.00",-` + "\n"

type egpList struct {
	Counts map[string]int `json:"counts"`
	Data   []struct {
		ID        uint   `json:"id"`
		ProjectID string `json:"project_id"`
		Decision  string `json:"decision"`
		Result    struct {
			Passed  bool `json:"passed"`
			Flagged bool `json:"flagged"`
			Score   int  `json:"score"`
			Flags   []struct {
				Code string `json:"code"`
			} `json:"flags"`
		} `json:"result"`
	} `json:"data"`
}

func (e *testEnv) egpView(view string) egpList {
	e.t.Helper()
	r := e.do(e.admin, http.MethodGet, "/api/egp/announcements?view="+view, nil)
	if r.Status != http.StatusOK {
		e.t.Fatalf("list %s: %d %s", view, r.Status, r.Raw)
	}
	var out egpList
	r.as(e.t, "counts", &out.Counts)
	r.as(e.t, "data", &out.Data)
	return out
}

func (e *testEnv) egpIDByProject(project string) uint {
	e.t.Helper()
	for _, view := range []string{"inbox", "flagged", "excluded", "sent", "skipped"} {
		for _, item := range e.egpView(view).Data {
			if item.ProjectID == project {
				return item.ID
			}
		}
	}
	e.t.Fatalf("project %s not found", project)
	return 0
}

func TestEgpImportIsIdempotent(t *testing.T) {
	env := newTestEnv(t)

	first := env.doMultipart(env.admin, "/api/egp/import", nil, egpCSV)
	if first.Status != http.StatusOK {
		t.Fatalf("got %d: %s", first.Status, first.Raw)
	}
	if first.Body["created"].(float64) != 4 {
		t.Fatalf("created = %v, want 4: %s", first.Body["created"], first.Raw)
	}

	again := env.doMultipart(env.admin, "/api/egp/import", nil, egpCSV)
	if again.Body["created"].(float64) != 0 || again.Body["updated"].(float64) != 4 {
		t.Fatalf("re-importing the same file must not duplicate: %s", again.Raw)
	}
}

func TestEgpViewsFollowTheSettings(t *testing.T) {
	env := newTestEnv(t)
	env.doMultipart(env.admin, "/api/egp/import", nil, egpCSV)

	// Defaults: universities in, state banks out, purchases out.
	inbox := env.egpView("inbox")
	if inbox.Counts["inbox"] != 2 {
		t.Errorf("inbox = %d, want the two university hire jobs: %+v", inbox.Counts["inbox"], inbox.Counts)
	}
	if inbox.Counts["excluded"] != 2 {
		t.Errorf("excluded = %d, want the bank and the computer purchase", inbox.Counts["excluded"])
	}

	// Watch the bank: it passes, but over 1M it is flagged and kept apart.
	settings := env.do(env.admin, http.MethodGet, "/api/egp/settings", nil)
	var s map[string]interface{}
	settings.as(t, "settings", &s)
	s["watchlist"] = []string{"ธนาคารอิสลาม"}
	saved := env.do(env.admin, http.MethodPut, "/api/egp/settings", s)
	if saved.Status != http.StatusOK {
		t.Fatalf("save settings: %d %s", saved.Status, saved.Raw)
	}

	flagged := env.egpView("flagged")
	if flagged.Counts["flagged"] != 1 || len(flagged.Data) != 1 || flagged.Data[0].ProjectID != "69109061081" {
		t.Fatalf("the bank should now sit in the flagged tab: %+v", flagged)
	}
	hasOverBudget := false
	for _, f := range flagged.Data[0].Result.Flags {
		hasOverBudget = hasOverBudget || f.Code == "over_budget"
	}
	if !hasOverBudget {
		t.Errorf("flags = %+v, want over_budget", flagged.Data[0].Result.Flags)
	}

	// Invalid settings are refused.
	s["budget_min"], s["budget_max"] = 2_000_000, 1_000_000
	if r := env.do(env.admin, http.MethodPut, "/api/egp/settings", s); r.Status != http.StatusBadRequest {
		t.Errorf("min above max: got %d, want 400", r.Status)
	}
}

func TestEgpSendCreatesALeadThenAttachesTheNextProject(t *testing.T) {
	env := newTestEnv(t)
	env.doMultipart(env.admin, "/api/egp/import", nil, egpCSV)

	website := env.egpIDByProject("69119000001")
	r := env.do(env.admin, http.MethodPost, fmt.Sprintf("/api/egp/announcements/%d/send", website), map[string]interface{}{
		"owner_user_id": env.sales1.ID,
	})
	if r.Status != http.StatusOK || r.Body["action"] != "created" {
		t.Fatalf("got %d: %s", r.Status, r.Raw)
	}
	leadID := uint(r.Body["lead_id"].(float64))

	lead := env.do(env.sales1, http.MethodGet, fmt.Sprintf("/api/leads/%d", leadID), nil)
	var l struct {
		Name         string   `json:"name"`
		Source       string   `json:"source"`
		OwnerType    string   `json:"owner_type"`
		OwnerUserID  *uint    `json:"owner_user_id"`
		Industry     string   `json:"industry"`
		Interests    []string `json:"interests"`
		NextAction   string   `json:"next_action"`
		SourceDetail string   `json:"source_detail"`
	}
	lead.as(t, "lead", &l)
	if l.Name != "มหาวิทยาลัยเชียงใหม่" || l.Source != models.SourceEGP || l.OwnerType != models.OwnerTypeCompany {
		t.Errorf("lead = %+v", l)
	}
	if l.OwnerUserID == nil || *l.OwnerUserID != env.sales1.ID {
		t.Errorf("the lead should belong to the sales person it was sent to: %+v", l.OwnerUserID)
	}
	if l.Industry != "education" || len(l.Interests) == 0 || l.Interests[0] != "system" {
		t.Errorf("industry/interests = %s %v", l.Industry, l.Interests)
	}
	if l.NextAction == "" {
		t.Error("a follow-up must be set so it shows on the sales person's วันนี้ screen")
	}
	// A lead is named after the agency: the card must still say what the
	// work is, without e-GP's method words.
	if !strings.HasPrefix(l.SourceDetail, "จ้างพัฒนาระบบลงทะเบียนและเว็บไซต์ · e-GP 69119000001") || strings.Contains(l.SourceDetail, "โดยวิธี") {
		t.Errorf("source detail = %q", l.SourceDetail)
	}
	if !strings.Contains(l.NextAction, "จ้างพัฒนาระบบลงทะเบียนและเว็บไซต์") || !strings.Contains(l.NextAction, "69119000001") {
		t.Errorf("next action = %q", l.NextAction)
	}

	// The second project from the same university joins the same lead.
	exhibition := env.egpIDByProject("69119000002")
	second := env.do(env.admin, http.MethodPost, fmt.Sprintf("/api/egp/announcements/%d/send", exhibition), map[string]interface{}{})
	if second.Status != http.StatusOK || second.Body["action"] != "attached" || uint(second.Body["lead_id"].(float64)) != leadID {
		t.Fatalf("expected the project to attach to lead %d: %d %s", leadID, second.Status, second.Raw)
	}

	timeline := env.do(env.admin, http.MethodGet, fmt.Sprintf("/api/leads/%d/activities", leadID), nil)
	var acts []struct {
		Summary string `json:"summary"`
	}
	timeline.as(t, "data", &acts)
	if len(acts) != 2 {
		t.Errorf("timeline should hold both projects, got %d", len(acts))
	}

	list := env.do(env.admin, http.MethodGet, "/api/leads", nil)
	var p struct{ Total int64 }
	list.as(t, "pagination", &p)
	if p.Total != 1 {
		t.Errorf("there must be one lead for the university, got %d", p.Total)
	}

	// Searching the Lead Tracker by the work or the e-GP number finds it.
	for _, q := range []string{"เว็บไซต์", "69119000002"} {
		found := env.do(env.admin, http.MethodGet, "/api/leads?search="+url.QueryEscape(q), nil)
		var fp struct{ Total int64 }
		found.as(t, "pagination", &fp)
		if fp.Total != 1 {
			t.Errorf("search %q found %d leads, want 1", q, fp.Total)
		}
	}

	if env.egpView("sent").Counts["sent"] != 2 {
		t.Error("both announcements should be in the sent tab")
	}
	again := env.do(env.admin, http.MethodPost, fmt.Sprintf("/api/egp/announcements/%d/send", website), map[string]interface{}{})
	if again.Status != http.StatusConflict {
		t.Errorf("sending twice: got %d, want 409", again.Status)
	}
}

func TestEgpSendStopsOnASimilarName(t *testing.T) {
	env := newTestEnv(t)
	// A lead that reads like the agency but is not the same normalized name.
	existing := env.createLead(env.sales2, newLead("มหาวิทยาลัยเชียงใหม่ วิทยาเขตแม่ริม"))
	if existing.Status != http.StatusCreated {
		t.Fatalf("got %d: %s", existing.Status, existing.Raw)
	}
	env.doMultipart(env.admin, "/api/egp/import", nil, egpCSV)
	id := env.egpIDByProject("69119000001")

	r := env.do(env.admin, http.MethodPost, fmt.Sprintf("/api/egp/announcements/%d/send", id), map[string]interface{}{})
	if r.Status != http.StatusConflict || r.Body["similar"] == nil {
		t.Fatalf("a similar name must stop with the candidates: %d %s", r.Status, r.Raw)
	}

	// Attaching to the chosen existing lead never changes its owner.
	attached := env.do(env.admin, http.MethodPost, fmt.Sprintf("/api/egp/announcements/%d/send", id), map[string]interface{}{
		"lead_id": leadID(t, existing),
	})
	if attached.Status != http.StatusOK || attached.Body["action"] != "attached" {
		t.Fatalf("got %d: %s", attached.Status, attached.Raw)
	}
	lead := env.do(env.admin, http.MethodGet, fmt.Sprintf("/api/leads/%d", leadID(t, existing)), nil)
	var l struct {
		OwnerUserID *uint `json:"owner_user_id"`
	}
	lead.as(t, "lead", &l)
	if l.OwnerUserID == nil || *l.OwnerUserID != env.sales2.ID {
		t.Errorf("attaching must not move ownership: %v", l.OwnerUserID)
	}
}

// The real export layout: mostly projects that are already awarded.
const egpRealCSV = "\ufeffข้อมูลโครงการจัดซื้อจัดจ้าง ประจำปีงบประมาณ พ.ศ. 2570\n" +
	",,,,,,,,,\n" +
	"ลำดับ,หน่วยงาน,จังหวัด,เลขที่โครงการ,ชื่อโครงการ,วันที่ประกาศเชิญชวน,วงเงินงบประมาณ(บาท),ราคากลาง(บาท),วันที่ประกาศผู้ชนะ,สถานะโครงการ\n" +
	`1,โรงเรียนสตรีวัดมหาพฤฒาราม,กรุงเทพมหานคร,69119000101,"จ้างค่าบำรุงระบบสารสนเทศและบัตรนักเรียน โดยวิธีเฉพาะเจาะจง",,"152,100.00","152,100.00",10/11/2569,จัดทำสัญญา/บริหารสัญญา` + "\n" +
	`2,มหาวิทยาลัยธรรมศาสตร์ ศูนย์รังสิต,ปทุมธานี,69119000102,"ประกวดราคาจ้างทำระบบสารสนเทศอัจฉริยะ TU GPT ระยะ 2 ด้วยวิธีประกวดราคาอิเล็กทรอนิกส์ (e-bidding)",10/11/2569,"900,000.00","890,000.00",,หนังสือเชิญชวน/ประกาศเชิญชวน` + "\n" +
	`3,มหาวิทยาลัยเชียงใหม่,เชียงใหม่,69119000103,"จ้างพัฒนาเว็บไซต์คณะ โดยวิธีเฉพาะเจาะจง",,"300,000.00","300,000.00",,จัดทำ TOR` + "\n" +
	`4,มหาวิทยาลัยเชียงใหม่,เชียงใหม่,69119000104,"จ้างจัดงานนิทรรศการ โดยวิธีเฉพาะเจาะจง",,"200,000.00","200,000.00",,ยกเลิกโครงการ` + "\n"

func TestEgpRealExportGoesToTheRightTabs(t *testing.T) {
	env := newTestEnv(t)
	r := env.doMultipart(env.admin, "/api/egp/import", nil, egpRealCSV)
	if r.Status != http.StatusOK || r.Body["created"].(float64) != 4 {
		t.Fatalf("import: %d %s", r.Status, r.Raw)
	}
	if truncated, _ := r.Body["maybe_truncated"].(bool); truncated {
		t.Error("4 rows is nowhere near e-GP's 1,000-row cut")
	}

	counts := env.egpView("inbox").Counts
	// The open tender and the TOR-stage project are opportunities; the
	// awarded and the cancelled ones are history.
	if counts["inbox"] != 2 || counts["closed"] != 2 || counts["excluded"] != 0 {
		t.Fatalf("counts = %+v, want inbox 2 / closed 2 / excluded 0", counts)
	}
}

func TestEgpSkipAndRestore(t *testing.T) {
	env := newTestEnv(t)
	env.doMultipart(env.admin, "/api/egp/import", nil, egpCSV)
	id := env.egpIDByProject("69119000002")

	if r := env.do(env.admin, http.MethodPost, fmt.Sprintf("/api/egp/announcements/%d/skip", id), nil); r.Status != http.StatusOK {
		t.Fatalf("skip: %d %s", r.Status, r.Raw)
	}
	if env.egpView("skipped").Counts["skipped"] != 1 {
		t.Error("skipped tab should hold it")
	}
	if r := env.do(env.admin, http.MethodPost, fmt.Sprintf("/api/egp/announcements/%d/restore", id), nil); r.Status != http.StatusOK {
		t.Fatalf("restore: %d %s", r.Status, r.Raw)
	}
	if env.egpView("inbox").Counts["skipped"] != 0 {
		t.Error("restore should empty the skipped tab")
	}
}

func TestEgpIsAdminOnly(t *testing.T) {
	env := newTestEnv(t)
	for _, path := range []string{"/api/egp/announcements", "/api/egp/settings"} {
		if r := env.do(env.sales1, http.MethodGet, path, nil); r.Status != http.StatusForbidden {
			t.Errorf("%s as sales: got %d, want 403", path, r.Status)
		}
	}
	if r := env.doMultipart(env.sales1, "/api/egp/import", nil, egpCSV); r.Status != http.StatusForbidden {
		t.Errorf("import as sales: got %d, want 403", r.Status)
	}
}

func TestEgpShortlistAndExportForAnalysis(t *testing.T) {
	env := newTestEnv(t)
	env.doMultipart(env.admin, "/api/egp/import", nil, egpRealCSV)
	cmu := env.egpIDByProject("69119000103")

	if r := env.do(env.admin, http.MethodGet, "/api/egp/export", nil); r.Status != http.StatusBadRequest {
		t.Fatalf("export with nothing starred: %d %s", r.Status, r.Raw)
	}

	if r := env.do(env.admin, http.MethodPost, fmt.Sprintf("/api/egp/announcements/%d/shortlist", cmu), map[string]bool{"on": true}); r.Status != http.StatusOK {
		t.Fatalf("shortlist: %d %s", r.Status, r.Raw)
	}
	// Starred projects keep their own tab and also show in the shortlist.
	list := env.egpView("shortlist")
	if list.Counts["shortlist"] != 1 || list.Counts["inbox"] != 2 || len(list.Data) != 1 || list.Data[0].ID != cmu {
		t.Fatalf("shortlist view: counts %+v, %d items", list.Counts, len(list.Data))
	}

	r := env.do(env.admin, http.MethodGet, "/api/egp/export", nil)
	if r.Status != http.StatusOK {
		t.Fatalf("export: %d %s", r.Status, r.Raw)
	}
	md, _ := r.Body["markdown"].(string)
	for _, want := range []string{
		"## สิ่งที่อยากให้ช่วย",
		"จ้างพัฒนาเว็บไซต์คณะ", // the starred project
		"69119000103", // its e-GP number
		"ระยะเตรียมการ",              // its stage
		"300,000 บาท",                // its budget
		"จ้างจัดงานนิทรรศการ",        // the same agency's other project
		"ยังไม่ได้กรอกในหน้าตั้งค่า", // the company template, until filled in
	} {
		if !strings.Contains(md, want) {
			t.Errorf("export lacks %q:\n%s", want, md)
		}
	}
	if strings.Contains(md, "TU GPT") {
		t.Error("an unstarred project was exported")
	}

	// The company notes from the settings head every export.
	settings := env.do(env.admin, http.MethodGet, "/api/egp/settings", nil)
	var s map[string]interface{}
	settings.as(t, "settings", &s)
	s["analysis_context"] = "ทุนจดทะเบียน 1 ล้านบาท"
	if r := env.do(env.admin, http.MethodPut, "/api/egp/settings", s); r.Status != http.StatusOK {
		t.Fatalf("save settings: %d %s", r.Status, r.Raw)
	}
	r = env.do(env.admin, http.MethodGet, "/api/egp/export", nil)
	if md, _ := r.Body["markdown"].(string); !strings.Contains(md, "ทุนจดทะเบียน 1 ล้านบาท") || strings.Contains(md, "ยังไม่ได้กรอกในหน้าตั้งค่า") {
		t.Errorf("company notes missing:\n%s", md)
	}

	if r := env.do(env.admin, http.MethodPost, fmt.Sprintf("/api/egp/announcements/%d/shortlist", cmu), map[string]bool{"on": false}); r.Status != http.StatusOK {
		t.Fatalf("un-shortlist: %d %s", r.Status, r.Raw)
	}
	if n := env.egpView("shortlist").Counts["shortlist"]; n != 0 {
		t.Fatalf("shortlist count after removing = %d", n)
	}
	if r := env.do(env.admin, http.MethodGet, "/api/egp/export", nil); r.Status != http.StatusBadRequest {
		t.Fatalf("export after removing: %d", r.Status)
	}
	// Sales cannot export.
	if r := env.do(env.sales1, http.MethodGet, "/api/egp/export", nil); r.Status != http.StatusForbidden {
		t.Fatalf("sales export: %d", r.Status)
	}
}
