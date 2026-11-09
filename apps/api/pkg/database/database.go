// Package database builds the GORM client and runs the migrations.
package database

import (
	"time"

	"github.com/owldayhouse/odh-internal-api/pkg/core"
	"github.com/sirupsen/logrus"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	gormlogger "gorm.io/gorm/logger"
)

// New opens the PostgreSQL connection and sizes the pool. The pool is small on
// purpose: the API shares a 1 vCPU / 2 GB Droplet with Postgres itself, whose
// max_connections is tuned down to match (infra/digitalocean/README.md).
func New(config core.Config, log *logrus.Logger) (*gorm.DB, error) {
	level := gormlogger.Warn
	if config.Environment != "production" {
		level = gormlogger.Info
	}

	db, err := gorm.Open(postgres.Open(config.Postgres.DSN()), &gorm.Config{
		Logger: gormlogger.New(log, gormlogger.Config{
			SlowThreshold:             300 * time.Millisecond,
			LogLevel:                  level,
			IgnoreRecordNotFoundError: true,
		}),
		NowFunc: func() time.Time { return time.Now().In(time.Local) },
	})
	if err != nil {
		return nil, err
	}

	pool, err := db.DB()
	if err != nil {
		return nil, err
	}
	pool.SetMaxOpenConns(config.Postgres.MaxOpenConns)
	pool.SetMaxIdleConns(config.Postgres.MaxIdleConns)
	pool.SetConnMaxLifetime(config.Postgres.ConnMaxLifetime)

	return db, nil
}
