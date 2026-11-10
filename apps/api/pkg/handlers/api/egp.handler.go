package api

import (
	"encoding/json"
	"fmt"
	"net/http"
	"sort"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/labstack/echo/v4"
	"github.com/lib/pq"
	"github.com/owldayhouse/odh-internal-api/pkg/egpradar"
	"github.com/owldayhouse/odh-internal-api/pkg/handlers/api/request"
	"github.com/owldayhouse/odh-internal-api/pkg/leadrules"
	"github.com/owldayhouse/odh-internal-api/pkg/models"
)

// e-GP Radar views (the tabs on the Radar screen).
const (
	egpViewInbox    = "inbox"
	egpViewFlagged  = "flagged"
	egpViewExcluded = "excluded"
	egpViewClosed   = "closed"
	egpViewSent     = "sent"
	egpViewSkipped  = "skipped"
)

// registerEgpRoutes wires e-GP Radar, the second internal tool. Admin only:
// it is the company sourcing leads, not a sales screen.
func (s *Server) registerEgpRoutes(api *echo.Group) {
	egp := api.Group("/egp", s.IsAdmin())
	egp.GET("/announcements", s.ListEgpAnnouncements)
	egp.POST("/import", s.ImportEgpCSV)
	egp.PATCH("/announcements/:id", s.UpdateEgpAnnouncement)
	egp.POST("/announcements/:id/send", s.SendEgpAnnouncement)
	egp.POST("/announcements/:id/skip", s.SkipEgpAnnouncement)
	egp.POST("/announcements/:id/restore", s.RestoreEgpAnnouncement)
	egp.GET("/settings", s.GetEgpSettings)
	egp.PUT("/settings", s.UpdateEgpSettings)
}

// egpSettings reads the stored Radar settings, or the defaults.
func (s *Server) egpSettings() (egpradar.Settings, error) {
	raw, err := s.EgpStore.LoadSettings()
	if err != nil {
		return egpradar.Settings{}, err
	}
	if raw == "" {
		return egpradar.Defaults(), nil
	}
	settings := egpradar.Defaults()
	if err := json.Unmarshal([]byte(raw), &settings); err != nil {
		return egpradar.Defaults(), nil
	}
	return settings.Normalize(), nil
}

func egpInput(a *models.EgpAnnouncement) egpradar.Input {
	return egpradar.Input{
		Agency:          a.Agency,
		ProcurementUnit: a.ProcurementUnit,
		Title:           a.Title,
		Budget:          a.Budget,
		Province:        a.Province,
		Hire:            a.Hire,
		DeadlineAt:      a.DeadlineAt,
		ProjectStatus:   a.ProjectStatus,
		WinnerAnnounced: a.WinnerAnnouncedAt != nil,
	}
}

// egpItem is one announcement with its verdict under the current settings.
type egpItem struct {
	*models.EgpAnnouncement
	MethodLabel string          `json:"method_label"`
	Result      egpradar.Result `json:"result"`
}

// ListEgpAnnouncements returns one tab of the Radar plus the count of every
// tab. Inbox is sorted by score, then by closing date.
func (s *Server) ListEgpAnnouncements(c echo.Context) error {
	view := c.QueryParam("view")
	if view == "" {
		view = egpViewInbox
	}

	settings, err := s.egpSettings()
	if err != nil {
		return s.serverError(c, err)
	}
	rows, err := s.EgpStore.List("", 0)
	if err != nil {
		return s.serverError(c, err)
	}

	today := startOfToday()
	counts := map[string]int{egpViewInbox: 0, egpViewFlagged: 0, egpViewExcluded: 0, egpViewClosed: 0, egpViewSent: 0, egpViewSkipped: 0}
	items := make([]egpItem, 0, len(rows))
	for _, row := range rows {
		result := egpradar.Evaluate(egpInput(row), settings, today)
		tab := egpTab(row.Decision, result, settings)
		counts[tab]++
		if tab == view {
			items = append(items, egpItem{EgpAnnouncement: row, MethodLabel: egpradar.MethodLabel(row.Method), Result: result})
		}
	}

	if view == egpViewInbox || view == egpViewFlagged {
		sort.SliceStable(items, func(i, j int) bool {
			if items[i].Result.Score != items[j].Result.Score {
				return items[i].Result.Score > items[j].Result.Score
			}
			return earlier(items[i].DeadlineAt, items[j].DeadlineAt)
		})
	}

	return c.JSON(http.StatusOK, map[string]interface{}{"view": view, "counts": counts, "data": items})
}

