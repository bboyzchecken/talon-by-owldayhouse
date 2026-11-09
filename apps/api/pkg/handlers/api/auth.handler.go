package api

import (
	"net/http"
	"strings"
	"time"

	"github.com/labstack/echo/v4"
	"github.com/owldayhouse/odh-internal-api/pkg/handlers/api/request"
	"github.com/owldayhouse/odh-internal-api/pkg/models"
)

// loginBody is the only credential flow in this system.
type loginBody struct {
	Username string `json:"username" validate:"required,min=3,max=64"`
	Password string `json:"password" validate:"required,min=8,max=128"`
}

// Login signs an account in and returns a 7-day JWT.
func (s *Server) Login(c echo.Context) error {
	var body loginBody
	if err := c.Bind(&body); err != nil {
		return badRequest(c, "ข้อมูลที่ส่งมาไม่ถูกต้อง")
	}
	if err := c.Validate(&body); err != nil {
		return unprocessable(c, err)
	}

	user, err := s.UserStore.FindByUsername(strings.TrimSpace(body.Username))
	if err != nil {
		if isNotFound(err) {
			// Same message either way, so the form cannot be used to find out
			// which usernames exist.
			return c.JSON(http.StatusUnauthorized, errorBody("ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง"))
		}
		return s.serverError(c, err)
	}

	if !request.CheckPassword(user.Password, body.Password) {
		return c.JSON(http.StatusUnauthorized, errorBody("ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง"))
	}
	if user.Status != models.StatusActive {
		return forbidden(c, "บัญชีนี้ถูกปิดการใช้งาน")
	}

	token, expiresAt, err := s.IssueToken(user)
	if err != nil {
		return s.serverError(c, err)
	}

	return c.JSON(http.StatusOK, map[string]interface{}{
		"token":      token,
		"expires_at": expiresAt.Format(time.RFC3339),
		"user":       user,
	})
}

// GetMe returns the signed-in account.
func (s *Server) GetMe(c echo.Context) error {
	user := currentUser(c)
	if user == nil {
		return unauthorized(c)
	}
	return c.JSON(http.StatusOK, user)
}

type changePasswordBody struct {
	CurrentPassword string `json:"current_password" validate:"required"`
	NewPassword     string `json:"new_password" validate:"required,min=8,max=128"`
}

// ChangeMyPassword lets an account change its own password.
func (s *Server) ChangeMyPassword(c echo.Context) error {
	user := currentUser(c)
	if user == nil {
		return unauthorized(c)
	}

	var body changePasswordBody
	if err := c.Bind(&body); err != nil {
		return badRequest(c, "ข้อมูลที่ส่งมาไม่ถูกต้อง")
	}
	if err := c.Validate(&body); err != nil {
		return unprocessable(c, err)
	}
	if !request.CheckPassword(user.Password, body.CurrentPassword) {
		return badRequest(c, "รหัสผ่านเดิมไม่ถูกต้อง")
	}

	hash, err := request.HashPassword(body.NewPassword)
	if err != nil {
		return s.serverError(c, err)
	}
	user.Password = hash
	if err := s.UserStore.Update(user); err != nil {
		return s.serverError(c, err)
	}

	return c.JSON(http.StatusOK, map[string]string{"status": "ok"})
}
