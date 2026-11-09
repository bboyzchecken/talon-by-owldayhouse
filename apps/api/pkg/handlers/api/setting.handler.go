package api

import (
	"net/http"
	"strings"

	"github.com/labstack/echo/v4"
	"github.com/owldayhouse/odh-internal-api/pkg/leadrules"
	"github.com/owldayhouse/odh-internal-api/pkg/models"
)

// ListSettings returns every company-wide setting (admin only).
func (s *Server) ListSettings(c echo.Context) error {
	rows, err := s.SettingStore.All()
	if err != nil {
		return s.serverError(c, err)
	}
	return c.JSON(http.StatusOK, map[string]interface{}{"data": rows})
}

type updateSettingBody struct {
	Value string `json:"value" validate:"required,max=255"`
}

// UpdateSetting changes one setting. The cut-off is validated as a real date so
// a typo cannot silently switch the ownership rule off.
func (s *Server) UpdateSetting(c echo.Context) error {
	key := c.Param("key")
	if key != models.SettingSalesExistingCutoff {
		return badRequest(c, "ยังไม่รองรับการแก้ค่านี้")
	}

	var body updateSettingBody
	if err := c.Bind(&body); err != nil {
		return badRequest(c, "ข้อมูลที่ส่งมาไม่ถูกต้อง")
	}
	if err := c.Validate(&body); err != nil {
		return unprocessable(c, err)
	}

	value := strings.TrimSpace(body.Value)
	if _, err := leadrules.ParseCutoff(value); err != nil {
		return badRequest(c, "วันหมดเขตต้องเป็นรูปแบบ YYYY-MM-DD")
	}

	user := currentUser(c)
	if err := s.SettingStore.Set(key, value, user.ID); err != nil {
		return s.serverError(c, err)
	}

	row, err := s.SettingStore.Get(key)
	if err != nil {
		return s.serverError(c, err)
	}
	return c.JSON(http.StatusOK, row)
}
