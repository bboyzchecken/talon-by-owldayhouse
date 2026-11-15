package main

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"net/http"

	"github.com/labstack/echo/v4"
	"github.com/owldayhouse/odh-internal-api/pkg/models"
	"github.com/sirupsen/logrus"
)

type intakeServer struct {
	store     models.InboundRequestStore
	turnstile *turnstileVerifier
	log       *logrus.Logger
	// ipSalt keys the hash of the caller's address. Without a key the hash of
	// an IPv4 address is trivially reversible — there are only four billion.
	ipSalt string
}

// hashIP turns an address into something that can be grouped and counted but
// not read back. An empty salt means "do not keep it at all".
func (s *intakeServer) hashIP(ip string) string {
	if s.ipSalt == "" || ip == "" {
		return ""
	}
	mac := hmac.New(sha256.New, []byte(s.ipSalt))
	mac.Write([]byte(ip))
	return hex.EncodeToString(mac.Sum(nil))
}

// accepted is the only successful answer. It carries no id and no echo of what
// was sent: this endpoint confirms receipt and nothing else.
func accepted(c echo.Context) error {
	return c.JSON(http.StatusAccepted, map[string]bool{"ok": true})
}

// CreateQuoteRequest handles POST /intake/quote.
//
// It is the single way into this service. There is no GET, no auth and no way
// to read anything back: the row lands in inbound_requests and a person in the
// CRM decides what happens to it.
func (s *intakeServer) CreateQuoteRequest(c echo.Context) error {
	var body quoteRequest
	if err := c.Bind(&body); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "ข้อมูลที่ส่งมาไม่ถูกต้อง"})
	}

	row, err := body.normalize()
	if err != nil {
		// A submission that failed an anti-abuse check is answered exactly
		// like a good one. Telling a bot which check caught it only helps it.
		if errors.Is(err, errSilentDrop) {
			s.log.WithField("path", c.Path()).Info("dropped an automated submission")
			return accepted(c)
		}
		return c.JSON(http.StatusBadRequest, map[string]string{"error": err.Error()})
	}

	ok, err := s.turnstile.verify(c.Request().Context(), body.Token, c.RealIP())
	if err != nil {
		s.log.WithError(err).Error("turnstile verification failed to run")
		return c.JSON(http.StatusServiceUnavailable, map[string]string{
			"error": "ระบบตรวจสอบไม่ตอบสนอง กรุณาลองใหม่อีกครั้ง",
		})
	}
	if !ok {
		s.log.Info("dropped a submission that failed Turnstile")
		return accepted(c)
	}

	row.IPHash = s.hashIP(c.RealIP())
	row.UserAgent = clean(c.Request().UserAgent(), maxAgent)

	if err := s.store.Create(row); err != nil {
		s.log.WithError(err).Error("cannot store an inbound request")
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "บันทึกไม่สำเร็จ กรุณาลองใหม่ หรือทักเราทาง LINE หรือ Messenger",
		})
	}

	s.log.WithFields(logrus.Fields{
		"kind":       row.Kind,
		"locale":     row.Locale,
		"utm_source": row.UTMSource,
	}).Info("stored an inbound request")

	return accepted(c)
}
