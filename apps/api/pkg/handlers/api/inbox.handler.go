package api

import (
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/labstack/echo/v4"

	"github.com/owldayhouse/odh-internal-api/pkg/handlers/api/request"
	"github.com/owldayhouse/odh-internal-api/pkg/leadrules"
	"github.com/owldayhouse/odh-internal-api/pkg/models"
)

// The inbox is where requests from the public quote form wait for a person.
// The intake service can only add rows; everything here runs as a signed-in
// account. Every account sees the inbox (one shared queue), anyone may accept
// or discard, and only an admin may erase a request outright.

// registerInboxRoutes wires the inbox tool under its own prefix.
func (s *Server) registerInboxRoutes(api *echo.Group) {
	inbox := api.Group("/inbox")
	inbox.GET("", s.ListInbox)
	inbox.GET("/counts", s.GetInboxCounts)
	inbox.GET("/:id", s.GetInboxRequest)
	inbox.POST("/:id/accept", s.AcceptInboxRequest)
	inbox.POST("/:id/discard", s.DiscardInboxRequest)
	inbox.DELETE("/:id", s.DeleteInboxRequest, s.IsAdmin())
}

// ListInbox handles GET /api/inbox?status=new&page=1.
func (s *Server) ListInbox(c echo.Context) error {
	status := c.QueryParam("status")
	if status != "" && status != models.InboundStatusNew &&
		status != models.InboundStatusAccepted && status != models.InboundStatusDiscarded {
		return badRequest(c, "สถานะไม่ถูกต้อง")
	}
	filter := models.InboundFilter{Status: status, Kind: c.QueryParam("kind")}
	if page := request.QueryUint(c, "page"); page != nil {
		filter.Page = int(*page)
	}
	if limit := request.QueryUint(c, "limit"); limit != nil {
		filter.Limit = int(*limit)
	}

	rows, total, err := s.InboundStore.List(filter)
	if err != nil {
		return s.serverError(c, err)
	}
	counts, err := s.InboundStore.CountByStatus()
	if err != nil {
		return s.serverError(c, err)
	}
	return c.JSON(http.StatusOK, map[string]interface{}{
		"items":  rows,
		"total":  total,
		"counts": counts,
	})
}

// GetInboxCounts feeds the number on the menu. It is the whole of the
// notification in phase 1: there is no e-mail, so nothing is sent anywhere.
func (s *Server) GetInboxCounts(c echo.Context) error {
	counts, err := s.InboundStore.CountByStatus()
	if err != nil {
		return s.serverError(c, err)
	}
	return c.JSON(http.StatusOK, map[string]int64{"new": counts[models.InboundStatusNew]})
}

func (s *Server) findInbox(c echo.Context) (*models.InboundRequest, error) {
	id, err := request.UintParam(c, "id")
	if err != nil {
		return nil, badRequest(c, "รหัสคำขอไม่ถูกต้อง")
	}
	row, err := s.InboundStore.Find(id)
	if err != nil {
		if isNotFound(err) {
			return nil, notFound(c, "ไม่พบคำขอนี้")
		}
		return nil, s.serverError(c, err)
	}
	return row, nil
}

// GetInboxRequest handles GET /api/inbox/:id, with the names already in the
// Lead Tracker that look like this request's company, so the person deciding
// sees a likely duplicate before creating one.
func (s *Server) GetInboxRequest(c echo.Context) error {
	row, err := s.findInbox(c)
	if row == nil {
		return err
	}

	similar := []*models.SimilarLead{}
	var exact *models.Lead
	if name := inboxLeadName(row); name != "" {
		if normalized := leadrules.NormalizeName(name); normalized != "" {
			if found, findErr := s.LeadStore.FindByNormalizedName(normalized); findErr == nil {
				exact = found
			} else if !isNotFound(findErr) {
				return s.serverError(c, findErr)
			}
			found, findErr := s.LeadStore.FindSimilar(normalized, s.Config.Leads.SimilarityThreshold, 5)
			if findErr != nil {
				return s.serverError(c, findErr)
			}
			similar = found
		}
	}

	return c.JSON(http.StatusOK, map[string]interface{}{
		"request":       row,
		"suggested":     inboxLeadName(row),
		"exact_match":   exact,
		"similar_leads": similar,
	})
}

