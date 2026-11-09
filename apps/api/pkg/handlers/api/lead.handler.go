package api

import (
	"net/http"
	"strings"
	"time"

	"github.com/labstack/echo/v4"
	"github.com/lib/pq"
	"github.com/owldayhouse/odh-internal-api/pkg/handlers/api/request"
	"github.com/owldayhouse/odh-internal-api/pkg/leadrules"
	"github.com/owldayhouse/odh-internal-api/pkg/models"
)

// leadCutoff reads the sales_existing cut-off from settings and parses it as
// the last moment a sales person may self-register an existing customer.
func (s *Server) leadCutoff() (time.Time, error) {
	row, err := s.SettingStore.Get(models.SettingSalesExistingCutoff)
	if err != nil {
		if isNotFound(err) {
			// No row means the window is closed: only an admin may do it.
			return time.Time{}, nil
		}
		return time.Time{}, err
	}
	return leadrules.ParseCutoff(row.Value)
}

// parseDate reads a "YYYY-MM-DD" (or RFC3339) string in Asia/Bangkok.
func parseDate(value string) (*time.Time, error) {
	trimmed := strings.TrimSpace(value)
	if trimmed == "" {
		return nil, nil
	}
	for _, layout := range []string{"2006-01-02", time.RFC3339} {
		if parsed, err := time.ParseInLocation(layout, trimmed, leadrules.Bangkok); err == nil {
			return &parsed, nil
		}
	}
	return nil, echo.NewHTTPError(http.StatusBadRequest, "รูปแบบวันที่ไม่ถูกต้อง (ใช้ YYYY-MM-DD)")
}

// validInterests filters the request's interests down to the known tags.
func validInterests(values []string) pq.StringArray {
	allowed := map[string]bool{}
	for _, v := range models.Interests() {
		allowed[v] = true
	}
	out := make(pq.StringArray, 0, len(values))
	seen := map[string]bool{}
	for _, v := range values {
		if allowed[v] && !seen[v] {
			out = append(out, v)
			seen[v] = true
		}
	}
	return out
}

// duplicateBody is the 409 payload that answers "whose is it, and since when".
func duplicateBody(existing *models.Lead) map[string]interface{} {
	owner := ""
	if existing.Owner != nil {
		owner = existing.Owner.Name
	}
	registrar := ""
	if existing.Registrar != nil {
		registrar = existing.Registrar.Name
	}
	return map[string]interface{}{
		"error": "ลูกค้ารายนี้มีอยู่ในระบบแล้ว",
		"duplicate": map[string]interface{}{
			"id":            existing.ID,
			"name":          existing.Name,
			"owner_type":    existing.OwnerType,
			"owner_user_id": existing.OwnerUserID,
			"owner_name":    owner,
			"registered_by": registrar,
			"registered_at": existing.RegisteredAt,
			"stage":         existing.Stage,
			"do_not_pitch":  existing.DoNotPitch,
		},
	}
}

// ListLeads returns the shared customer list. Every signed-in account sees
// every lead — that is the point of one shared list — and the owner badge says
// whose it is. `mine=1` narrows it to the caller's own leads.
func (s *Server) ListLeads(c echo.Context) error {
	query := models.ListLeadQuery{
		PaginationQuery: request.GetPaginationQuery(c),
		OwnerUserID:     request.QueryUint(c, "owner_user_id"),
		OwnerType:       c.QueryParam("owner_type"),
		Stage:           c.QueryParam("stage"),
		Industry:        c.QueryParam("industry"),
		Source:          c.QueryParam("source"),
		Search:          strings.TrimSpace(c.QueryParam("search")),
		DueToday:        request.QueryBool(c, "due_today"),
		Sort:            c.QueryParam("sort"),
		Today:           startOfToday(),
	}
	if request.QueryBool(c, "do_not_pitch") {
		flag := true
		query.DoNotPitch = &flag
	}
	if request.QueryBool(c, "mine") {
		id := actor(c).ID
		query.OwnerUserID = &id
	}

	leads, pagination, err := s.LeadStore.List(query)
	if err != nil {
		return s.serverError(c, err)
	}
	return c.JSON(http.StatusOK, listResponse(leads, pagination))
}

