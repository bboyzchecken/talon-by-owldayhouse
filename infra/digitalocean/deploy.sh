#!/usr/bin/env bash
#
# Deploy the ODH internal tools to the DigitalOcean Droplet.
#
# Run it from a development machine, not from the Droplet: the static UI is
# built here, because a Next build on a 1 vCPU / 2 GB box next to a running
# PostgreSQL is asking for an out-of-memory kill.
#
#   ODH_DROPLET_HOST=203.0.113.10 bash infra/digitalocean/deploy.sh
#
# What it does:
#   1. builds apps/internal to a static export
#   2. copies that export, the apps/api source and the compose files over
#   3. rebuilds and restarts the API container on the Droplet
#   4. waits for /healthz to answer
#
# It never touches .env on the server; secrets live there and only there.
set -euo pipefail

HOST="${ODH_DROPLET_HOST:?set ODH_DROPLET_HOST to the Droplet IP or hostname}"
USER="${ODH_DROPLET_USER:-root}"
REMOTE_DIR="${ODH_REMOTE_DIR:-/opt/odh-internal}"
DOMAIN="${ODH_DOMAIN:-crm.owldayhouse.com}"
SSH_TARGET="${USER}@${HOST}"

REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$REPO_ROOT"

COMMIT="$(git rev-parse --short HEAD 2>/dev/null || echo unknown)"

say() { printf '\n\033[1m==> %s\033[0m\n' "$1"; }

say "Checking the tree is clean enough to deploy"
if [ -n "$(git status --porcelain 2>/dev/null)" ]; then
  echo "warning: uncommitted changes — deploying the working tree as it is." >&2
fi

say "Building the static UI (apps/internal)"
# NEXT_PUBLIC_* values are baked into the bundle at build time, so the API
# origin has to be set HERE, not on the server. Without it the build falls
# back to http://localhost:5000 and the deployed app talks to the visitor's
# own machine. Caddy serves the UI and the API on this one host, so pointing
# it at the site's own origin keeps every request same-origin.
export NEXT_PUBLIC_API_URL="https://${DOMAIN}"
pnpm install --frozen-lockfile
pnpm --filter internal build
test -f apps/internal/out/index.html || {
  echo "the export is missing apps/internal/out/index.html" >&2
  exit 1
}

say "Making sure ${REMOTE_DIR} exists on ${HOST}"
ssh "$SSH_TARGET" "mkdir -p '${REMOTE_DIR}/api' '${REMOTE_DIR}/web'"

say "Copying the compose files"
rsync -az --delete \
  infra/digitalocean/docker-compose.yml \
  infra/digitalocean/Caddyfile \
  infra/digitalocean/backup.sh \
  "${SSH_TARGET}:${REMOTE_DIR}/"

say "Copying the API source"
rsync -az --delete \
  --exclude '.env' \
  --exclude 'bin/' \
  --exclude 'node_modules/' \
  apps/api/ "${SSH_TARGET}:${REMOTE_DIR}/api/"

say "Copying the exported UI"
rsync -az --delete apps/internal/out/ "${SSH_TARGET}:${REMOTE_DIR}/web/"

say "Rebuilding and restarting on the Droplet"
ssh "$SSH_TARGET" "cd '${REMOTE_DIR}' && COMMIT='${COMMIT}' docker compose up -d --build && docker image prune -f >/dev/null"

say "Waiting for the API to answer"
# Ask Docker for the API container's own healthcheck (it curls /healthz inside
# the container). Checking through Caddy over plain HTTP would only ever see
# Caddy's redirect to HTTPS, which says nothing about the API.
REMOTE_CHECK="cd ${REMOTE_DIR} && docker inspect --format {{.State.Health.Status}} \$(docker compose ps -q api)"
for _ in $(seq 1 45); do
  status="$(ssh "$SSH_TARGET" "$REMOTE_CHECK" 2>/dev/null || true)"
  if [ "$status" = "healthy" ]; then
    say "Deployed. https://${DOMAIN} is serving commit ${COMMIT}."
    exit 0
  fi
  sleep 2
done

echo "the API did not become healthy — check: ssh ${SSH_TARGET} 'cd ${REMOTE_DIR} && docker compose logs --tail=100 api'" >&2
exit 1
