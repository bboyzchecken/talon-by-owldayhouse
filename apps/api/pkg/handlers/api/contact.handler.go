package api

import (
	"net/http"
	"strings"

	"github.com/labstack/echo/v4"
	"github.com/owldayhouse/odh-internal-api/pkg/handlers/api/request"
	"github.com/owldayhouse/odh-internal-api/pkg/leadrules"
	"github.com/owldayhouse/odh-internal-api/pkg/models"
)

// loadLead fetches the lead in the path and, when mutate is true, checks the
// caller is allowed to change it.
func (s *Server) loadLead(c echo.Context, mutate bool) (*models.Lead, error) {
	id, err := request.UintParam(c, "id")
	if err != nil {
		return nil, badRequest(c, "รหัสลูกค้าไม่ถูกต้อง")
	}
	lead, err := s.LeadStore.Find(id)
	if err != nil {
		if isNotFound(err) {
			return nil, notFound(c, "ไม่พบลูกค้ารายนี้")
		}
		return nil, s.serverError(c, err)
	}
	if mutate && !leadrules.CanEditLead(actor(c), lead.OwnerUserID) {
		return nil, forbidden(c, leadrules.ErrNotLeadOwner.Error())
	}
	return lead, nil
}

// ListContacts returns the people at a customer company. These are personal
// data, so the route sits behind the JWT middleware like everything else.
func (s *Server) ListContacts(c echo.Context) error {
	lead, errResponse := s.loadLead(c, false)
	if errResponse != nil {
		return errResponse
	}
	rows, err := s.ContactStore.ListByLead(lead.ID)
	if err != nil {
		return s.serverError(c, err)
	}
	return c.JSON(http.StatusOK, map[string]interface{}{"data": rows})
}

type contactBody struct {
	Name     string `json:"name" validate:"required,max=128"`
	Position string `json:"position" validate:"omitempty,max=128"`
	Phone    string `json:"phone" validate:"omitempty,max=32"`
	LineID   string `json:"line_id" validate:"omitempty,max=64"`
	Email    string `json:"email" validate:"omitempty,email,max=128"`
	Note     string `json:"note" validate:"omitempty,max=512"`
}

// CreateContact adds a contact person to a lead.
func (s *Server) CreateContact(c echo.Context) error {
	lead, errResponse := s.loadLead(c, true)
	if errResponse != nil {
		return errResponse
	}

	var body contactBody
	if err := c.Bind(&body); err != nil {
		return badRequest(c, "ข้อมูลที่ส่งมาไม่ถูกต้อง")
	}
	if err := c.Validate(&body); err != nil {
		return unprocessable(c, err)
	}

	row := &models.Contact{
		LeadID:   lead.ID,
		Name:     strings.TrimSpace(body.Name),
		Position: strings.TrimSpace(body.Position),
		Phone:    strings.TrimSpace(body.Phone),
		LineID:   strings.TrimSpace(body.LineID),
		Email:    strings.TrimSpace(body.Email),
		Note:     strings.TrimSpace(body.Note),
	}
	if err := s.ContactStore.Create(row); err != nil {
		return s.serverError(c, err)
	}
	return c.JSON(http.StatusCreated, row)
}

// UpdateContact edits a contact person.
func (s *Server) UpdateContact(c echo.Context) error {
	lead, errResponse := s.loadLead(c, true)
	if errResponse != nil {
		return errResponse
	}
	contactID, err := request.UintParam(c, "contact_id")
	if err != nil {
		return badRequest(c, "รหัสผู้ติดต่อไม่ถูกต้อง")
	}

	var body contactBody
	if err := c.Bind(&body); err != nil {
		return badRequest(c, "ข้อมูลที่ส่งมาไม่ถูกต้อง")
	}
	if err := c.Validate(&body); err != nil {
		return unprocessable(c, err)
	}

	row, err := s.ContactStore.Find(contactID)
	if err != nil {
		if isNotFound(err) {
			return notFound(c, "ไม่พบผู้ติดต่อรายนี้")
		}
		return s.serverError(c, err)
	}
	if row.LeadID != lead.ID {
		return notFound(c, "ไม่พบผู้ติดต่อรายนี้")
	}

	row.Name = strings.TrimSpace(body.Name)
	row.Position = strings.TrimSpace(body.Position)
	row.Phone = strings.TrimSpace(body.Phone)
	row.LineID = strings.TrimSpace(body.LineID)
	row.Email = strings.TrimSpace(body.Email)
	row.Note = strings.TrimSpace(body.Note)

	if err := s.ContactStore.Update(row); err != nil {
		return s.serverError(c, err)
	}
	return c.JSON(http.StatusOK, row)
}

// DeleteContact removes a contact person outright (PDPA: personal data is
// deleted, not flagged).
func (s *Server) DeleteContact(c echo.Context) error {
	lead, errResponse := s.loadLead(c, true)
	if errResponse != nil {
		return errResponse
	}
	contactID, err := request.UintParam(c, "contact_id")
	if err != nil {
		return badRequest(c, "รหัสผู้ติดต่อไม่ถูกต้อง")
	}

	row, err := s.ContactStore.Find(contactID)
	if err != nil {
		if isNotFound(err) {
			return notFound(c, "ไม่พบผู้ติดต่อรายนี้")
		}
		return s.serverError(c, err)
	}
	if row.LeadID != lead.ID {
		return notFound(c, "ไม่พบผู้ติดต่อรายนี้")
	}

	if err := s.ContactStore.Delete(row.ID); err != nil {
		return s.serverError(c, err)
	}
	return c.JSON(http.StatusOK, map[string]string{"status": "deleted"})
}
