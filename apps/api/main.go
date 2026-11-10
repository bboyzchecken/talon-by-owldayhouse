// Command odh-internal-api is the Owl Day House internal tools API.
//
// It follows PROJECT_TEMPLATE.md (Echo + GORM + Uber FX + Viper + Logrus +
// gormigrate + JWT) with two deliberate departures, both from CLAUDE.md:
// the database is PostgreSQL 16 rather than MySQL, and there is no e-mail
// anywhere — no Gmail API, no OTP, no self-registration.
//
// Tools live behind their own route prefix (`/api/leads/...` for the Lead
// Tracker); auth, accounts and files are shared.
//
// Commands:
//
//	odh-internal-api                    start the API on $PORT (default 5000)
//	odh-internal-api up                 run the database migrations and exit
//	odh-internal-api seed   [flags]     migrate, then create the first admin
//	odh-internal-api create-user [flags] create an account from the CLI
//	odh-internal-api seed-demo          load demo leads (non-production only)
package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"time"

	"github.com/joho/godotenv"
	"github.com/owldayhouse/odh-internal-api/pkg/core"
	"github.com/owldayhouse/odh-internal-api/pkg/database"
	"github.com/owldayhouse/odh-internal-api/pkg/handlers/api"
	"github.com/owldayhouse/odh-internal-api/pkg/logger"
	"github.com/owldayhouse/odh-internal-api/pkg/services/storage"
	storeactivity "github.com/owldayhouse/odh-internal-api/pkg/store/activity"
	storecontact "github.com/owldayhouse/odh-internal-api/pkg/store/contact"
	storedeal "github.com/owldayhouse/odh-internal-api/pkg/store/deal"
	storeegp "github.com/owldayhouse/odh-internal-api/pkg/store/egp"
	storefile "github.com/owldayhouse/odh-internal-api/pkg/store/file"
	storekpi "github.com/owldayhouse/odh-internal-api/pkg/store/kpi"
	storelead "github.com/owldayhouse/odh-internal-api/pkg/store/lead"
	storeownership "github.com/owldayhouse/odh-internal-api/pkg/store/ownership"
	storesetting "github.com/owldayhouse/odh-internal-api/pkg/store/setting"
	storetarget "github.com/owldayhouse/odh-internal-api/pkg/store/target"
	storeuser "github.com/owldayhouse/odh-internal-api/pkg/store/user"
	"github.com/sirupsen/logrus"
	"go.uber.org/fx"
	"gorm.io/gorm"
)

func main() {
	// .env is optional: in production the Droplet's compose file supplies the
	// environment directly.
	if err := godotenv.Load(".env"); err != nil && !os.IsNotExist(err) {
		log.Printf("no .env file loaded (%v) — reading the environment instead", err)
	}

	// Every date rule in this system (cut-off, KPI periods, "today") is
	// evaluated in Asia/Bangkok, so the process runs in that zone.
	if loc, err := time.LoadLocation("Asia/Bangkok"); err == nil {
		time.Local = loc
	}

	config := readConfig()

	command := ""
	if len(os.Args) > 1 {
		command = os.Args[1]
	}

	switch command {
	case "", "serve":
		runServer(config)
	case "up":
		runMigrations(config)
	case "seed":
		runSeedAdmin(config, os.Args[2:])
	case "create-user":
		runCreateUser(config, os.Args[2:])
	case "seed-demo":
		runSeedDemo(config)
	default:
		log.Fatalf("unknown command %q — use: serve | up | seed | create-user | seed-demo", command)
	}
}

// storeModules is every repository, so a new tool adds one line here.
func storeModules() fx.Option {
	return fx.Options(
		storeuser.Module,
		storesetting.Module,
		storefile.Module,
		storelead.Module,
		storecontact.Module,
		storeactivity.Module,
		storedeal.Module,
		storetarget.Module,
		storeownership.Module,
		storekpi.Module,
		storeegp.Module,
	)
}

// runServer boots the FX app and serves HTTP until interrupted.
func runServer(config core.Config) {
	if config.JwtSecret == "" {
		log.Fatal("JWT_SECRET_KEY is required")
	}

	app := fx.New(
		fx.Supply(config),
		fx.Provide(func(c core.Config) *logrus.Logger { return logger.New(c.Environment) }),
		fx.Provide(database.New),
		storeModules(),
		storage.Module,
		fx.Provide(api.NewServer),
		fx.Invoke(runInternalToolsAPI),
		// FX's own startup chatter adds nothing: Logrus already logs the boot.
		fx.NopLogger,
	)
	app.Run()
}

// runInternalToolsAPI migrates, then starts Echo on the configured port and
// shuts it down gracefully when FX stops.
func runInternalToolsAPI(
	lifecycle fx.Lifecycle,
	config core.Config,
	log *logrus.Logger,
	db *gorm.DB,
	server *api.Server,
) {
	e := server.Handler()
	httpServer := &http.Server{
		Addr:              ":" + config.Port,
		Handler:           e,
		ReadHeaderTimeout: 10 * time.Second,
	}

	lifecycle.Append(fx.Hook{
		OnStart: func(context.Context) error {
			if err := database.Migrate(db); err != nil {
				return err
			}
			log.WithFields(logrus.Fields{
				"port":        config.Port,
				"environment": config.Environment,
				"commit":      config.Commit,
			}).Info("ODH internal tools API listening")

			go func() {
				if err := httpServer.ListenAndServe(); err != nil && err != http.ErrServerClosed {
					log.WithError(err).Fatal("http server stopped")
				}
			}()
			return nil
		},
		OnStop: func(ctx context.Context) error {
			log.Info("shutting down")
			return httpServer.Shutdown(ctx)
		},
	})
}

// runMigrations is the `up` command.
func runMigrations(config core.Config) {
	log := logger.New(config.Environment)
	db, err := database.New(config, log)
	if err != nil {
		log.WithError(err).Fatal("cannot connect to PostgreSQL")
	}
	if err := database.Migrate(db); err != nil {
		log.WithError(err).Fatal("migrations failed")
	}
	log.Info("migrations are up to date")
}
