// Package request holds the handler-side request helpers: password hashing,
// pagination parsing and friends.
//
// The template's OTP helpers are deliberately absent: this system has no
// e-mail, so there is no OTP to send. An admin creates and resets accounts.
package request

import (
	"crypto/rand"
	"math/big"
	"strconv"

	"github.com/labstack/echo/v4"
	"github.com/owldayhouse/odh-internal-api/pkg/store"
	"golang.org/x/crypto/bcrypt"
)

// HashPassword returns the bcrypt hash of a password.
func HashPassword(password string) (string, error) {
	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	return string(hash), err
}

// CheckPassword reports whether the password matches the bcrypt hash.
func CheckPassword(hash, password string) bool {
	return bcrypt.CompareHashAndPassword([]byte(hash), []byte(password)) == nil
}

// passwordAlphabet leaves out the characters people misread out loud (0/O, 1/l),
// because an admin reads a reset password to a sales person over the phone.
const passwordAlphabet = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789"

// GeneratePassword returns a cryptographically random temporary password.
func GeneratePassword(length int) (string, error) {
	if length < 8 {
		length = 12
	}
	max := big.NewInt(int64(len(passwordAlphabet)))
	out := make([]byte, length)
	for i := range out {
		n, err := rand.Int(rand.Reader, max)
		if err != nil {
			return "", err
		}
		out[i] = passwordAlphabet[n.Int64()]
	}
	return string(out), nil
}

// GetPaginationQuery parses ?page= and ?limit=.
func GetPaginationQuery(c echo.Context) store.PaginationQuery {
	q := store.PaginationQuery{
		Page:  atoiOr(c.QueryParam("page"), 1),
		Limit: atoiOr(c.QueryParam("limit"), store.DefaultLimit),
	}
	q.Normalize()
	return q
}

// UintParam reads a path parameter as a uint.
func UintParam(c echo.Context, name string) (uint, error) {
	value, err := strconv.ParseUint(c.Param(name), 10, 64)
	if err != nil {
		return 0, err
	}
	return uint(value), nil
}

// QueryUint reads a query parameter as a uint pointer; nil when absent or 0.
func QueryUint(c echo.Context, name string) *uint {
	raw := c.QueryParam(name)
	if raw == "" {
		return nil
	}
	value, err := strconv.ParseUint(raw, 10, 64)
	if err != nil || value == 0 {
		return nil
	}
	out := uint(value)
	return &out
}

// QueryInt reads a query parameter as an int with a fallback.
func QueryInt(c echo.Context, name string, fallback int) int {
	return atoiOr(c.QueryParam(name), fallback)
}

// QueryBool reports whether a query parameter is set to a truthy value.
func QueryBool(c echo.Context, name string) bool {
	switch c.QueryParam(name) {
	case "1", "true", "yes":
		return true
	default:
		return false
	}
}

func atoiOr(raw string, fallback int) int {
	if raw == "" {
		return fallback
	}
	value, err := strconv.Atoi(raw)
	if err != nil {
		return fallback
	}
	return value
}