// CheckLeadName backs the live duplicate check on the "เพิ่มลูกค้า" form.
func (s *Server) CheckLeadName(c echo.Context) error {
	name := strings.TrimSpace(c.QueryParam("name"))
	taxID := leadrules.NormalizeTaxID(c.QueryParam("tax_id"))
	normalized := leadrules.NormalizeName(name)

	response := map[string]interface{}{
		"normalized_name": normalized,
		"duplicate":       nil,
		"similar":         []*models.SimilarLead{},
	}

	if normalized == "" && taxID == "" {
		return c.JSON(http.StatusOK, response)
	}

	if normalized != "" {
		existing, err := s.LeadStore.FindByNormalizedName(normalized)
		if err == nil {
			response["duplicate"] = duplicateBody(existing)["duplicate"]
			return c.JSON(http.StatusOK, response)
		} else if !isNotFound(err) {
			return s.serverError(c, err)
		}
	}

	if taxID != "" {
		existing, err := s.LeadStore.FindByTaxID(taxID)
		if err == nil {
			response["duplicate"] = duplicateBody(existing)["duplicate"]
			response["matched_on"] = "tax_id"
			return c.JSON(http.StatusOK, response)
		} else if !isNotFound(err) {
			return s.serverError(c, err)
		}
	}

	if normalized != "" {
		similar, err := s.LeadStore.FindSimilar(normalized, s.Config.Leads.SimilarityThreshold, 5)
		if err != nil {
			return s.serverError(c, err)
		}
		response["similar"] = similar
	}
	return c.JSON(http.StatusOK, response)
}

type createLeadBody struct {
	Name           string   `json:"name" validate:"required,max=255"`
	TaxID          string   `json:"tax_id" validate:"omitempty,max=20"`
	Website        string   `json:"website" validate:"omitempty,max=255"`
	Industry       string   `json:"industry" validate:"required,oneof=education property_auto healthcare other"`
	Source         string   `json:"source" validate:"required,oneof=trade_fair egp ad_library social_listening agency referral website linkedin sales_existing"`
	SourceDetail   string   `json:"source_detail" validate:"omitempty,max=512"`
	UTMSource      string   `json:"utm_source" validate:"omitempty,max=128"`
	UTMCampaign    string   `json:"utm_campaign" validate:"omitempty,max=128"`
	OwnerType      string   `json:"owner_type" validate:"omitempty,oneof=company sales_existing"`
	OwnerUserID    *uint    `json:"owner_user_id"`
	Stage          string   `json:"stage" validate:"omitempty,oneof=new contacted meeting proposal won lost nurture"`
	Interests      []string `json:"interests"`
	EstimatedValue float64  `json:"estimated_value" validate:"omitempty,gte=0"`
	NextAction     string   `json:"next_action" validate:"omitempty,max=512"`
	NextActionDate string   `json:"next_action_date"`
	Notes          string   `json:"notes"`

	DoNotPitch       bool   `json:"do_not_pitch"`
	DoNotPitchReason string `json:"do_not_pitch_reason" validate:"omitempty,max=512"`

	// ConfirmSimilar lets the user push past the "a similar name exists"
	// warning. An exact duplicate can never be confirmed past.
	ConfirmSimilar bool `json:"confirm_similar"`

	// Contact is an optional first contact person, so the add form is one step.
	Contact *struct {
		Name     string `json:"name" validate:"required,max=128"`
		Position string `json:"position" validate:"omitempty,max=128"`
		Phone    string `json:"phone" validate:"omitempty,max=32"`
		LineID   string `json:"line_id" validate:"omitempty,max=64"`
		Email    string `json:"email" validate:"omitempty,email,max=128"`
		Note     string `json:"note" validate:"omitempty,max=512"`
	} `json:"contact"`
}