// inboxLeadName is the name a lead would be registered under: the company if
// the person gave one, otherwise their own name (a sole trader, often).
func inboxLeadName(row *models.InboundRequest) string {
	if name := strings.TrimSpace(row.Company); name != "" {
		return name
	}
	return strings.TrimSpace(row.ContactName)
}

type acceptInboxBody struct {
	// LeadID attaches the request to a customer already in the Lead Tracker
	// instead of registering a new one. The rest of the body is then ignored.
	LeadID *uint `json:"lead_id"`

	Name           string `json:"name" validate:"omitempty,max=255"`
	Industry       string `json:"industry" validate:"omitempty,oneof=education property_auto healthcare other"`
	OwnerUserID    *uint  `json:"owner_user_id"`
	ConfirmSimilar bool   `json:"confirm_similar"`
}

// AcceptInboxRequest handles POST /api/inbox/:id/accept. It either registers
// a new lead (source "website", the request's utm carried over, the person as
// the first contact) or adds the person and the brief to an existing lead.
// The same duplicate rules as the add-lead form apply, because this is the
// same act — registering a customer — reached from a different door.
func (s *Server) AcceptInboxRequest(c echo.Context) error {
	row, err := s.findInbox(c)
	if row == nil {
		return err
	}
	if row.Status != models.InboundStatusNew {
		return conflict(c, errorBody("คำขอนี้ถูกจัดการไปแล้ว"))
	}

	var body acceptInboxBody
	if err := c.Bind(&body); err != nil {
		return badRequest(c, "ข้อมูลที่ส่งมาไม่ถูกต้อง")
	}
	if err := c.Validate(&body); err != nil {
		return unprocessable(c, err)
	}

	me := actor(c)
	var lead *models.Lead
	if body.LeadID != nil {
		lead, err = s.attachInboxToLead(c, row, *body.LeadID, me)
	} else {
		lead, err = s.createLeadFromInbox(c, row, body, me)
	}
	if lead == nil {
		return err
	}

	now := time.Now()
	row.Status = models.InboundStatusAccepted
	row.LeadID = &lead.ID
	row.HandledBy = &me.ID
	row.HandledAt = &now
	ok, err := s.InboundStore.MarkHandled(row)
	if err != nil {
		return s.serverError(c, err)
	}
	if !ok {
		// Someone accepted or discarded it between our read and now. The lead
		// is real and stays; the request simply already has an outcome.
		return conflict(c, errorBody("คำขอนี้ถูกจัดการไปแล้วระหว่างที่คุณกด"))
	}

	updated, err := s.InboundStore.Find(row.ID)
	if err != nil {
		return s.serverError(c, err)
	}
	return c.JSON(http.StatusOK, updated)
}

