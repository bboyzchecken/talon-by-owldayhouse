// Package hashutil holds the small hash helpers the internal tools use.
// Passwords do NOT go through here — they use bcrypt via the request package.
package hashutil

import (
	"crypto/hmac"
	"crypto/md5"
	"crypto/sha256"
	"encoding/hex"
)

// MD5 returns the hex MD5 of the input (non-security uses only, e.g. cache keys).
func MD5(input string) string {
	sum := md5.Sum([]byte(input))
	return hex.EncodeToString(sum[:])
}

// SHA256 returns the hex SHA-256 of the input.
func SHA256(input string) string {
	sum := sha256.Sum256([]byte(input))
	return hex.EncodeToString(sum[:])
}

// HMACSign returns the hex HMAC-SHA256 of data under secret.
func HMACSign(secret, data string) string {
	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write([]byte(data))
	return hex.EncodeToString(mac.Sum(nil))
}
