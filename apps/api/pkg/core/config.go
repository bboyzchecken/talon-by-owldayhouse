// Package core holds the configuration shape for the ODH internal tools API.
//
// Every value comes from the environment (Viper + godotenv). There is no email
// configuration anywhere in this system by design: the internal tools never
// send mail (see CLAUDE.md). Contact e-mail addresses are stored as data only.
package core

import (
	"strings"
	"time"
)

// Config is the single configuration struct injected through Uber FX.
type Config struct {
	Environment string
	Commit      string
	Port        string
	JwtSecret   string
	JwtTTL      time.Duration
	CorsOrigins []string

	Postgres PostgresConfig
	R2       R2Config
	Leads    LeadsConfig
}

// PostgresConfig describes the PostgreSQL 16 connection and pool. The pool is
// deliberately small: the API runs on a 1 vCPU / 2 GB DigitalOcean Droplet next
// to Postgres itself (see infra/digitalocean/README.md).
type PostgresConfig struct {
	Host     string
	Port     string
	Username string
	Password string
	Database string
	SSLMode  string
	TimeZone string

	MaxOpenConns    int
	MaxIdleConns    int
	ConnMaxLifetime time.Duration
}

// DSN builds the keyword/value connection string used by
// gorm.io/driver/postgres.
//
// Two details matter here:
//
//   - An empty value is omitted, never written bare. `password= dbname=odh`
//     parses as a password of "dbname=odh" and no database at all, because the
//     parser skips the whitespace after `=` — so the connection silently lands
//     on the driver's default database. An empty password is the normal
//     local-development case, so this is not hypothetical.
//   - A value is quoted only when it contains whitespace, a quote or a
//     backslash. Quoting everything would break the runtime parameters:
//     the driver unquotes the standard keywords but hands TimeZone to the
//     server verbatim, which then rejects "'Asia/Bangkok'".
func (c PostgresConfig) DSN() string {
	pairs := [][2]string{
		{"host", c.Host},
		{"port", c.Port},
		{"user", c.Username},
		{"password", c.Password},
		{"dbname", c.Database},
		{"sslmode", c.SSLMode},
		{"TimeZone", c.TimeZone},
	}

	parts := make([]string, 0, len(pairs))
	for _, pair := range pairs {
		if pair[1] == "" {
			continue
		}
		parts = append(parts, pair[0]+"="+encodeDSNValue(pair[1]))
	}
	return strings.Join(parts, " ")
}

// encodeDSNValue quotes a connection-string value if it needs quoting, and
// escapes backslashes and single quotes inside it.
func encodeDSNValue(value string) string {
	if !strings.ContainsAny(value, " \t\r\n'\\") {
		return value
	}
	escaped := strings.ReplaceAll(value, `\`, `\\`)
	escaped = strings.ReplaceAll(escaped, `'`, `\'`)
	return "'" + escaped + "'"
}

type R2Config struct {
	Endpoint       string
	Region         string
	AccessKey      string
	SecretKey      string
	FileBucket     string
	BackupBucket   string
	PresignExpiry  time.Duration
	MaxUploadBytes int64
}

// LeadsConfig carries the Lead Tracker knobs that are not per-row settings.
type LeadsConfig struct {
	// SimilarityThreshold is the pg_trgm similarity() cut-off above which a new
	// lead name is reported as "looks like an existing customer".
	SimilarityThreshold float64
}
