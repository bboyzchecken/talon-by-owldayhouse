// Package logger wires Logrus for the API and exposes an Echo request logger.
package logger

import (
	"os"

	"github.com/sirupsen/logrus"
)

// New returns the process logger. Production logs JSON so the Droplet's
// `docker compose logs` stays machine-readable; development logs plain text.
func New(environment string) *logrus.Logger {
	log := logrus.New()
	log.SetOutput(os.Stdout)

	if environment == "production" {
		log.SetFormatter(&logrus.JSONFormatter{TimestampFormat: "2006-01-02T15:04:05Z07:00"})
		log.SetLevel(logrus.InfoLevel)
		return log
	}

	log.SetFormatter(&logrus.TextFormatter{FullTimestamp: true})
	log.SetLevel(logrus.DebugLevel)
	return log
}