func (s *Server) createLeadFromInbox(
	c echo.Context, row *models.InboundRequest, body acceptInboxBody, me leadrules.Actor,
) (*models.Lead, error) {
	name := strings.TrimSpace(body.Name)
	if name == "" {
		name = inboxLeadName(row)
	}
	normalized := leadrules.NormalizeName(name)
	if normalized == "" {
		return nil, badRequest(c, "ชื่อบริษัทต้องมีตัวอักษรอย่างน้อยหนึ่งตัว (นอกจากคำว่า บริษัท/จำกัด)")
	}

	industry := body.Industry
	if industry == "" {
		industry = row.Industry
	}
	if industry == "" {
		return nil, badRequest(c, "เลือกกลุ่มธุรกิจของลูกค้าก่อนรับเข้าระบบ")
	}

	if existing, err := s.LeadStore.FindByNormalizedName(normalized); err == nil {
		payload := duplicateBody(existing)
		payload["hint"] = "เลือก \"เพิ่มเข้าลูกค้าเดิม\" แทน"
		return nil, conflict(c, payload)
	} else if !isNotFound(err) {
		return nil, s.serverError(c, err)
	}

	if !body.ConfirmSimilar {
		similar, err := s.LeadStore.FindSimilar(normalized, s.Config.Leads.SimilarityThreshold, 5)
		if err != nil {
			return nil, s.serverError(c, err)
		}
		if len(similar) > 0 {
			return nil, conflict(c, map[string]interface{}{
				"error":           "มีลูกค้าชื่อคล้ายกันในระบบ ตรวจสอบก่อนว่าเป็นรายเดียวกันหรือไม่",
				"similar":         similar,
				"needs_confirm":   true,
				"confirm_field":   "confirm_similar",
				"normalized_name": normalized,
			})
		}
	}

	// A website enquiry is always the company's. A sales account that accepts
	// it owns it; an admin may hand it to someone or leave it unassigned.
	owner, err := leadrules.ResolveOwnerOnCreate(me, models.OwnerTypeCompany, body.OwnerUserID, time.Now(), time.Time{})
	if err != nil {
		return nil, s.ruleError(c, err)
	}

	today := time.Now().In(leadrules.Bangkok)
	lead := &models.Lead{
		Name:           name,
		NormalizedName: normalized,
		Industry:       industry,
		Source:         models.SourceWebsite,
		SourceDetail:   cutText(inboxSourceDetail(row), 512),
		UTMSource:      row.UTMSource,
		UTMCampaign:    row.UTMCampaign,
		OwnerType:      owner.OwnerType,
		OwnerUserID:    owner.OwnerUserID,
		RegisteredBy:   me.ID,
		RegisteredAt:   today,
		Stage:          models.StageNew,
		Interests:      validInterests(row.Interests),
		NextAction:     "ติดต่อกลับลูกค้าที่ส่งคำขอจากเว็บ",
		NextActionDate: &today,
		Notes:          inboxNotes(row),
	}
	if err := s.LeadStore.Create(lead); err != nil {
		if existing, findErr := s.LeadStore.FindByNormalizedName(normalized); findErr == nil {
			return nil, conflict(c, duplicateBody(existing))
		}
		return nil, s.serverError(c, err)
	}

	if err := s.OwnershipLogStore.Create(&models.OwnershipLog{
		LeadID:        lead.ID,
		ChangedBy:     me.ID,
		ToOwnerType:   lead.OwnerType,
		ToOwnerUserID: lead.OwnerUserID,
		Note:          fmt.Sprintf("รับคำขอจากเว็บ #%d เป็นลูกค้าใหม่", row.ID),
	}); err != nil {
		s.Log.WithError(err).Error("failed to write the ownership log for an accepted request")
	}

	s.addInboxContact(row, lead.ID)
	return lead, nil
}

func (s *Server) attachInboxToLead(
	c echo.Context, row *models.InboundRequest, leadID uint, me leadrules.Actor,
) (*models.Lead, error) {
	lead, err := s.LeadStore.Find(leadID)
	if err != nil {
		if isNotFound(err) {
			return nil, notFound(c, "ไม่พบลูกค้ารายนี้")
		}
		return nil, s.serverError(c, err)
	}
	if !leadrules.CanEditLead(me, lead.OwnerUserID) {
		return nil, forbidden(c, "ลูกค้ารายนี้มีเจ้าของแล้ว ให้เจ้าของหรือแอดมินเป็นคนรับคำขอนี้")
	}

	s.addInboxContact(row, lead.ID)
	if err := s.ActivityStore.Create(&models.Activity{
		LeadID:     lead.ID,
		UserID:     me.ID,
		Type:       models.ActivityNote,
		HappenedAt: row.CreatedAt,
		Summary:    cutText(fmt.Sprintf("คำขอจากเว็บ #%d\n%s", row.ID, inboxNotes(row)), 1000),
	}); err != nil {
		return nil, s.serverError(c, err)
	}
	return lead, nil
}

// addInboxContact makes the person who filled in the form a contact on the
// lead. A failure here is logged, not returned: the request is still on the
// timeline and the lead exists.
func (s *Server) addInboxContact(row *models.InboundRequest, leadID uint) {
	contact := &models.Contact{
		LeadID: leadID,
		Name:   cutText(row.ContactName, 128),
		Phone:  cutText(row.Phone, 32),
		LineID: cutText(row.LineID, 64),
		Email:  cutText(row.Email, 128),
		Note:   fmt.Sprintf("จากฟอร์มเว็บ #%d", row.ID),
	}
	if err := s.ContactStore.Create(contact); err != nil {
		s.Log.WithError(err).Error("failed to add the contact from an accepted request")
	}
}