// CreateLead registers a customer. Whoever registers first owns it: an exact
// duplicate (same normalized name, or same tax ID) is refused outright and the
// response says whose it is; a merely similar name is a warning the caller can
// confirm past.
func (s *Server) CreateLead(c echo.Context) error {
	var body createLeadBody
	if err := c.Bind(&body); err != nil {
		return badRequest(c, "ข้อมูลที่ส่งมาไม่ถูกต้อง")
	}
	if err := c.Validate(&body); err != nil {
		return unprocessable(c, err)
	}

	normalized := leadrules.NormalizeName(body.Name)
	if normalized == "" {
		return badRequest(c, "ชื่อบริษัทต้องมีตัวอักษรอย่างน้อยหนึ่งตัว (นอกจากคำว่า บริษัท/จำกัด)")
	}

	// 1. Exact duplicate by name.
	if existing, err := s.LeadStore.FindByNormalizedName(normalized); err == nil {
		return conflict(c, duplicateBody(existing))
	} else if !isNotFound(err) {
		return s.serverError(c, err)
	}

	// 2. Exact duplicate by tax ID.
	var taxID *string
	if digits := leadrules.NormalizeTaxID(body.TaxID); digits != "" {
		if existing, err := s.LeadStore.FindByTaxID(digits); err == nil {
			payload := duplicateBody(existing)
			payload["error"] = "เลขผู้เสียภาษีนี้มีอยู่ในระบบแล้ว"
			payload["matched_on"] = "tax_id"
			return conflict(c, payload)
		} else if !isNotFound(err) {
			return s.serverError(c, err)
		}
		taxID = &digits
	}

	// 3. Similar names are a warning, not a wall.
	if !body.ConfirmSimilar {
		similar, err := s.LeadStore.FindSimilar(normalized, s.Config.Leads.SimilarityThreshold, 5)
		if err != nil {
			return s.serverError(c, err)
		}
		if len(similar) > 0 {
			return conflict(c, map[string]interface{}{
				"error":           "มีลูกค้าชื่อคล้ายกันในระบบ ตรวจสอบก่อนว่าเป็นรายเดียวกันหรือไม่",
				"similar":         similar,
				"needs_confirm":   true,
				"confirm_field":   "confirm_similar",
				"normalized_name": normalized,
			})
		}
	}

	// 4. Ownership.
	cutoff, err := s.leadCutoff()
	if err != nil {
		return s.serverError(c, err)
	}
	owner, err := leadrules.ResolveOwnerOnCreate(
		actor(c), body.OwnerType, body.OwnerUserID, time.Now().In(leadrules.Bangkok), cutoff,
	)
	if err != nil {
		return s.ruleError(c, err)
	}

	nextActionDate, err := parseDate(body.NextActionDate)
	if err != nil {
		return err
	}

	stage := body.Stage
	if stage == "" {
		stage = models.StageNew
	}
	if err := leadrules.ValidateStageChange(body.DoNotPitch, stage); err != nil {
		return s.ruleError(c, err)
	}

	me := actor(c)
	lead := &models.Lead{
		Name:             strings.TrimSpace(body.Name),
		NormalizedName:   normalized,
		TaxID:            taxID,
		Website:          strings.TrimSpace(body.Website),
		Industry:         body.Industry,
		Source:           body.Source,
		SourceDetail:     strings.TrimSpace(body.SourceDetail),
		UTMSource:        strings.TrimSpace(body.UTMSource),
		UTMCampaign:      strings.TrimSpace(body.UTMCampaign),
		OwnerType:        owner.OwnerType,
		OwnerUserID:      owner.OwnerUserID,
		RegisteredBy:     me.ID,
		RegisteredAt:     time.Now().In(leadrules.Bangkok),
		Stage:            stage,
		Interests:        validInterests(body.Interests),
		EstimatedValue:   body.EstimatedValue,
		NextAction:       strings.TrimSpace(body.NextAction),
		NextActionDate:   nextActionDate,
		Notes:            strings.TrimSpace(body.Notes),
		DoNotPitch:       body.DoNotPitch,
		DoNotPitchReason: strings.TrimSpace(body.DoNotPitchReason),
	}

	if err := s.LeadStore.Create(lead); err != nil {
		// The unique index on normalized_name is the real guard: it also
		// settles the race between two sales people typing the same name.
		if existing, findErr := s.LeadStore.FindByNormalizedName(normalized); findErr == nil {
			return conflict(c, duplicateBody(existing))
		}
		return s.serverError(c, err)
	}

	// The first assignment is part of the audit trail too.
	if err := s.OwnershipLogStore.Create(&models.OwnershipLog{
		LeadID:        lead.ID,
		ChangedBy:     me.ID,
		ToOwnerType:   lead.OwnerType,
		ToOwnerUserID: lead.OwnerUserID,
		Note:          "ลงทะเบียนลูกค้าใหม่",
	}); err != nil {
		s.Log.WithError(err).Error("failed to write the ownership log for a new lead")
	}

	if body.Contact != nil && strings.TrimSpace(body.Contact.Name) != "" {
		contact := &models.Contact{
			LeadID:   lead.ID,
			Name:     strings.TrimSpace(body.Contact.Name),
			Position: strings.TrimSpace(body.Contact.Position),
			Phone:    strings.TrimSpace(body.Contact.Phone),
			LineID:   strings.TrimSpace(body.Contact.LineID),
			Email:    strings.TrimSpace(body.Contact.Email),
			Note:     strings.TrimSpace(body.Contact.Note),
		}
		if err := s.ContactStore.Create(contact); err != nil {
			s.Log.WithError(err).Error("failed to create the lead's first contact")
		}
	}

	created, err := s.LeadStore.FindWithRelations(lead.ID)
	if err != nil {
		return s.serverError(c, err)
	}
	return c.JSON(http.StatusCreated, created)
}