// egpTab decides which tab an announcement belongs in.
func egpTab(decision string, r egpradar.Result, s egpradar.Settings) string {
	switch {
	case decision == models.EgpDecisionSent:
		return egpViewSent
	case decision == models.EgpDecisionSkipped:
		return egpViewSkipped
	// Awarded and cancelled projects get their own tab: they are most of any
	// real export and would bury the reasons that matter for tuning keywords.
	case r.Stage == egpradar.StageAwarded || r.Stage == egpradar.StageCancelled:
		return egpViewClosed
	case !r.Passed:
		return egpViewExcluded
	case r.Flagged && s.HideFlaggedByDefault:
		return egpViewFlagged
	default:
		return egpViewInbox
	}
}

func earlier(a, b *time.Time) bool {
	switch {
	case a == nil:
		return false
	case b == nil:
		return true
	default:
		return a.Before(*b)
	}
}

// ImportEgpCSV takes the file from e-GP's own "Export .CSV" button. A person
// downloads it after searching e-GP; nothing here signs in to e-GP.
func (s *Server) ImportEgpCSV(c echo.Context) error {
	header, err := c.FormFile("file")
	if err != nil {
		return badRequest(c, "แนบไฟล์ CSV จาก e-GP มาด้วย (ช่อง file)")
	}
	if header.Size > 10*1024*1024 {
		return badRequest(c, "ไฟล์ใหญ่เกิน 10 MB")
	}
	file, err := header.Open()
	if err != nil {
		return badRequest(c, "เปิดไฟล์ไม่ได้")
	}
	defer func() { _ = file.Close() }()

	parsed, problems, err := egpradar.ParseCSV(file)
	if err != nil {
		return badRequest(c, err.Error())
	}
	if len(parsed) == 0 {
		return badRequest(c, "ไม่พบโครงการที่ใช้ได้ในไฟล์")
	}

	me := actor(c)
	rows := make([]*models.EgpAnnouncement, 0, len(parsed))
	for _, p := range parsed {
		rows = append(rows, &models.EgpAnnouncement{
			ProjectID:         p.ProjectID,
			Agency:            p.Agency,
			ProcurementUnit:   p.ProcurementUnit,
			Title:             p.Title,
			Method:            p.Method,
			Hire:              p.Hire,
			Budget:            p.Budget,
			ProjectStatus:     p.ProjectStatus,
			Province:          p.Province,
			ReferencePrice:    p.ReferencePrice,
			WinnerAnnouncedAt: p.WinnerAt,
			AnnouncedAt:       p.AnnouncedAt,
			DeadlineAt:        p.DeadlineAt,
			ImportedBy:        me.ID,
		})
	}

	result, err := s.EgpStore.Upsert(rows)
	if err != nil {
		return s.serverError(c, err)
	}
	return c.JSON(http.StatusOK, map[string]interface{}{
		"created":  result.Created,
		"updated":  result.Updated,
		"problems": problems,
		// e-GP exports only the first 1,000 rows of a search.
		"maybe_truncated": len(parsed)+len(problems) >= egpradar.ExportLimit,
	})
}

func (s *Server) loadEgp(c echo.Context) (*models.EgpAnnouncement, error) {
	id, err := request.UintParam(c, "id")
	if err != nil {
		return nil, badRequest(c, "รหัสประกาศไม่ถูกต้อง")
	}
	row, err := s.EgpStore.Find(id)
	if err != nil {
		if isNotFound(err) {
			return nil, notFound(c, "ไม่พบประกาศนี้")
		}
		return nil, s.serverError(c, err)
	}
	return row, nil
}

