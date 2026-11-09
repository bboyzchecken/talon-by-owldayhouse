package logger

import (
	"time"

	"github.com/labstack/echo/v4"
	"github.com/sirupsen/logrus"
)

// Middleware logs one line per request. Query strings are logged but request
// bodies are not: lead and contact rows carry personal data (PDPA).
func Middleware(log *logrus.Logger) echo.MiddlewareFunc {
	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			start := time.Now()
			err := next(c)

			req := c.Request()
			res := c.Response()
			fields := logrus.Fields{
				"method":   req.Method,
				"path":     req.URL.Path,
				"query":    req.URL.RawQuery,
				"status":   res.Status,
				"duration": time.Since(start).String(),
				"ip":       c.RealIP(),
			}
			if id, ok := c.Get(ContextUserID).(uint); ok {
				fields["user_id"] = id
			}

			entry := log.WithFields(fields)
			switch {
			case err != nil:
				entry.WithError(err).Error("request failed")
			case res.Status >= 500:
				entry.Error("request")
			case res.Status >= 400:
				entry.Warn("request")
			default:
				entry.Info("request")
			}
			return err
		}
	}
}

// ContextUserID is the Echo context key the JWT middleware sets. It lives here
// so the logger does not have to import the handlers package.
const ContextUserID = "id"