// GetLead returns one lead with its contacts, owner and registrar.
func (s *Server) GetLead(c echo.Context) error {
	id, err := request.UintParam(c, "id")
	if err != nil {
		return badRequest(c, "รหัสลูกค้าไม่ถูกต้อง")
	}

	lead, err := s.LeadStore.FindWithRelations(id)
	if err != nil {
		if isNotFound(err) {
			return notFound(c, "ไม่พบลูกค้ารายนี้")
		}
		return s.serverError(c, err)
	}

	me := actor(c)
	return c.JSON(http.StatusOK, map[string]interface{}{
		"lead":     lead,
		"can_edit": leadrules.CanEditLead(me, lead.OwnerUserID),
	})
}

// updateLeadBody deliberately has no owner fields: ownership can only change
// through POST /api/leads/:id/assign, which is admin-only and always logged.
type updateLeadBody struct {
	Name             *string   `json:"name" validate:"omitempty,max=255"`
	TaxID            *string   `json:"tax_id" validate:"omitempty,max=20"`
	Website          *string   `json:"website" validate:"omitempty,max=255"`
	Industry         *string   `json:"industry" validate:"omitempty,oneof=education property_auto healthcare other"`
	Source           *string   `json:"source" validate:"omitempty,oneof=trade_fair egp ad_library social_listening agency referral website linkedin sales_existing"`
	SourceDetail     *string   `json:"source_detail" validate:"omitempty,max=512"`
	UTMSource        *string   `json:"utm_source" validate:"omitempty,max=128"`
	UTMCampaign      *string   `json:"utm_campaign" validate:"omitempty,max=128"`
	Interests        *[]string `json:"interests"`
	EstimatedValue   *float64  `json:"estimated_value" validate:"omitempty,gte=0"`
	NextAction       *string   `json:"next_action" validate:"omitempty,max=512"`
	NextActionDate   *string   `json:"next_action_date"`
	Notes            *string   `json:"notes"`
	DoNotPitch       *bool     `json:"do_not_pitch"`
	DoNotPitchReason *string   `json:"do_not_pitch_reason" validate:"omitempty,max=512"`
	ConfirmSimilar   bool      `json:"confirm_similar"`
}

