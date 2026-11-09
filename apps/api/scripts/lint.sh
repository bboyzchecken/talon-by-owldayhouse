#!/usr/bin/env bash
# Lint for the Go API: gofmt must be clean, then go vet.
# Called by `pnpm lint` through Turborepo.
set -euo pipefail

cd "$(dirname "$0")/.."

unformatted="$(gofmt -l . || true)"
if [ -n "$unformatted" ]; then
  echo "gofmt needs to run on:" >&2
  echo "$unformatted" >&2
  exit 1
fi

go vet ./...
