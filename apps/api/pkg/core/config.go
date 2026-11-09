// Package core holds the configuration shape for the ODH internal tools API.
//
// Every value comes from the environment (Viper + godotenv). There is no email
// configuration anywhere in this system by design: the internal tools never
// send mail (see CLAUDE.md). Contact e-mail addresses are stored as data only.
package core

import "time"

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

// DSN builds the lib/pq style connection string used by gorm.io/driver/postgres.
func (c PostgresConfig) DSN() string {
	return "host=" + c.Host +
		" port=" + c.Port +
		" user=" + c.Username +
		" password=" + c.Password +
		" dbname=" + c.Database +
		" sslmode=" + c.SSLMode +
		" TimeZone=" + c.TimeZone
}

// R2Config is the Cloudflare R2 (S3-compatible) bucket pair for this system.
// Every uploaded file lives in R2 — nothing is ever written to the Droplet disk.
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