// UpdateLead edits a lead. A sales account may only edit the leads it owns.
func (s *Server) UpdateLead(c echo.Context) error {
	id, err := request.UintParam(c, "id")
	if err != nil {
		return badRequest(c, "รหัสลูกค้าไม่ถูกต้อง")
	}

	var body updateLeadBody
	if err := c.Bind(&body); err != nil {
		return badRequest(c, "ข้อมูลที่ส่งมาไม่ถูกต้อง")
	}
	if err := c.Validate(&body); err != nil {
		return unprocessable(c, err)
	}

	lead, err := s.LeadStore.Find(id)
	if err != nil {
		if isNotFound(err) {
			return notFound(c, "ไม่พบลูกค้ารายนี้")
		}
		return s.serverError(c, err)
	}
	if !leadrules.CanEditLead(actor(c), lead.OwnerUserID) {
		return forbidden(c, leadrules.ErrNotLeadOwner.Error())
	}

	// Renaming re-runs the duplicate check against everyone else.
	if body.Name != nil && strings.TrimSpace(*body.Name) != lead.Name {
		normalized := leadrules.NormalizeName(*body.Name)
		if normalized == "" {
			return badRequest(c, "ชื่อบริษัทต้องมีตัวอักษรอย่างน้อยหนึ่งตัว")
		}
		if existing, findErr := s.LeadStore.FindByNormalizedName(normalized); findErr == nil && existing.ID != lead.ID {
			return conflict(c, duplicateBody(existing))
		} else if findErr != nil && !isNotFound(findErr) {
			return s.serverError(c, findErr)
		}
		lead.Name = strings.TrimSpace(*body.Name)
		lead.NormalizedName = normalized
	}

	if body.TaxID != nil {
		digits := leadrules.NormalizeTaxID(*body.TaxID)
		if digits == "" {
			lead.TaxID = nil
		} else {
			if existing, findErr := s.LeadStore.FindByTaxID(digits); findErr == nil && existing.ID != lead.ID {
				payload := duplicateBody(existing)
				payload["error"] = "เลขผู้เสียภาษีนี้มีอยู่ในระบบแล้ว"
				return conflict(c, payload)
			} else if findErr != nil && !isNotFound(findErr) {
				return s.serverError(c, findErr)
			}
			lead.TaxID = &digits
		}
	}

	assignString(&lead.Website, body.Website)
	assignString(&lead.Industry, body.Industry)
	assignString(&lead.Source, body.Source)
	assignString(&lead.SourceDetail, body.SourceDetail)
	assignString(&lead.UTMSource, body.UTMSource)
	assignString(&lead.UTMCampaign, body.UTMCampaign)
	assignString(&lead.NextAction, body.NextAction)
	assignString(&lead.Notes, body.Notes)
	assignString(&lead.DoNotPitchReason, body.DoNotPitchReason)

	if body.Interests != nil {
		lead.Interests = validInterests(*body.Interests)
	}
	if body.EstimatedValue != nil {
		lead.EstimatedValue = *body.EstimatedValue
	}
	if body.NextActionDate != nil {
		parsed, parseErr := parseDate(*body.NextActionDate)
		if parseErr != nil {
			return parseErr
		}
		lead.NextActionDate = parsed
	}
	if body.DoNotPitch != nil {
		lead.DoNotPitch = *body.DoNotPitch
		// Flagging a lead that already sits in a direct-sale stage would make
		// the warning meaningless, so it has to be stepped back first.
		if lead.DoNotPitch {
			if err := leadrules.ValidateStageChange(true, lead.Stage); err != nil {
				return forbidden(c, "ลูกค้ารายนี้อยู่ขั้น "+lead.Stage+" อยู่แล้ว ต้องย้ายขั้นก่อนจึงจะติดสถานะห้ามเสนอขายตรงได้")
			}
		}
	}

	if err := s.LeadStore.Update(lead); err != nil {
		return s.serverError(c, err)
	}

	updated, err := s.LeadStore.FindWithRelations(lead.ID)
	if err != nil {
		return s.serverError(c, err)
	}
	return c.JSON(http.StatusOK, updated)
}

type changeStageBody struct {
	Stage      string `json:"stage" validate:"required,oneof=new contacted meeting proposal won lost nurture"`
	LostReason string `json:"lost_reason" validate:"omitempty,max=512"`
	// Deal is required when moving to `won`.
	Deal *struct {
		Service string  `json:"service" validate:"required,max=64"`
		Amount  float64 `json:"amount" validate:"gte=0"`
		WonAt   string  `json:"won_at"`
	} `json:"deal"`
}

