package main

import (
	"context"
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"math/big"
	"net/url"
	"strconv"
	"strings"
	"sync"
	"time"
)

// ALTCHA: a proof-of-work bot check that needs no outside service and no
// account (https://altcha.org, protocol v1). The intake hands out a signed
// puzzle; the visitor's browser spends a moment finding the number that
// solves it and sends the answer with the form. A person never notices; a
// bot sending thousands of forms pays for every one. Nothing about the
// visitor leaves this server.
//
// A puzzle is: salt (random, with its expiry inside it), and challenge =
// SHA-256(salt + number) for a secret random number up to maxNumber.
// signature = HMAC-SHA256(key, challenge) proves the puzzle came from us, so
// the server keeps no state until an answer arrives. Each answer is accepted
// once.

const (
	altchaAlgorithm = "SHA-256"
	// About a second of work on a phone; a few hundred milliseconds on a laptop.
	altchaMaxNumber = 50_000
	// Long enough to fill in the last step of the form.
	altchaTTL = 20 * time.Minute
)

type altchaVerifier struct {
	key []byte
	now func() time.Time

	mu   sync.Mutex
	used map[string]time.Time // challenge → when it expires
}

func newAltchaVerifier(key string) *altchaVerifier {
	return &altchaVerifier{key: []byte(key), now: time.Now, used: map[string]time.Time{}}
}

// altchaChallenge is what the browser receives.
type altchaChallenge struct {
	Algorithm string `json:"algorithm"`
	Challenge string `json:"challenge"`
	MaxNumber int64  `json:"maxnumber"`
	Salt      string `json:"salt"`
	Signature string `json:"signature"`
}

// altchaPayload is what comes back, base64-encoded JSON in the form's token.
type altchaPayload struct {
	Algorithm string `json:"algorithm"`
	Challenge string `json:"challenge"`
	Number    int64  `json:"number"`
	Salt      string `json:"salt"`
	Signature string `json:"signature"`
}

func sha256Hex(value string) string {
	sum := sha256.Sum256([]byte(value))
	return hex.EncodeToString(sum[:])
}

func (v *altchaVerifier) sign(challenge string) string {
	mac := hmac.New(sha256.New, v.key)
	mac.Write([]byte(challenge))
	return hex.EncodeToString(mac.Sum(nil))
}

func (v *altchaVerifier) newChallenge() (*altchaChallenge, error) {
	raw := make([]byte, 12)
	if _, err := rand.Read(raw); err != nil {
		return nil, err
	}
	n, err := rand.Int(rand.Reader, big.NewInt(altchaMaxNumber+1))
	if err != nil {
		return nil, err
	}
	salt := hex.EncodeToString(raw) + "?expires=" + strconv.FormatInt(v.now().Add(altchaTTL).Unix(), 10)
	challenge := sha256Hex(salt + strconv.FormatInt(n.Int64(), 10))
	return &altchaChallenge{
		Algorithm: altchaAlgorithm,
		Challenge: challenge,
		MaxNumber: altchaMaxNumber,
		Salt:      salt,
		Signature: v.sign(challenge),
	}, nil
}

// expiry reads the expires parameter out of a salt.
func expiry(salt string) (time.Time, bool) {
	_, query, found := strings.Cut(salt, "?")
	if !found {
		return time.Time{}, false
	}
	params, err := url.ParseQuery(query)
	if err != nil {
		return time.Time{}, false
	}
	unix, err := strconv.ParseInt(params.Get("expires"), 10, 64)
	if err != nil {
		return time.Time{}, false
	}
	return time.Unix(unix, 0), true
}

// verify checks a solved puzzle. It never errors: there is nothing outside
// this process that could fail.
func (v *altchaVerifier) verify(_ context.Context, token, _ string) (bool, error) {
	raw, err := base64.StdEncoding.DecodeString(strings.TrimSpace(token))
	if err != nil {
		return false, nil
	}
	var p altchaPayload
	if err := json.Unmarshal(raw, &p); err != nil {
		return false, nil
	}
	if p.Algorithm != altchaAlgorithm || p.Number < 0 || p.Number > altchaMaxNumber {
		return false, nil
	}
	expires, ok := expiry(p.Salt)
	now := v.now()
	if !ok || !now.Before(expires) {
		return false, nil
	}
	if !hmac.Equal([]byte(v.sign(p.Challenge)), []byte(p.Signature)) {
		return false, nil
	}
	if sha256Hex(p.Salt+strconv.FormatInt(p.Number, 10)) != p.Challenge {
		return false, nil
	}

	v.mu.Lock()
	defer v.mu.Unlock()
	for c, until := range v.used {
		if !now.Before(until) {
			delete(v.used, c)
		}
	}
	if _, seen := v.used[p.Challenge]; seen {
		return false, nil
	}
	v.used[p.Challenge] = expires
	return true, nil
}
