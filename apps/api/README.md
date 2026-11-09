# apps/api — ODH internal tools API

Go API behind the internal tools at `crm.owldayhouse.com`. Built to
`PROJECT_TEMPLATE.md` (Echo + GORM + Uber FX + Viper + Logrus + validator +
gormigrate + JWT) with two departures from it, both required by `CLAUDE.md`:

- **PostgreSQL 16** instead of MySQL (`gorm.io/driver/postgres`).
- **No e-mail at all.** No Gmail API, no OTP, no `requestRegister`, no
  `requestResetPassword`. The first admin comes from the CLI; that admin
  creates the sales accounts and resets their passwords. Contact e-mail
  addresses are stored as data, but nothing is ever sent.

Each tool is its own domain under its own route prefix — the Lead Tracker is
`/api/leads/...` — while auth, accounts and files are shared by every tool.

## Layout

```
main.go            entry point + CLI commands
config.go          environment -> core.Config
seeder.go          seed admin / create-user / seed-demo
pkg/core           Config structs
pkg/database       GORM client + gormigrate migrations
pkg/models         GORM model + Store interface per domain
pkg/store/<domain> GORM repository per domain
pkg/leadrules      the ownership and duplicate rules, as pure functions
pkg/handlers/api   Echo server, middleware, one *.handler.go per domain
pkg/services/storage  Cloudflare R2 (presigned upload/download)
pkg/utils          validator, dateutil, hashutil, str
```

## Commands

```bash
go run . serve          # start the API on $PORT (default 5000)
go run . up             # run the migrations and exit
go run . seed -username admin -name "ชื่อ นามสกุล"    # first admin
go run . create-user -username somchai -name "สมชาย" -role sales
go run . seed-demo      # demo leads (refuses to run in production)
```

Through the monorepo: `pnpm --filter api build | lint | test`.

## Tests

`pkg/leadrules` is tested as pure functions: name normalisation (Thai and
Latin legal forms), the `sales_existing` cut-off, who may change an owner, and
the `do_not_pitch` stage block.

`pkg/handlers/api/integration_test.go` drives the real HTTP handlers against a
**real PostgreSQL 16 with pg_trgm**, because the duplicate guard (a unique
index on `normalized_name`) and the similar-name warning (`similarity()`) are
database behaviour. With no database reachable the file skips, so
`go test ./...` stays green either way:

```bash
# any PostgreSQL 16 with CREATE EXTENSION rights
ODH_TEST_PG_HOST=127.0.0.1 ODH_TEST_PG_PORT=5432 \
ODH_TEST_PG_USERNAME=postgres ODH_TEST_PG_PASSWORD=postgres \
ODH_TEST_PG_DATABASE=odh_internal_test go test ./... -v
```

## Adding the next tool

1. `pkg/models/<domain>.go` — GORM struct + Store interface
2. `pkg/store/<domain>/<domain>.store.go` — the repository, with an `fx.Module`
3. `pkg/handlers/api/<domain>.handler.go` — the Echo handlers
4. add the model to `allModels()` in `pkg/database/migrate.go`
5. add the module to `storeModules()` in `main.go`, and the store to
   `api.Server` / `api.NewServer`
6. add a `register<Tool>Routes` call in `pkg/handlers/api/api.go`