// ChangeLeadStage moves a lead along the pipeline. A do_not_pitch lead can
// never reach `proposal` or `won`; moving to `won` records the deal.
func (s *Server) ChangeLeadStage(c echo.Context) error {
	id, err := request.UintParam(c, "id")
	if err != nil {
		return badRequest(c, "รหัสลูกค้าไม่ถูกต้อง")
	}

	var body changeStageBody
	if err := c.Bind(&body); err != nil {
		return badRequest(c, "ข้อมูลที่ส่งมาไม่ถูกต้อง")
	}
	if err := c.Validate(&body); err != nil {
		return unprocessable(c, err)
	}

	lead, err := s.LeadStore.Find(id)
	if err != nil {
		if isNotFound(err) {
			return notFound(c, "ไม่พบลูกค้ารายนี้")
		}
		return s.serverError(c, err)
	}

	me := actor(c)
	if !leadrules.CanEditLead(me, lead.OwnerUserID) {
		return forbidden(c, leadrules.ErrNotLeadOwner.Error())
	}
	if err := leadrules.ValidateStageChange(lead.DoNotPitch, body.Stage); err != nil {
		return s.ruleError(c, err)
	}

	if body.Stage == models.StageWon {
		if body.Deal == nil {
			return badRequest(c, "ย้ายไปขั้นปิดการขายต้องกรอกบริการและยอดเงินของดีลด้วย")
		}
		wonAt := time.Now().In(leadrules.Bangkok)
		if parsed, parseErr := parseDate(body.Deal.WonAt); parseErr != nil {
			return parseErr
		} else if parsed != nil {
			wonAt = *parsed
		}
		if err := s.DealStore.Create(&models.Deal{
			LeadID:    lead.ID,
			Service:   strings.TrimSpace(body.Deal.Service),
			Amount:    body.Deal.Amount,
			WonAt:     wonAt,
			CreatedBy: me.ID,
		}); err != nil {
			return s.serverError(c, err)
		}
	}

	lead.Stage = body.Stage
	if body.Stage == models.StageLost {
		lead.LostReason = strings.TrimSpace(body.LostReason)
	}
	if err := s.LeadStore.Update(lead); err != nil {
		return s.serverError(c, err)
	}

	updated, err := s.LeadStore.FindWithRelations(lead.ID)
	if err != nil {
		return s.serverError(c, err)
	}
	return c.JSON(http.StatusOK, updated)
}

type assignLeadBody struct {
	OwnerType   string `json:"owner_type" validate:"required,oneof=company sales_existing"`
	OwnerUserID *uint  `json:"owner_user_id"`
	Note        string `json:"note" validate:"omitempty,max=512"`
}

