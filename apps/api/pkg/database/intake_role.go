package database

import (
	"errors"
	"fmt"
	"strings"

	"gorm.io/gorm"
	gormlogger "gorm.io/gorm/logger"
)

// IntakeRole is the PostgreSQL role the public intake service connects as.
const IntakeRole = "odh_intake"

// EnsureIntakeRole creates or updates the intake service's role and resets its
// privileges to exactly what the public quote form needs: INSERT into
// inbound_requests and the sequence behind its id. No SELECT, no UPDATE, no
// other table. It is safe to run on every boot; a changed password takes
// effect the next time the intake connects.
//
// The CRM runs this because it owns the schema and connects as the database
// owner. The intake could not grant itself anything.
func EnsureIntakeRole(db *gorm.DB, database, password string) error {
	if len(password) < 16 {
		return errors.New("INTAKE_POSTGRES_PASSWORD must be at least 16 characters")
	}
	if strings.ContainsAny(password, "\x00\n\r") {
		return errors.New("INTAKE_POSTGRES_PASSWORD may not contain control characters")
	}
	// ALTER ROLE takes no bind parameters, so the password is a literal.
	// standard_conforming_strings is on by default since PostgreSQL 9.1,
	// which makes doubling single quotes the whole escape.
	literal := "'" + strings.ReplaceAll(password, "'", "''") + "'"
	dbIdent := `"` + strings.ReplaceAll(database, `"`, `""`) + `"`

	// The password is inside the SQL text, and development logs every
	// statement. This one is never logged.
	quiet := db.Session(&gorm.Session{Logger: db.Logger.LogMode(gormlogger.Silent)})

	return quiet.Transaction(func(tx *gorm.DB) error {
		var exists bool
		if err := tx.Raw(`SELECT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = ?)`, IntakeRole).
			Scan(&exists).Error; err != nil {
			return err
		}
		verb := "ALTER"
		if !exists {
			verb = "CREATE"
		}

		statements := []string{
			fmt.Sprintf(`%s ROLE %s WITH LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION CONNECTION LIMIT 5 PASSWORD %s`,
				verb, IntakeRole, literal),
			// Start from nothing every time, so a grant added by hand does
			// not quietly survive.
			fmt.Sprintf(`REVOKE ALL ON ALL TABLES IN SCHEMA public FROM %s`, IntakeRole),
			fmt.Sprintf(`REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM %s`, IntakeRole),
			fmt.Sprintf(`GRANT CONNECT ON DATABASE %s TO %s`, dbIdent, IntakeRole),
			fmt.Sprintf(`GRANT USAGE ON SCHEMA public TO %s`, IntakeRole),
			fmt.Sprintf(`GRANT INSERT ON inbound_requests TO %s`, IntakeRole),
			fmt.Sprintf(`GRANT USAGE ON SEQUENCE inbound_requests_id_seq TO %s`, IntakeRole),
		}
		for _, statement := range statements {
			if err := tx.Exec(statement).Error; err != nil {
				return err
			}
		}
		return nil
	})
}
