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

// ListActivities returns a lead's timeline, newest first.
func (s *Server) ListActivities(c echo.Context) error {
	lead, errResponse := s.loadLead(c, false)
	if errResponse != nil {
		return errResponse
	}
	rows, err := s.ActivityStore.ListByLead(lead.ID)
	if err != nil {
		return s.serverError(c, err)
	}
	return c.JSON(http.StatusOK, map[string]interface{}{"data": rows})
}

type activityBody struct {
	Type       string `json:"type" validate:"required,oneof=call line meeting proposal_sent note"`
	HappenedAt string `json:"happened_at"`
	Summary    string `json:"summary" validate:"omitempty,max=1000"`
	// NextAction and NextActionDate let one form log the touch and set the
	// follow-up, which is how the "วันนี้" screen stays current.
	NextAction     *string `json:"next_action" validate:"omitempty,max=512"`
	NextActionDate *string `json:"next_action_date"`
}

// CreateActivity logs a touch on a lead. `meeting` and `proposal_sent` rows are
// what the KPI counts.
func (s *Server) CreateActivity(c echo.Context) error {
	lead, errResponse := s.loadLead(c, true)
	if errResponse != nil {
		return errResponse
	}

	var body activityBody
	if err := c.Bind(&body); err != nil {
		return badRequest(c, "ข้อมูลที่ส่งมาไม่ถูกต้อง")
	}
	if err := c.Validate(&body); err != nil {
		return unprocessable(c, err)
	}

	// A proposal to a do_not_pitch brand is exactly what the flag forbids.
	if lead.DoNotPitch && body.Type == models.ActivityProposalSent {
		return forbidden(c, leadrules.ErrDoNotPitch.Error())
	}

	happenedAt := time.Now().In(leadrules.Bangkok)
	if parsed, err := parseDateTime(body.HappenedAt); err != nil {
		return err
	} else if parsed != nil {
		happenedAt = *parsed
		// A bare date for today means "just now", not midnight: older
		// screens send only the date.
		if isDateOnly(body.HappenedAt) && sameBangkokDay(*parsed, time.Now()) {
			happenedAt = time.Now().In(leadrules.Bangkok)
		}
	}

	me := actor(c)
	row := &models.Activity{
		LeadID:     lead.ID,
		UserID:     me.ID,
		Type:       body.Type,
		HappenedAt: happenedAt,
		Summary:    strings.TrimSpace(body.Summary),
	}
	if err := s.ActivityStore.Create(row); err != nil {
		return s.serverError(c, err)
	}

	// Keep the follow-up in step with the touch that was just logged.
	changed := false
	if body.NextAction != nil {
		lead.NextAction = strings.TrimSpace(*body.NextAction)
		changed = true
	}
	if body.NextActionDate != nil {
		parsed, err := parseDate(*body.NextActionDate)
		if err != nil {
			return err
		}
		lead.NextActionDate = parsed
		changed = true
	}
	if changed {
		if err := s.LeadStore.Update(lead); err != nil {
			return s.serverError(c, err)
		}
	}

	created, err := s.ActivityStore.Find(row.ID)
	if err != nil {
		return s.serverError(c, err)
	}
	return c.JSON(http.StatusCreated, created)
}

// DeleteActivity removes a timeline entry.
func (s *Server) DeleteActivity(c echo.Context) error {
	lead, errResponse := s.loadLead(c, true)
	if errResponse != nil {
		return errResponse
	}
	activityID, err := request.UintParam(c, "activity_id")
	if err != nil {
		return badRequest(c, "รหัสกิจกรรมไม่ถูกต้อง")
	}

	row, err := s.ActivityStore.Find(activityID)
	if err != nil {
		if isNotFound(err) {
			return notFound(c, "ไม่พบกิจกรรมนี้")
		}
		return s.serverError(c, err)
	}
	if row.LeadID != lead.ID {
		return notFound(c, "ไม่พบกิจกรรมนี้")
	}

	// Only the person who logged it, or an admin, may remove it.
	me := actor(c)
	if !me.IsAdmin() && row.UserID != me.ID {
		return forbidden(c, "ลบได้เฉพาะกิจกรรมที่ตัวเองบันทึก")
	}

	if err := s.ActivityStore.Delete(row.ID); err != nil {
		return s.serverError(c, err)
	}
	return c.JSON(http.StatusOK, map[string]string{"status": "deleted"})
}

func isDateOnly(value string) bool {
	_, err := time.Parse("2006-01-02", strings.TrimSpace(value))
	return err == nil
}

func sameBangkokDay(a, b time.Time) bool {
	return a.In(leadrules.Bangkok).Format("2006-01-02") == b.In(leadrules.Bangkok).Format("2006-01-02")
}

// parseDateTime reads a date or a full timestamp in Asia/Bangkok.
func parseDateTime(value string) (*time.Time, error) {
	trimmed := strings.TrimSpace(value)
	if trimmed == "" {
		return nil, nil
	}
	layouts := []string{time.RFC3339, "2006-01-02T15:04", "2006-01-02 15:04", "2006-01-02"}
	for _, layout := range layouts {
		if parsed, err := time.ParseInLocation(layout, trimmed, leadrules.Bangkok); err == nil {
			return &parsed, nil
		}
	}
	return nil, echo.NewHTTPError(http.StatusBadRequest, "รูปแบบวันเวลาไม่ถูกต้อง")
}
