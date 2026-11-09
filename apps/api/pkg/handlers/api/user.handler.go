package api

import (
	"net/http"
	"strings"

	"github.com/labstack/echo/v4"
	"github.com/owldayhouse/odh-internal-api/pkg/handlers/api/request"
	"github.com/owldayhouse/odh-internal-api/pkg/models"
)

// ListUsers returns the accounts (admin only).
func (s *Server) ListUsers(c echo.Context) error {
	query := models.ListUserQuery{
		PaginationQuery: request.GetPaginationQuery(c),
		Role:            c.QueryParam("role"),
		Status:          c.QueryParam("status"),
		Search:          c.QueryParam("search"),
	}

	users, pagination, err := s.UserStore.List(query)
	if err != nil {
		return s.serverError(c, err)
	}
	return c.JSON(http.StatusOK, listResponse(users, pagination))
}

type createUserBody struct {
	Username string `json:"username" validate:"required,min=3,max=64"`
	Name     string `json:"name" validate:"required,max=128"`
	Password string `json:"password" validate:"omitempty,min=8,max=128"`
	Role     string `json:"role" validate:"required,oneof=admin sales"`
}

// CreateUser creates a sales (or another admin) account. There is no e-mail
// invitation: the admin hands the password over directly. When no password is
// given, one is generated and returned once, in this response only.
func (s *Server) CreateUser(c echo.Context) error {
	var body createUserBody
	if err := c.Bind(&body); err != nil {
		return badRequest(c, "ข้อมูลที่ส่งมาไม่ถูกต้อง")
	}
	if err := c.Validate(&body); err != nil {
		return unprocessable(c, err)
	}

	username := strings.ToLower(strings.TrimSpace(body.Username))
	if _, err := s.UserStore.FindByUsername(username); err == nil {
		return conflict(c, errorBody("ชื่อผู้ใช้นี้มีอยู่แล้ว"))
	} else if !isNotFound(err) {
		return s.serverError(c, err)
	}

	password := body.Password
	generated := false
	if password == "" {
		var err error
		if password, err = request.GeneratePassword(12); err != nil {
			return s.serverError(c, err)
		}
		generated = true
	}

	hash, err := request.HashPassword(password)
	if err != nil {
		return s.serverError(c, err)
	}

	user := &models.User{
		Username: username,
		Name:     strings.TrimSpace(body.Name),
		Password: hash,
		Role:     body.Role,
		Status:   models.StatusActive,
	}
	if err := s.UserStore.Create(user); err != nil {
		return s.serverError(c, err)
	}

	response := map[string]interface{}{"user": user}
	if generated {
		response["password"] = password
		response["note"] = "รหัสผ่านนี้แสดงครั้งเดียว ให้คัดลอกไปส่งให้เจ้าของบัญชี"
	}
	return c.JSON(http.StatusCreated, response)
}

type updateUserBody struct {
	Name   *string `json:"name" validate:"omitempty,max=128"`
	Role   *string `json:"role" validate:"omitempty,oneof=admin sales"`
	Status *string `json:"status" validate:"omitempty,oneof=active deactivated"`
}

// UpdateUser renames an account, changes its role, or closes it.
func (s *Server) UpdateUser(c echo.Context) error {
	id, err := request.UintParam(c, "id")
	if err != nil {
		return badRequest(c, "รหัสผู้ใช้ไม่ถูกต้อง")
	}

	var body updateUserBody
	if err := c.Bind(&body); err != nil {
		return badRequest(c, "ข้อมูลที่ส่งมาไม่ถูกต้อง")
	}
	if err := c.Validate(&body); err != nil {
		return unprocessable(c, err)
	}

	user, err := s.UserStore.Find(id)
	if err != nil {
		if isNotFound(err) {
			return notFound(c, "ไม่พบผู้ใช้รายนี้")
		}
		return s.serverError(c, err)
	}

	wasActiveAdmin := user.Role == models.RoleAdmin && user.Status == models.StatusActive

	if body.Name != nil {
		user.Name = strings.TrimSpace(*body.Name)
	}
	if body.Role != nil {
		user.Role = *body.Role
	}
	if body.Status != nil {
		user.Status = *body.Status
	}

	// Never let the company lock itself out of its own tools: the last active
	// admin cannot be demoted or deactivated.
	stillActiveAdmin := user.Role == models.RoleAdmin && user.Status == models.StatusActive
	if wasActiveAdmin && !stillActiveAdmin {
		admins, err := s.UserStore.CountAdmins()
		if err != nil {
			return s.serverError(c, err)
		}
		if admins <= 1 {
			return badRequest(c, "ต้องมีแอดมินที่ใช้งานได้อย่างน้อยหนึ่งคน")
		}
	}

	if err := s.UserStore.Update(user); err != nil {
		return s.serverError(c, err)
	}
	return c.JSON(http.StatusOK, user)
}

type resetPasswordBody struct {
	Password string `json:"password" validate:"omitempty,min=8,max=128"`
}

// ResetUserPassword sets a new password for an account. With no password in the
// body, one is generated and returned once so the admin can pass it on.
func (s *Server) ResetUserPassword(c echo.Context) error {
	id, err := request.UintParam(c, "id")
	if err != nil {
		return badRequest(c, "รหัสผู้ใช้ไม่ถูกต้อง")
	}

	var body resetPasswordBody
	if err := c.Bind(&body); err != nil {
		return badRequest(c, "ข้อมูลที่ส่งมาไม่ถูกต้อง")
	}
	if err := c.Validate(&body); err != nil {
		return unprocessable(c, err)
	}

	user, err := s.UserStore.Find(id)
	if err != nil {
		if isNotFound(err) {
			return notFound(c, "ไม่พบผู้ใช้รายนี้")
		}
		return s.serverError(c, err)
	}

	password := body.Password
	generated := false
	if password == "" {
		if password, err = request.GeneratePassword(12); err != nil {
			return s.serverError(c, err)
		}
		generated = true
	}

	hash, err := request.HashPassword(password)
	if err != nil {
		return s.serverError(c, err)
	}
	user.Password = hash
	if err := s.UserStore.Update(user); err != nil {
		return s.serverError(c, err)
	}

	response := map[string]interface{}{"user": user}
	if generated {
		response["password"] = password
		response["note"] = "รหัสผ่านนี้แสดงครั้งเดียว ให้คัดลอกไปส่งให้เจ้าของบัญชี"
	}
	return c.JSON(http.StatusOK, response)
}
