package api

import (
	"net/http"

	"github.com/labstack/echo/v4"
	"github.com/owldayhouse/odh-internal-api/pkg/leadrules"
	"github.com/owldayhouse/odh-internal-api/pkg/models"
)

// Echo context keys set by the auth middleware.
const (
	ctxUserID   = "id"
	ctxUsername = "username"
	ctxRole     = "role"
	ctxUser     = "user"
)

// JwtMiddleware requires a valid bearer token AND a live, active account: an
// account an admin deactivates loses access on its next request, without
// waiting for its 7-day token to expire.
func (s *Server) JwtMiddleware() echo.MiddlewareFunc {
	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			raw := extractBearerToken(c)
			if raw == "" {
				return unauthorized(c)
			}
			claims, err := s.parseToken(raw)
			if err != nil {
				return unauthorized(c)
			}

			user, err := s.UserStore.Find(claims.ID)
			if err != nil || user.Status != models.StatusActive {
				return unauthorized(c)
			}

			c.Set(ctxUserID, user.ID)
			c.Set(ctxUsername, user.Username)
			c.Set(ctxRole, user.Role)
			c.Set(ctxUser, user)
			return next(c)
		}
	}
}

// IsAdmin rejects anyone who is not an admin. Chain it after JwtMiddleware.
func (s *Server) IsAdmin() echo.MiddlewareFunc {
	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			role, _ := c.Get(ctxRole).(string)
			if role != models.RoleAdmin {
				return c.JSON(http.StatusForbidden, errorBody("ต้องเป็นแอดมินเท่านั้น"))
			}
			return next(c)
		}
	}
}

// currentUser returns the signed-in account.
func currentUser(c echo.Context) *models.User {
	user, _ := c.Get(ctxUser).(*models.User)
	return user
}

// actor returns the signed-in account as the rules see it.
func actor(c echo.Context) leadrules.Actor {
	user := currentUser(c)
	if user == nil {
		return leadrules.Actor{}
	}
	return leadrules.Actor{ID: user.ID, Role: user.Role}
}

func unauthorized(c echo.Context) error {
	return c.JSON(http.StatusUnauthorized, errorBody("unauthorized"))
}

// errorBody is the shared error shape: {"error": "..."}.
func errorBody(message string) map[string]string {
	return map[string]string{"error": message}
}
