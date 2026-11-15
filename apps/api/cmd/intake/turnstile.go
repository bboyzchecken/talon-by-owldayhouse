package main

import (
	"context"
	"encoding/json"
	"net/http"
	"net/url"
	"strings"
	"time"
)

const turnstileVerifyURL = "https://challenges.cloudflare.com/turnstile/v0/siteverify"

type turnstileVerifier struct {
	secret string
	client *http.Client
}

func newTurnstileVerifier(secret string) *turnstileVerifier {
	return &turnstileVerifier{
		secret: secret,
		// A hung call to Cloudflare must not hold a request open.
		client: &http.Client{Timeout: 5 * time.Second},
	}
}

// enabled reports whether a secret was configured. Without one the check is
// skipped, which is what makes local development possible — and why the
// deployment refuses to start in production without it.
func (v *turnstileVerifier) enabled() bool {
	return strings.TrimSpace(v.secret) != ""
}

// verify asks Cloudflare whether this token is good. A network failure is
// reported as a failure: an anti-abuse check that opens the door when the
// service it depends on is unreachable is not a check.
func (v *turnstileVerifier) verify(ctx context.Context, token, remoteIP string) (bool, error) {
	if !v.enabled() {
		return true, nil
	}
	if strings.TrimSpace(token) == "" {
		return false, nil
	}

	form := url.Values{}
	form.Set("secret", v.secret)
	form.Set("response", token)
	if remoteIP != "" {
		form.Set("remoteip", remoteIP)
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, turnstileVerifyURL, strings.NewReader(form.Encode()))
	if err != nil {
		return false, err
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	res, err := v.client.Do(req)
	if err != nil {
		return false, err
	}
	defer func() { _ = res.Body.Close() }()

	var body struct {
		Success bool     `json:"success"`
		Errors  []string `json:"error-codes"`
	}
	if err := json.NewDecoder(res.Body).Decode(&body); err != nil {
		return false, err
	}
	return body.Success, nil
}