// AssignLead changes a lead's owner. Admin only — the route carries IsAdmin —
// and every change is written to the ownership log.
func (s *Server) AssignLead(c echo.Context) error {
	id, err := request.UintParam(c, "id")
	if err != nil {
		return badRequest(c, "รหัสลูกค้าไม่ถูกต้อง")
	}

	var body assignLeadBody
	if err := c.Bind(&body); err != nil {
		return badRequest(c, "ข้อมูลที่ส่งมาไม่ถูกต้อง")
	}
	if err := c.Validate(&body); err != nil {
		return unprocessable(c, err)
	}

	me := actor(c)
	if !leadrules.CanChangeOwner(me) {
		return forbidden(c, leadrules.ErrOwnerChangeForbidden.Error())
	}

	lead, err := s.LeadStore.Find(id)
	if err != nil {
		if isNotFound(err) {
			return notFound(c, "ไม่พบลูกค้ารายนี้")
		}
		return s.serverError(c, err)
	}

	if body.OwnerType == models.OwnerTypeSalesExisting && body.OwnerUserID == nil {
		return badRequest(c, "ลูกค้าเดิมของเซลส์ต้องระบุว่าเป็นของเซลส์คนไหน")
	}
	if body.OwnerUserID != nil {
		owner, err := s.UserStore.Find(*body.OwnerUserID)
		if err != nil {
			if isNotFound(err) {
				return badRequest(c, "ไม่พบเซลส์ที่จะมอบหมายให้")
			}
			return s.serverError(c, err)
		}
		if owner.Status != models.StatusActive {
			return badRequest(c, "บัญชีเซลส์รายนี้ถูกปิดการใช้งาน")
		}
	}

	fromType, fromUser := lead.OwnerType, lead.OwnerUserID
	unchanged := fromType == body.OwnerType && samePtr(fromUser, body.OwnerUserID)
	if unchanged {
		return c.JSON(http.StatusOK, lead)
	}

	lead.OwnerType = body.OwnerType
	lead.OwnerUserID = body.OwnerUserID
	if err := s.LeadStore.Update(lead); err != nil {
		return s.serverError(c, err)
	}

	if err := s.OwnershipLogStore.Create(&models.OwnershipLog{
		LeadID:          lead.ID,
		ChangedBy:       me.ID,
		FromOwnerType:   fromType,
		ToOwnerType:     body.OwnerType,
		FromOwnerUserID: fromUser,
		ToOwnerUserID:   body.OwnerUserID,
		Note:            strings.TrimSpace(body.Note),
	}); err != nil {
		return s.serverError(c, err)
	}

	updated, err := s.LeadStore.FindWithRelations(lead.ID)
	if err != nil {
		return s.serverError(c, err)
	}
	return c.JSON(http.StatusOK, updated)
}

// GetToday is the "วันนี้" screen: what is due, what is coming, and the
// meetings on the calendar. A sales account sees its own; an admin sees all,
// or one person's with ?user_id=.
func (s *Server) GetToday(c echo.Context) error {
	me := actor(c)
	scope := &me.ID
	if me.IsAdmin() {
		scope = request.QueryUint(c, "user_id")
	}

	today := startOfToday()
	result, err := s.LeadStore.Today(models.TodayQuery{UserID: scope, Today: today, AheadDays: 7})
	if err != nil {
		return s.serverError(c, err)
	}

	meetings, err := s.ActivityStore.UpcomingMeetings(scope, today, today.AddDate(0, 0, 8))
	if err != nil {
		return s.serverError(c, err)
	}
	result.Meetings = meetings

	return c.JSON(http.StatusOK, result)
}

// GetStageCounts backs the pipeline board header.
func (s *Server) GetStageCounts(c echo.Context) error {
	me := actor(c)
	scope := request.QueryUint(c, "user_id")
	if request.QueryBool(c, "mine") {
		scope = &me.ID
	}

	counts, err := s.KPIStore.StageCounts(scope)
	if err != nil {
		return s.serverError(c, err)
	}
	return c.JSON(http.StatusOK, map[string]interface{}{"stages": models.Stages(), "counts": counts})
}

// ListLeadOwnershipLogs returns one lead's ownership history.
func (s *Server) ListLeadOwnershipLogs(c echo.Context) error {
	id, err := request.UintParam(c, "id")
	if err != nil {
		return badRequest(c, "รหัสลูกค้าไม่ถูกต้อง")
	}
	rows, err := s.OwnershipLogStore.ListByLead(id)
	if err != nil {
		return s.serverError(c, err)
	}
	return c.JSON(http.StatusOK, map[string]interface{}{"data": rows})
}

// ListRecentOwnershipLogs is the admin screen's ownership history (admin only).
func (s *Server) ListRecentOwnershipLogs(c echo.Context) error {
	rows, err := s.OwnershipLogStore.ListRecent(request.QueryInt(c, "limit", 100))
	if err != nil {
		return s.serverError(c, err)
	}
	return c.JSON(http.StatusOK, map[string]interface{}{"data": rows})
}

// startOfToday is midnight today in Asia/Bangkok.
func startOfToday() time.Time {
	now := time.Now().In(leadrules.Bangkok)
	return time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, leadrules.Bangkok)
}

func assignString(target *string, value *string) {
	if value != nil {
		*target = strings.TrimSpace(*value)
	}
}

func samePtr(a, b *uint) bool {
	if a == nil || b == nil {
		return a == nil && b == nil
	}
	return *a == *b
}
