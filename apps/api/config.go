package main

import (
	"strings"
	"time"

	"github.com/owldayhouse/odh-internal-api/pkg/core"
	"github.com/spf13/viper"
)

// GitCommit is stamped at build time (see the Dockerfile).
var GitCommit = "dev"

// readConfig reads the whole configuration out of the environment.
//
// Note what is NOT here: there is no mail configuration of any kind. The
// internal tools never send e-mail (CLAUDE.md), so Gmail/OAuth and OTP are
// absent by design, not by omission.
func readConfig() core.Config {
	viper.AutomaticEnv()

	viper.SetDefault("ENV", "development")
	viper.SetDefault("PORT", "5000")
	viper.SetDefault("JWT_TTL_HOURS", 168) // 7 days
	viper.SetDefault("CORS_ORIGINS", "http://localhost:3100")

	viper.SetDefault("POSTGRES_HOST", "localhost")
	viper.SetDefault("POSTGRES_PORT", "5432")
	viper.SetDefault("POSTGRES_USERNAME", "odh")
	viper.SetDefault("POSTGRES_PASSWORD", "")
	viper.SetDefault("POSTGRES_DATABASE", "odh_internal")
	viper.SetDefault("POSTGRES_SSLMODE", "disable")
	// The API and Postgres share one 1 vCPU / 2 GB Droplet, so the pool stays
	// well under the server's max_connections.
	viper.SetDefault("POSTGRES_MAX_OPEN_CONNS", 10)
	viper.SetDefault("POSTGRES_MAX_IDLE_CONNS", 5)
	viper.SetDefault("POSTGRES_CONN_MAX_LIFETIME_MINUTES", 30)

	viper.SetDefault("R2_REGION", "auto")
	viper.SetDefault("R2_FILE_BUCKET", "odh-internal-files")
	viper.SetDefault("R2_BACKUP_BUCKET", "odh-internal-backups")
	viper.SetDefault("R2_PRESIGN_EXPIRY_MINUTES", 15)
	viper.SetDefault("R2_MAX_UPLOAD_MB", 20)

	viper.SetDefault("LEAD_SIMILARITY_THRESHOLD", 0.4)

	origins := make([]string, 0, 2)
	for _, origin := range strings.Split(viper.GetString("CORS_ORIGINS"), ",") {
		if trimmed := strings.TrimSpace(origin); trimmed != "" {
			origins = append(origins, trimmed)
		}
	}

	return core.Config{
		Environment: viper.GetString("ENV"),
		Commit:      GitCommit,
		Port:        viper.GetString("PORT"),
		JwtSecret:   viper.GetString("JWT_SECRET_KEY"),
		JwtTTL:      time.Duration(viper.GetInt("JWT_TTL_HOURS")) * time.Hour,
		CorsOrigins: origins,
		Postgres: core.PostgresConfig{
			Host:            viper.GetString("POSTGRES_HOST"),
			Port:            viper.GetString("POSTGRES_PORT"),
			Username:        viper.GetString("POSTGRES_USERNAME"),
			Password:        viper.GetString("POSTGRES_PASSWORD"),
			Database:        viper.GetString("POSTGRES_DATABASE"),
			SSLMode:         viper.GetString("POSTGRES_SSLMODE"),
			TimeZone:        "Asia/Bangkok",
			MaxOpenConns:    viper.GetInt("POSTGRES_MAX_OPEN_CONNS"),
			MaxIdleConns:    viper.GetInt("POSTGRES_MAX_IDLE_CONNS"),
			ConnMaxLifetime: time.Duration(viper.GetInt("POSTGRES_CONN_MAX_LIFETIME_MINUTES")) * time.Minute,
		},
		R2: core.R2Config{
			Endpoint:       viper.GetString("R2_ENDPOINT"),
			Region:         viper.GetString("R2_REGION"),
			AccessKey:      viper.GetString("R2_ACCESS_KEY"),
			SecretKey:      viper.GetString("R2_SECRET_KEY"),
			FileBucket:     viper.GetString("R2_FILE_BUCKET"),
			BackupBucket:   viper.GetString("R2_BACKUP_BUCKET"),
			PresignExpiry:  time.Duration(viper.GetInt("R2_PRESIGN_EXPIRY_MINUTES")) * time.Minute,
			MaxUploadBytes: int64(viper.GetInt("R2_MAX_UPLOAD_MB")) * 1024 * 1024,
		},
		Leads: core.LeadsConfig{
			SimilarityThreshold: viper.GetFloat64("LEAD_SIMILARITY_THRESHOLD"),
		},
	}
}