type updateEgpBody struct {
	// DeadlineAt "YYYY-MM-DD", or "" to clear. e-GP's export may not carry the
	// closing date, so it can be filled in from the announcement page.
	DeadlineAt *string `json:"deadline_at"`
}

// UpdateEgpAnnouncement sets the closing date by hand.
func (s *Server) UpdateEgpAnnouncement(c echo.Context) error {
	row, errResponse := s.loadEgp(c)
	if errResponse != nil {
		return errResponse
	}
	var body updateEgpBody
	if err := c.Bind(&body); err != nil {
		return badRequest(c, "ข้อมูลที่ส่งมาไม่ถูกต้อง")
	}
	if body.DeadlineAt != nil {
		parsed, err := parseDate(*body.DeadlineAt)
		if err != nil {
			return err
		}
		row.DeadlineAt = parsed
	}
	if err := s.EgpStore.Update(row); err != nil {
		return s.serverError(c, err)
	}
	return c.JSON(http.StatusOK, row)
}

func (s *Server) setEgpDecision(c echo.Context, decision string) error {
	row, errResponse := s.loadEgp(c)
	if errResponse != nil {
		return errResponse
	}
	if row.Decision == models.EgpDecisionSent {
		return conflict(c, errorBody("ประกาศนี้ส่งเข้า Lead Tracker ไปแล้ว"))
	}
	me := actor(c)
	now := time.Now()
	row.Decision = decision
	if decision == models.EgpDecisionNew {
		row.DecidedBy, row.DecidedAt = nil, nil
	} else {
		row.DecidedBy, row.DecidedAt = &me.ID, &now
	}
	if err := s.EgpStore.Update(row); err != nil {
		return s.serverError(c, err)
	}
	return c.JSON(http.StatusOK, row)
}

// SkipEgpAnnouncement moves an announcement to the skipped tab.
func (s *Server) SkipEgpAnnouncement(c echo.Context) error {
	return s.setEgpDecision(c, models.EgpDecisionSkipped)
}

// RestoreEgpAnnouncement brings a skipped announcement back.
func (s *Server) RestoreEgpAnnouncement(c echo.Context) error {
	return s.setEgpDecision(c, models.EgpDecisionNew)
}

type sendEgpBody struct {
	// OwnerUserID is the sales person to hand it to; defaults to the setting,
	// then to the admin sending it.
	OwnerUserID *uint `json:"owner_user_id"`
	// LeadID attaches it to a chosen existing lead (after a similar-name hit).
	LeadID *uint `json:"lead_id"`
	// ConfirmSimilar creates a new lead even though a similar name exists.
	ConfirmSimilar bool `json:"confirm_similar"`
}

