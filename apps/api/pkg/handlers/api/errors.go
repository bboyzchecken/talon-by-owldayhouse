package api

import (
	"errors"
	"net/http"

	"github.com/labstack/echo/v4"
	"github.com/owldayhouse/odh-internal-api/pkg/leadrules"
	"github.com/owldayhouse/odh-internal-api/pkg/services/storage"
	"github.com/owldayhouse/odh-internal-api/pkg/utils/validator"
	"gorm.io/gorm"
)

func asHTTPError(err error, target **echo.HTTPError) bool {
	return errors.As(err, target)
}

// isNotFound reports whether the error is GORM's "no rows".
func isNotFound(err error) bool {
	return errors.Is(err, gorm.ErrRecordNotFound)
}

// errResponded means a helper has already written the response — a 403, a
// 404 — and the handler must stop. Helpers that check something on a
// handler's behalf (loadLead, checkFileOwner…) return it, so the caller's
// usual `if err != nil { return err }` stops there. A refusal written by
// c.JSON returns nil, and a caller testing for non-nil would carry on: that
// is how a refused upload once went on to hand out a presigned URL.
var errResponded = errors.New("response already written")

// responded is what a checking helper returns after writing a refusal.
func responded(err error) error {
	if err != nil {
		return err
	}
	return errResponded
}

// swallowResponded turns errResponded back into success once the handler has
// returned, so the request log shows the status that was written instead of
// an error.
func swallowResponded(next echo.HandlerFunc) echo.HandlerFunc {
	return func(c echo.Context) error {
		if err := next(c); err != nil && !errors.Is(err, errResponded) {
			return err
		}
		return nil
	}
}

// badRequest returns 400.
func badRequest(c echo.Context, message string) error {
	return c.JSON(http.StatusBadRequest, errorBody(message))
}

// notFound returns 404.
func notFound(c echo.Context, message string) error {
	return c.JSON(http.StatusNotFound, errorBody(message))
}

// forbidden returns 403.
func forbidden(c echo.Context, message string) error {
	return c.JSON(http.StatusForbidden, errorBody(message))
}

// conflict returns 409 with extra context (the duplicate or similar leads).
func conflict(c echo.Context, body interface{}) error {
	return c.JSON(http.StatusConflict, body)
}

// unprocessable returns the validator's 422 body.
func unprocessable(c echo.Context, err error) error {
	var fieldErrors *validator.Errors
	if errors.As(err, &fieldErrors) {
		return c.JSON(http.StatusUnprocessableEntity, fieldErrors)
	}
	return c.JSON(http.StatusUnprocessableEntity, errorBody(err.Error()))
}

// serverError logs and returns 500.
func (s *Server) serverError(c echo.Context, err error) error {
	s.Log.WithError(err).Error("request failed")
	return c.JSON(http.StatusInternalServerError, errorBody("เกิดข้อผิดพลาดภายในระบบ"))
}

// ruleError maps a leadrules / storage rule violation onto an HTTP status.
func (s *Server) ruleError(c echo.Context, err error) error {
	switch {
	case errors.Is(err, leadrules.ErrCutoffPassed),
		errors.Is(err, leadrules.ErrOwnerChangeForbidden),
		errors.Is(err, leadrules.ErrNotLeadOwner),
		errors.Is(err, leadrules.ErrDoNotPitch):
		return forbidden(c, err.Error())
	case errors.Is(err, leadrules.ErrInvalidStage),
		errors.Is(err, storage.ErrFileTypeNotAllowed),
		errors.Is(err, storage.ErrFileTooLarge):
		return badRequest(c, err.Error())
	default:
		return badRequest(c, err.Error())
	}
}

// listResponse is the shape every paginated list returns.
func listResponse(data interface{}, pagination interface{}) map[string]interface{} {
	return map[string]interface{}{"data": data, "pagination": pagination}
}
