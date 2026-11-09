package api

import (
	"errors"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/labstack/echo/v4"
	"github.com/owldayhouse/odh-internal-api/pkg/models"
)

// Claims is the JWT payload: the account id, its username and its role.
// Signed with HS256; valid for 7 days, as in PROJECT_TEMPLATE.md.
type Claims struct {
	ID       uint   `json:"id"`
	Username string `json:"username"`
	Role     string `json:"role"`
	jwt.RegisteredClaims
}

// errInvalidToken is returned for anything that is not a usable bearer token.
var errInvalidToken = errors.New("unauthorized")

// IssueToken signs a token for the user.
func (s *Server) IssueToken(user *models.User) (string, time.Time, error) {
	expiresAt := time.Now().Add(s.Config.JwtTTL)
	claims := Claims{
		ID:       user.ID,
		Username: user.Username,
		Role:     user.Role,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(expiresAt),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			Subject:   user.Username,
		},
	}

	signed, err := jwt.NewWithClaims(jwt.SigningMethodHS256, claims).
		SignedString([]byte(s.Config.JwtSecret))
	if err != nil {
		return "", time.Time{}, err
	}
	return signed, expiresAt, nil
}

// parseToken validates the token's signature and expiry.
func (s *Server) parseToken(raw string) (*Claims, error) {
	claims := &Claims{}
	token, err := jwt.ParseWithClaims(raw, claims, func(t *jwt.Token) (interface{}, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, errInvalidToken
		}
		return []byte(s.Config.JwtSecret), nil
	}, jwt.WithValidMethods([]string{jwt.SigningMethodHS256.Alg()}))
	if err != nil || !token.Valid {
		return nil, errInvalidToken
	}
	return claims, nil
}

// extractBearerToken pulls the token out of the Authorization header.
func extractBearerToken(c echo.Context) string {
	header := c.Request().Header.Get(echo.HeaderAuthorization)
	const prefix = "Bearer "
	if len(header) > len(prefix) && strings.EqualFold(header[:len(prefix)], prefix) {
		return strings.TrimSpace(header[len(prefix):])
	}
	return ""
}
