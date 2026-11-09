package api

import (
	"net/http"
	"strings"
	"time"

	"github.com/labstack/echo/v4"
	"github.com/owldayhouse/odh-internal-api/pkg/handlers/api/request"
	"github.com/owldayhouse/odh-internal-api/pkg/leadrules"
	"github.com/owldayhouse/odh-internal-api/pkg/models"
)

// ListDeals returns the money won on a lead.
func (s *Server) ListDeals(c echo.Context) error {
	lead, errResponse := s.loadLead(c, false)
	if errResponse != nil {
		return errResponse
	}
	rows, err := s.DealStore.ListByLead(lead.ID)
	if err != nil {
		return s.serverError(c, err)
	}
	return c.JSON(http.StatusOK, map[string]interface{}{"data": rows})
}

type dealBody struct {
	Service string  `json:"service" validate:"required,max=64"`
	Amount  float64 `json:"amount" validate:"gte=0"`
	WonAt   string  `json:"won_at"`
}

// CreateDeal records a deal outside the stage change (a follow-on order, say).
func (s *Server) CreateDeal(c echo.Context) error {
	lead, errResponse := s.loadLead(c, true)
	if errResponse != nil {
		return errResponse
	}

	var body dealBody
	if err := c.Bind(&body); err != nil {
		return badRequest(c, "ข้อมูลที่ส่งมาไม่ถูกต้อง")
	}
	if err := c.Validate(&body); err != nil {
		return unprocessable(c, err)
	}
	if lead.DoNotPitch {
		return forbidden(c, leadrules.ErrDoNotPitch.Error())
	}

	wonAt := time.Now().In(leadrules.Bangkok)
	if parsed, err := parseDate(body.WonAt); err != nil {
		return err
	} else if parsed != nil {
		wonAt = *parsed
	}

	row := &models.Deal{
		LeadID:    lead.ID,
		Service:   strings.TrimSpace(body.Service),
		Amount:    body.Amount,
		WonAt:     wonAt,
		CreatedBy: actor(c).ID,
	}
	if err := s.DealStore.Create(row); err != nil {
		return s.serverError(c, err)
	}
	return c.JSON(http.StatusCreated, row)
}

// DeleteDeal removes a deal (admin only — it moves the KPI).
func (s *Server) DeleteDeal(c echo.Context) error {
	lead, errResponse := s.loadLead(c, true)
	if errResponse != nil {
		return errResponse
	}
	if !actor(c).IsAdmin() {
		return forbidden(c, "ลบดีลได้เฉพาะแอดมิน")
	}
	dealID, err := request.UintParam(c, "deal_id")
	if err != nil {
		return badRequest(c, "รหัสดีลไม่ถูกต้อง")
	}

	row, err := s.DealStore.Find(dealID)
	if err != nil {
		if isNotFound(err) {
			return notFound(c, "ไม่พบดีลนี้")
		}
		return s.serverError(c, err)
	}
	if row.LeadID != lead.ID {
		return notFound(c, "ไม่พบดีลนี้")
	}

	if err := s.DealStore.Delete(row.ID); err != nil {
		return s.serverError(c, err)
	}
	return c.JSON(http.StatusOK, map[string]string{"status": "deleted"})
}
