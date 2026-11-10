package api

import (
	"net/http"
	"strings"
	"time"

	"github.com/labstack/echo/v4"

	"github.com/owldayhouse/odh-internal-api/pkg/leadrules"
	"github.com/owldayhouse/odh-internal-api/pkg/models"
)

// maxDeclineBatch bounds one bulk move.
const maxDeclineBatch = 200

type declineLeadsBody struct {
	IDs    []uint `json:"ids" validate:"required,min=1"`
	Reason string `json:"reason" validate:"omitempty,max=512"`
}

type declineSkip struct {
	ID     uint   `json:"id"`
	Reason string `json:"reason"`
}

// DeclineLeads moves the chosen leads to "ไม่รับงาน" in one go — the clean-up
// after filtering the list (projects too big, locked to an incumbent, not our
// service). Each lead gets a timeline note with the reason. The usual rules
// hold per lead: a sales account only moves the leads it owns; the others
// are reported back, not failed as a whole.
func (s *Server) DeclineLeads(c echo.Context) error {
	var body declineLeadsBody
	if err := c.Bind(&body); err != nil {
		return badRequest(c, "ข้อมูลที่ส่งมาไม่ถูกต้อง")
	}
	if err := c.Validate(&body); err != nil {
		return unprocessable(c, err)
	}
	if len(body.IDs) > maxDeclineBatch {
		return badRequest(c, "ย้ายได้ครั้งละไม่เกิน 200 ราย")
	}

	me := actor(c)
	reason := strings.TrimSpace(body.Reason)
	note := "ย้ายไป ไม่รับงาน"
	if reason != "" {
		note += ": " + reason
	}

	updated := 0
	skipped := []declineSkip{}
	seen := map[uint]bool{}
	for _, id := range body.IDs {
		if seen[id] {
			continue
		}
		seen[id] = true

		lead, err := s.LeadStore.Find(id)
		if err != nil {
			if isNotFound(err) {
				skipped = append(skipped, declineSkip{id, "ไม่พบลูกค้ารายนี้"})
				continue
			}
			return s.serverError(c, err)
		}
		if !leadrules.CanEditLead(me, lead.OwnerUserID) {
			skipped = append(skipped, declineSkip{id, leadrules.ErrNotLeadOwner.Error()})
			continue
		}
		if lead.Stage == models.StageWon {
			skipped = append(skipped, declineSkip{id, "ปิดการขายแล้ว ย้ายไม่รับงานไม่ได้"})
			continue
		}
		if lead.Stage == models.StageDeclined {
			continue
		}

		lead.Stage = models.StageDeclined
		lead.LostReason = reason
		if err := s.LeadStore.Update(lead); err != nil {
			return s.serverError(c, err)
		}
		if err := s.ActivityStore.Create(&models.Activity{
			LeadID:     lead.ID,
			UserID:     me.ID,
			Type:       models.ActivityNote,
			HappenedAt: time.Now().In(leadrules.Bangkok),
			Summary:    truncateRunes(note, 1000),
		}); err != nil {
			return s.serverError(c, err)
		}
		updated++
	}

	return c.JSON(http.StatusOK, map[string]interface{}{
		"updated": updated,
		"skipped": skipped,
	})
}
