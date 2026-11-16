package main

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strconv"
	"testing"
	"time"

	"github.com/labstack/echo/v4"
	"github.com/sirupsen/logrus"
)

// solve does what the browser does: try numbers until the hash matches.
func solve(t *testing.T, c *altchaChallenge) string {
	t.Helper()
	for n := int64(0); n <= c.MaxNumber; n++ {
		if sha256Hex(c.Salt+strconv.FormatInt(n, 10)) == c.Challenge {
			raw, _ := json.Marshal(altchaPayload{Algorithm: c.Algorithm, Challenge: c.Challenge, Number: n, Salt: c.Salt, Signature: c.Signature})
			return base64.StdEncoding.EncodeToString(raw)
		}
	}
	t.Fatal("no solution within maxnumber")
	return ""
}

func TestAltchaAcceptsASolvedPuzzleOnce(t *testing.T) {
	v := newAltchaVerifier("test-key-0123456789abcdef0123456789abcdef")
	c, err := v.newChallenge()
	if err != nil {
		t.Fatal(err)
	}
	if c.Algorithm != "SHA-256" || c.MaxNumber != altchaMaxNumber || c.Signature == "" {
		t.Fatalf("challenge: %+v", c)
	}
	token := solve(t, c)
	if ok, _ := v.verify(context.Background(), token, ""); !ok {
		t.Fatal("a solved puzzle must pass")
	}
	if ok, _ := v.verify(context.Background(), token, ""); ok {
		t.Fatal("the same answer must not pass twice")
	}
}

func TestAltchaRefusesForgedOrStaleAnswers(t *testing.T) {
	v := newAltchaVerifier("test-key-0123456789abcdef0123456789abcdef")
	other := newAltchaVerifier("another-key-0123456789abcdef0123456789ab")

	encode := func(p altchaPayload) string {
		raw, _ := json.Marshal(p)
		return base64.StdEncoding.EncodeToString(raw)
	}
	decode := func(token string) altchaPayload {
		raw, _ := base64.StdEncoding.DecodeString(token)
		var p altchaPayload
		_ = json.Unmarshal(raw, &p)
		return p
	}
	fresh := func(of *altchaVerifier) altchaPayload {
		c, err := of.newChallenge()
		if err != nil {
			t.Fatal(err)
		}
		return decode(solve(t, c))
	}

	cases := map[string]string{
		"empty":           "",
		"not base64":      "%%%",
		"not json":        base64.StdEncoding.EncodeToString([]byte("hello")),
		"signed by other": encode(fresh(other)),
	}
	wrongNumber := fresh(v)
	wrongNumber.Number = (wrongNumber.Number + 1) % (altchaMaxNumber + 1)
	cases["wrong number"] = encode(wrongNumber)
	wrongAlgorithm := fresh(v)
	wrongAlgorithm.Algorithm = "SHA-1"
	cases["wrong algorithm"] = encode(wrongAlgorithm)
	// A puzzle of our own whose salt was changed (to move its expiry, say)
	// no longer hashes to its challenge.
	movedExpiry := fresh(v)
	movedExpiry.Salt += "0"
	cases["salt changed"] = encode(movedExpiry)

	for name, token := range cases {
		if ok, err := v.verify(context.Background(), token, ""); ok || err != nil {
			t.Errorf("%s: want refused without error, got ok=%v err=%v", name, ok, err)
		}
	}

	// An answer that arrives after its puzzle expired.
	late := newAltchaVerifier("test-key-0123456789abcdef0123456789abcdef")
	start := time.Now()
	late.now = func() time.Time { return start }
	c, _ := late.newChallenge()
	token := solve(t, c)
	late.now = func() time.Time { return start.Add(altchaTTL + time.Second) }
	if ok, _ := late.verify(context.Background(), token, ""); ok {
		t.Error("an expired puzzle must not pass")
	}
}

func TestChallengeRoute(t *testing.T) {
	e := echo.New()
	logs := logrus.New()
	logs.SetLevel(logrus.PanicLevel)

	withAltcha := &intakeServer{altcha: newAltchaVerifier("test-key-0123456789abcdef0123456789abcdef"), log: logs}
	rec := httptest.NewRecorder()
	if err := withAltcha.CreateChallenge(e.NewContext(httptest.NewRequest(http.MethodPost, "/intake/challenge", nil), rec)); err != nil {
		t.Fatal(err)
	}
	var c altchaChallenge
	if rec.Code != http.StatusOK || json.Unmarshal(rec.Body.Bytes(), &c) != nil || c.Challenge == "" || rec.Header().Get("Cache-Control") != "no-store" {
		t.Fatalf("challenge: %d %s", rec.Code, rec.Body.String())
	}

	withTurnstile := &intakeServer{log: logs}
	rec = httptest.NewRecorder()
	_ = withTurnstile.CreateChallenge(e.NewContext(httptest.NewRequest(http.MethodPost, "/intake/challenge", nil), rec))
	if rec.Code != http.StatusNotFound {
		t.Fatalf("no ALTCHA, no puzzles: want 404, got %d", rec.Code)
	}
}
