// Command odh-intake is the public intake service for owldayhouse.com.
//
// It is a separate program from the CRM API on purpose. This is the only part
// of the system that listens to the open internet, so it carries as little as
// possible: one route, POST only, no GET, no auth, no session, and a
// PostgreSQL role that may INSERT into inbound_requests and nothing else. The
// CRM's code is not in this binary at all.
//
// The marketing site stays a static export: the form on it is plain HTML and
// a fetch() to this host.
//
// Environment:
//
//	INTAKE_PORT           port to listen on (default 5200)
//	INTAKE_CORS_ORIGINS   comma-separated origins allowed to POST (required)
//	INTAKE_IP_SALT        key for hashing caller addresses (required in production)
//	TURNSTILE_SECRET      Cloudflare Turnstile secret (required in production)
//	POSTGRES_*            the intake role's connection (see pkg/core)
package main

import (
	"log"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/joho/godotenv"
	"github.com/labstack/echo/v4"
	"github.com/labstack/echo/v4/middleware"
	"github.com/owldayhouse/odh-internal-api/pkg/core"
	"github.com/owldayhouse/odh-internal-api/pkg/logger"
	storeinbound "github.com/owldayhouse/odh-internal-api/pkg/store/inbound"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	gormlogger "gorm.io/gorm/logger"
)

func env(key, fallback string) string {
	if value := strings.TrimSpace(os.Getenv(key)); value != "" {
		return value
	}
	return fallback
}

func main() {
	if err := godotenv.Load(".env"); err != nil && !os.IsNotExist(err) {
		log.Printf("no .env file loaded (%v) — reading the environment instead", err)
	}
	if loc, err := time.LoadLocation("Asia/Bangkok"); err == nil {
		time.Local = loc
	}

	environment := env("ENV", "development")
	production := environment == "production"
	logs := logger.New(environment)

	origins := strings.Split(env("INTAKE_CORS_ORIGINS", ""), ",")
	for i := range origins {
		origins[i] = strings.TrimSpace(origins[i])
	}
	if len(origins) == 0 || origins[0] == "" {
		logs.Fatal("INTAKE_CORS_ORIGINS is required — list the site origins allowed to post")
	}

	secret := env("TURNSTILE_SECRET", "")
	salt := env("INTAKE_IP_SALT", "")
	// Development may run without these; production may not. A service that
	// quietly skips its anti-abuse check is worse than one that will not boot.
	if production {
		if secret == "" {
			logs.Fatal("TURNSTILE_SECRET is required in production")
		}
		if salt == "" {
			logs.Fatal("INTAKE_IP_SALT is required in production")
		}
	}

	db, err := openDB(environment)
	if err != nil {
		logs.WithError(err).Fatal("cannot connect to PostgreSQL")
	}

	server := &intakeServer{
		store:     storeinbound.New(db),
		turnstile: newTurnstileVerifier(secret),
		log:       logs,
		ipSalt:    salt,
	}

	e := echo.New()
	e.HideBanner = true
	e.HidePort = true

	e.Use(middleware.Recover())
	e.Use(middleware.Secure())
	e.Use(middleware.RequestID())
	// 16KB, not the CRM's 25MB: this endpoint takes a form, never a file.
	e.Use(middleware.BodyLimit("16K"))
	e.Use(middleware.CORSWithConfig(middleware.CORSConfig{
		AllowOrigins:     origins,
		AllowMethods:     []string{http.MethodPost, http.MethodOptions},
		AllowHeaders:     []string{echo.HeaderOrigin, echo.HeaderContentType},
		AllowCredentials: false,
		MaxAge:           600,
	}))
	// Two limits: a slow one per address, and a ceiling for the whole service
	// so a botnet spread across many addresses still cannot fill the table.
	e.Use(middleware.RateLimiterWithConfig(middleware.RateLimiterConfig{
		Store: middleware.NewRateLimiterMemoryStoreWithConfig(
			middleware.RateLimiterMemoryStoreConfig{Rate: 0.05, Burst: 5, ExpiresIn: time.Hour},
		),
		IdentifierExtractor: func(c echo.Context) (string, error) { return c.RealIP(), nil },
		ErrorHandler:        tooMany,
		DenyHandler:         tooManyDenied,
	}))
	e.Use(middleware.RateLimiterWithConfig(middleware.RateLimiterConfig{
		Store: middleware.NewRateLimiterMemoryStoreWithConfig(
			middleware.RateLimiterMemoryStoreConfig{Rate: 1, Burst: 60, ExpiresIn: time.Hour},
		),
		IdentifierExtractor: func(echo.Context) (string, error) { return "all", nil },
		ErrorHandler:        tooMany,
		DenyHandler:         tooManyDenied,
	}))
	e.Use(logger.Middleware(logs))

	// The only two routes in the service.
	e.GET("/healthz", func(c echo.Context) error {
		return c.JSON(http.StatusOK, map[string]string{"status": "ok", "service": "intake"})
	})
	e.POST("/intake/quote", server.CreateQuoteRequest)

	port := env("INTAKE_PORT", "5200")
	httpServer := &http.Server{
		Addr:              ":" + port,
		Handler:           e,
		ReadHeaderTimeout: 10 * time.Second,
	}

	logs.WithField("port", port).WithField("environment", environment).Info("ODH intake listening")
	if err := httpServer.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		logs.WithError(err).Fatal("http server stopped")
	}
}

func tooMany(c echo.Context, _ error) error {
	return c.JSON(http.StatusTooManyRequests, map[string]string{"error": "ส่งบ่อยเกินไป กรุณารอสักครู่"})
}

func tooManyDenied(c echo.Context, _ string, _ error) error {
	return tooMany(c, nil)
}

// openDB connects with the intake role. There is no migration here: the CRM
// owns the schema, and this role could not alter it anyway.
func openDB(environment string) (*gorm.DB, error) {
	cfg := core.PostgresConfig{
		Host:     env("POSTGRES_HOST", "localhost"),
		Port:     env("POSTGRES_PORT", "5432"),
		Username: env("POSTGRES_USERNAME", ""),
		Password: env("POSTGRES_PASSWORD", ""),
		Database: env("POSTGRES_DATABASE", ""),
		SSLMode:  env("POSTGRES_SSLMODE", "disable"),
		TimeZone: env("POSTGRES_TIMEZONE", "Asia/Bangkok"),
	}

	level := gormlogger.Warn
	if environment == "development" {
		level = gormlogger.Info
	}

	db, err := gorm.Open(postgres.Open(cfg.DSN()), &gorm.Config{
		Logger: gormlogger.Default.LogMode(level),
	})
	if err != nil {
		return nil, err
	}

	pool, err := db.DB()
	if err != nil {
		return nil, err
	}
	// The intake shares one small Droplet with Postgres and the CRM.
	pool.SetMaxOpenConns(5)
	pool.SetMaxIdleConns(2)
	pool.SetConnMaxLifetime(30 * time.Minute)
	return db, nil
}
