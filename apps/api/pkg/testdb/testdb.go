// Package testdb is for tests that use the shared PostgreSQL test database.
//
// `go test ./...` runs packages in parallel, and several packages clear and
// fill the same database. Lock makes each such test wait for the others, so
// one package's TRUNCATE never runs into another's test.
package testdb

import (
	"context"
	"testing"

	"gorm.io/gorm"
)

const lockKey = 4242017

// Lock holds a PostgreSQL advisory lock for the rest of the test. It takes a
// connection of its own, because an advisory lock belongs to a session.
func Lock(t testing.TB, db *gorm.DB) {
	t.Helper()
	pool, err := db.DB()
	if err != nil {
		t.Fatalf("testdb: %v", err)
	}
	ctx := context.Background()
	conn, err := pool.Conn(ctx)
	if err != nil {
		t.Fatalf("testdb: %v", err)
	}
	if _, err := conn.ExecContext(ctx, `SELECT pg_advisory_lock($1)`, lockKey); err != nil {
		_ = conn.Close()
		t.Fatalf("testdb: %v", err)
	}
	t.Cleanup(func() {
		_, _ = conn.ExecContext(ctx, `SELECT pg_advisory_unlock($1)`, lockKey)
		_ = conn.Close()
	})
}