// SendEgpAnnouncement turns an announcement into Lead Tracker work.
//
//   - The agency is the lead (a company-sourced lead, so it counts towards the
//     assigned sales person's main KPI); the project goes into the timeline.
//   - An agency already in the Lead Tracker gets a timeline note and, if
//     sooner, a new follow-up date — its ownership is never touched.
//   - A similar name stops with 409 and the candidates, like the add-lead form.
func (s *Server) SendEgpAnnouncement(c echo.Context) error {
	row, errResponse := s.loadEgp(c)
	if errResponse != nil {
		return errResponse
	}
	if row.Decision == models.EgpDecisionSent {
		return conflict(c, map[string]interface{}{"error": "ประกาศนี้ส่งไปแล้ว", "lead_id": row.LeadID})
	}

	var body sendEgpBody
	if err := c.Bind(&body); err != nil {
		return badRequest(c, "ข้อมูลที่ส่งมาไม่ถูกต้อง")
	}

	settings, err := s.egpSettings()
	if err != nil {
		return s.serverError(c, err)
	}
	result := egpradar.Evaluate(egpInput(row), settings, startOfToday())
	me := actor(c)

	assignee := body.OwnerUserID
	if assignee == nil {
		assignee = settings.DefaultAssigneeID
	}
	if assignee == nil {
		assignee = &me.ID
	}
	owner, err := s.UserStore.Find(*assignee)
	if err != nil || owner.Status != models.StatusActive {
		return badRequest(c, "ไม่พบบัญชีที่จะมอบหมาย หรือบัญชีถูกปิดอยู่")
	}

	detail := egpDetail(row)
	nextAction := truncateRunes("อ่าน TOR / เตรียมยื่น e-GP "+row.ProjectID, 500)
	nextActionDate := egpFollowUpDate(row.DeadlineAt, settings.LeadTimeDays)

	// 1. An existing lead: chosen explicitly, or the same agency by name.
	var lead *models.Lead
	if body.LeadID != nil {
		lead, err = s.LeadStore.Find(*body.LeadID)
		if err != nil {
			if isNotFound(err) {
				return badRequest(c, "ไม่พบลูกค้าที่เลือก")
			}
			return s.serverError(c, err)
		}
	} else {
		normalized := leadrules.NormalizeName(row.Agency)
		if existing, findErr := s.LeadStore.FindByNormalizedName(normalized); findErr == nil {
			lead = existing
		} else if !isNotFound(findErr) {
			return s.serverError(c, findErr)
		} else if !body.ConfirmSimilar {
			similar, simErr := s.LeadStore.FindSimilar(normalized, s.Config.Leads.SimilarityThreshold, 5)
			if simErr != nil {
				return s.serverError(c, simErr)
			}
			if len(similar) > 0 {
				return conflict(c, map[string]interface{}{
					"error":         "มีลูกค้าชื่อคล้ายหน่วยงานนี้ เลือกว่าจะแนบกับรายเดิม หรือสร้างใหม่",
					"similar":       similar,
					"needs_confirm": true,
				})
			}
		}
	}

	action := "attached"
	if lead != nil {
		if lead.DoNotPitch {
			return forbidden(c, "ลูกค้ารายนี้ติดสถานะห้ามเสนอขายตรง")
		}
		// Bring the follow-up forward if this project closes sooner; never
		// push an earlier follow-up back.
		if lead.NextActionDate == nil || nextActionDate.Before(*lead.NextActionDate) {
			lead.NextAction = nextAction
			lead.NextActionDate = &nextActionDate
		}
		for _, interest := range result.Interests {
			if !containsString(lead.Interests, interest) {
				lead.Interests = append(lead.Interests, interest)
			}
		}
		if err := s.LeadStore.Update(lead); err != nil {
			return s.serverError(c, err)
		}
	} else {
		action = "created"
		lead = &models.Lead{
			Name:           row.Agency,
			NormalizedName: leadrules.NormalizeName(row.Agency),
			Industry:       result.Industry,
			Source:         models.SourceEGP,
			SourceDetail:   truncateRunes(detail, 512),
			OwnerType:      models.OwnerTypeCompany,
			OwnerUserID:    &owner.ID,
			RegisteredBy:   me.ID,
			RegisteredAt:   time.Now().In(leadrules.Bangkok),
			Stage:          models.StageNew,
			Interests:      pq.StringArray(result.Interests),
			EstimatedValue: row.Budget,
			NextAction:     nextAction,
			NextActionDate: &nextActionDate,
		}
		if err := s.LeadStore.Create(lead); err != nil {
			return s.serverError(c, err)
		}
		if err := s.OwnershipLogStore.Create(&models.OwnershipLog{
			LeadID:        lead.ID,
			ChangedBy:     me.ID,
			ToOwnerType:   lead.OwnerType,
			ToOwnerUserID: lead.OwnerUserID,
			Note:          "ลงทะเบียนจาก e-GP Radar",
		}); err != nil {
			s.Log.WithError(err).Error("failed to write the ownership log for an e-GP lead")
		}
	}

	// The project itself always goes into the lead's timeline.
	if err := s.ActivityStore.Create(&models.Activity{
		LeadID:     lead.ID,
		UserID:     me.ID,
		Type:       models.ActivityNote,
		HappenedAt: time.Now().In(leadrules.Bangkok),
		Summary:    truncateRunes(detail+"\n"+row.Title, 1000),
	}); err != nil {
		return s.serverError(c, err)
	}

	now := time.Now()
	row.Decision = models.EgpDecisionSent
	row.LeadID = &lead.ID
	row.DecidedBy, row.DecidedAt = &me.ID, &now
	if err := s.EgpStore.Update(row); err != nil {
		return s.serverError(c, err)
	}

	return c.JSON(http.StatusOK, map[string]interface{}{
		"action":     action,
		"lead_id":    lead.ID,
		"owner_name": owner.Name,
	})
}

