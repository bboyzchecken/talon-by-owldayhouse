package core

import (
	"strings"
	"testing"
)

func baseConfig() PostgresConfig {
	return PostgresConfig{
		Host:     "127.0.0.1",
		Port:     "5432",
		Username: "odh",
		Database: "odh_internal",
		SSLMode:  "disable",
		TimeZone: "Asia/Bangkok",
	}
}

// An empty password must be left out, not written bare. Written bare,
// `password= dbname=odh_internal` parses as a password of "dbname=odh_internal"
// and no database at all, because the parser skips the whitespace after `=`.
// The connection then lands on the driver's default database — and an empty
// password is the normal local-development case.
func TestPostgresDSNOmitsEmptyValues(t *testing.T) {
	dsn := baseConfig().DSN()

	if strings.Contains(dsn, "password") {
		t.Errorf("an empty password must be omitted entirely\ngot: %s", dsn)
	}
	for _, want := range []string{
		"host=127.0.0.1",
		"port=5432",
		"user=odh",
		"dbname=odh_internal",
		"sslmode=disable",
	} {
		if !strings.Contains(dsn, want) {
			t.Errorf("DSN is missing %s\ngot: %s", want, dsn)
		}
	}
}

// The driver hands runtime parameters to the server verbatim, so a value that
// needs no quotes must not get any: the server rejects "'Asia/Bangkok'".
func TestPostgresDSNLeavesPlainValuesUnquoted(t *testing.T) {
	dsn := baseConfig().DSN()

	if !strings.Contains(dsn, "TimeZone=Asia/Bangkok") {
		t.Errorf("TimeZone must be unquoted\ngot: %s", dsn)
	}
	if strings.Contains(dsn, "'") {
		t.Errorf("nothing here needs quoting\ngot: %s", dsn)
	}
}

func TestPostgresDSNQuotesAndEscapesAwkwardPasswords(t *testing.T) {
	config := baseConfig()
	config.Password = `it's a \ hard one`

	dsn := config.DSN()

	if !strings.Contains(dsn, `password='it\'s a \\ hard one'`) {
		t.Errorf("the password is not quoted and escaped\ngot: %s", dsn)
	}
	// Whatever the password contains, the keywords after it survive.
	if !strings.Contains(dsn, "dbname=odh_internal") {
		t.Errorf("dbname was swallowed\ngot: %s", dsn)
	}
}

func TestPostgresDSNKeepsASimplePasswordUnquoted(t *testing.T) {
	config := baseConfig()
	config.Password = "s3cret-token"

	if !strings.Contains(config.DSN(), "password=s3cret-token") {
		t.Errorf("a simple password needs no quotes\ngot: %s", config.DSN())
	}
}