func inboxSourceDetail(row *models.InboundRequest) string {
	detail := "ฟอร์มขอใบเสนอราคา owldayhouse.com"
	if row.LandingPath != "" {
		detail += " · " + row.LandingPath
	}
	if row.Referrer != "" {
		detail += " · จาก " + row.Referrer
	}
	return detail
}

var timelineLabels = map[string]string{
	models.TimelineASAP:     "เร็วที่สุด",
	models.TimelineOneThree: "1–3 เดือน",
	models.TimelineThreeSix: "3–6 เดือน",
	models.TimelinePlanning: "ยังวางแผนอยู่",
}

var budgetLabels = map[string]string{
	models.BudgetUnder100k:   "ต่ำกว่า 100,000",
	models.BudgetMid:         "100,000–300,000",
	models.BudgetHigh:        "300,000–1,000,000",
	models.BudgetOverMillion: "มากกว่า 1,000,000",
	models.BudgetUnsure:      "ยังไม่แน่ใจ",
}

// inboxNotes is the request written out for a person: the brief first, then
// what the customer said about timing and budget.
func inboxNotes(row *models.InboundRequest) string {
	lines := []string{}
	if brief := strings.TrimSpace(row.Brief); brief != "" {
		lines = append(lines, brief)
	}
	if label := timelineLabels[row.Timeline]; label != "" {
		lines = append(lines, "ช่วงเวลาที่อยากได้: "+label)
	}
	if label := budgetLabels[row.BudgetBand]; label != "" {
		lines = append(lines, "งบที่ลูกค้าบอก: "+label+" บาท")
	}
	if row.Company != "" && row.ContactName != "" {
		lines = append(lines, "ผู้ติดต่อ: "+row.ContactName)
	}
	return strings.Join(lines, "\n")
}

func cutText(value string, limit int) string {
	if runes := []rune(value); len(runes) > limit {
		return string(runes[:limit])
	}
	return value
}

type discardInboxBody struct {
	Reason string `json:"reason" validate:"omitempty,max=200"`
}

// DiscardInboxRequest handles POST /api/inbox/:id/discard. The row stays,
// with its reason, until the retention purge removes it.
func (s *Server) DiscardInboxRequest(c echo.Context) error {
	row, err := s.findInbox(c)
	if row == nil {
		return err
	}
	if row.Status != models.InboundStatusNew {
		return conflict(c, errorBody("คำขอนี้ถูกจัดการไปแล้ว"))
	}

	var body discardInboxBody
	if err := c.Bind(&body); err != nil {
		return badRequest(c, "ข้อมูลที่ส่งมาไม่ถูกต้อง")
	}
	if err := c.Validate(&body); err != nil {
		return unprocessable(c, err)
	}

	me := actor(c)
	now := time.Now()
	row.Status = models.InboundStatusDiscarded
	row.HandledBy = &me.ID
	row.HandledAt = &now
	row.DiscardReason = strings.TrimSpace(body.Reason)
	ok, err := s.InboundStore.MarkHandled(row)
	if err != nil {
		return s.serverError(c, err)
	}
	if !ok {
		return conflict(c, errorBody("คำขอนี้ถูกจัดการไปแล้วระหว่างที่คุณกด"))
	}

	updated, err := s.InboundStore.Find(row.ID)
	if err != nil {
		return s.serverError(c, err)
	}
	return c.JSON(http.StatusOK, updated)
}

// DeleteInboxRequest handles DELETE /api/inbox/:id. Admin only. It is how a
// person's request to erase their data is carried out before the 180 days
// are up. A lead made from the request is not touched: that is a customer
// record, erased from the Lead Tracker if it has to be.
func (s *Server) DeleteInboxRequest(c echo.Context) error {
	row, err := s.findInbox(c)
	if row == nil {
		return err
	}
	if err := s.InboundStore.Delete(row.ID); err != nil {
		return s.serverError(c, err)
	}
	s.Log.WithField("inbound_id", row.ID).WithField("by", actor(c).ID).Info("erased an inbound request")
	return c.NoContent(http.StatusNoContent)
}