// egpDetail is the one-line summary used for source_detail and the timeline.
func egpDetail(row *models.EgpAnnouncement) string {
	parts := []string{"e-GP " + row.ProjectID}
	if label := egpradar.MethodLabel(row.Method); row.Method != "" {
		parts = append(parts, label)
	}
	if row.Budget > 0 {
		parts = append(parts, fmt.Sprintf("วงเงิน %s บาท", formatThousands(row.Budget)))
	}
	if row.DeadlineAt != nil {
		parts = append(parts, "ปิดรับ "+row.DeadlineAt.In(leadrules.Bangkok).Format("2006-01-02"))
	}
	if row.ProcurementUnit != "" && row.ProcurementUnit != row.Agency {
		parts = append(parts, row.ProcurementUnit)
	}
	return strings.Join(parts, " · ")
}

// egpFollowUpDate is leadDays before the closing date, but never in the past;
// with no closing date it is tomorrow, so the lead shows up on "วันนี้".
func egpFollowUpDate(deadline *time.Time, leadDays int) time.Time {
	today := startOfToday()
	if deadline == nil {
		return today.AddDate(0, 0, 1)
	}
	d := deadline.In(leadrules.Bangkok)
	follow := time.Date(d.Year(), d.Month(), d.Day(), 0, 0, 0, 0, leadrules.Bangkok).AddDate(0, 0, -leadDays)
	if follow.Before(today) {
		return today
	}
	return follow
}

func formatThousands(v float64) string {
	s := fmt.Sprintf("%.0f", v)
	var b strings.Builder
	for i, c := range s {
		if i > 0 && (len(s)-i)%3 == 0 {
			b.WriteByte(',')
		}
		b.WriteRune(c)
	}
	return b.String()
}

func truncateRunes(s string, n int) string {
	if utf8.RuneCountInString(s) <= n {
		return s
	}
	r := []rune(s)
	return string(r[:n-1]) + "…"
}

func containsString(values []string, v string) bool {
	for _, x := range values {
		if x == v {
			return true
		}
	}
	return false
}

// GetEgpSettings returns the Radar settings plus the choices the form needs.
func (s *Server) GetEgpSettings(c echo.Context) error {
	settings, err := s.egpSettings()
	if err != nil {
		return s.serverError(c, err)
	}
	groups := make([]map[string]string, 0, len(egpradar.AllGroups()))
	for _, g := range egpradar.AllGroups() {
		groups = append(groups, map[string]string{"key": g, "label": egpradar.GroupLabel(g)})
	}
	return c.JSON(http.StatusOK, map[string]interface{}{
		"settings": settings,
		"defaults": egpradar.Defaults(),
		"groups":   groups,
	})
}

// UpdateEgpSettings saves the Radar settings. Every stored announcement is
// re-evaluated on the next read; nothing is fetched again.
func (s *Server) UpdateEgpSettings(c echo.Context) error {
	var settings egpradar.Settings
	if err := json.NewDecoder(c.Request().Body).Decode(&settings); err != nil {
		return badRequest(c, "ข้อมูลที่ส่งมาไม่ถูกต้อง")
	}
	settings = settings.Normalize()
	if err := settings.Validate(); err != nil {
		return badRequest(c, err.Error())
	}
	if settings.DefaultAssigneeID != nil {
		owner, err := s.UserStore.Find(*settings.DefaultAssigneeID)
		if err != nil || owner.Status != models.StatusActive {
			return badRequest(c, "ไม่พบบัญชีที่จะมอบหมายเป็นค่าเริ่มต้น")
		}
	}

	data, err := json.Marshal(settings)
	if err != nil {
		return s.serverError(c, err)
	}
	if err := s.EgpStore.SaveSettings(string(data), actor(c).ID); err != nil {
		return s.serverError(c, err)
	}
	return c.JSON(http.StatusOK, map[string]interface{}{"settings": settings})
}
