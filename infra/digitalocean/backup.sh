#!/usr/bin/env bash
#
# Nightly PostgreSQL backup to Cloudflare R2. Runs ON the Droplet from cron:
#
#   5 2 * * * /opt/odh-internal/backup.sh >> /var/log/odh-backup.log 2>&1
#
# Writes one custom-format dump per night to the backups/ prefix of
# R2_BACKUP_BUCKET. Keeping only 14 days is an R2 lifecycle rule on that
# prefix, not this script's job (see README.md).
set -euo pipefail

REMOTE_DIR="${ODH_REMOTE_DIR:-/opt/odh-internal}"
ENV_FILE="${REMOTE_DIR}/.env"
cd "$REMOTE_DIR"

# .env is read, not sourced. Sourcing it would run it: a value containing <, >,
# $ or a backtick — a generated password, say — would be interpreted by the
# shell instead of being read. docker compose does not expand these values
# either, so this matches how the rest of the stack reads the same file.
read_env() {
	local key="$1"
	local line
	line="$(grep -E "^[[:space:]]*${key}=" "$ENV_FILE" | tail -n 1)" || true
	line="${line#*=}"
	# Strip one layer of surrounding quotes, if any.
	line="${line%\"}"; line="${line#\"}"
	line="${line%\'}"; line="${line#\'}"
	printf '%s' "$line"
}

POSTGRES_USERNAME="$(read_env POSTGRES_USERNAME)"
POSTGRES_DATABASE="$(read_env POSTGRES_DATABASE)"
R2_ACCESS_KEY="$(read_env R2_ACCESS_KEY)"
R2_SECRET_KEY="$(read_env R2_SECRET_KEY)"
R2_ENDPOINT="$(read_env R2_ENDPOINT)"
R2_BACKUP_BUCKET="$(read_env R2_BACKUP_BUCKET)"

for required in POSTGRES_USERNAME POSTGRES_DATABASE R2_ACCESS_KEY R2_SECRET_KEY R2_ENDPOINT R2_BACKUP_BUCKET; do
	if [ -z "${!required}" ]; then
		echo "[$(date -Is)] ${required} is missing from ${ENV_FILE}" >&2
		exit 1
	fi
done

STAMP="$(TZ=Asia/Bangkok date +%Y%m%d-%H%M)"
NAME="odh_internal-${STAMP}.dump"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

echo "[$(date -Is)] dumping ${POSTGRES_DATABASE}"
# -Fc is the custom format: compressed, and pg_restore can read it selectively.
docker compose exec -T postgres \
  pg_dump -U "$POSTGRES_USERNAME" -d "$POSTGRES_DATABASE" -Fc > "${TMP}/${NAME}"

SIZE="$(stat -c %s "${TMP}/${NAME}")"
if [ "$SIZE" -lt 1024 ]; then
  echo "[$(date -Is)] the dump is only ${SIZE} bytes — refusing to upload it" >&2
  exit 1
fi

echo "[$(date -Is)] uploading ${NAME} (${SIZE} bytes) to r2://${R2_BACKUP_BUCKET}/backups/"
docker run --rm \
  -e AWS_ACCESS_KEY_ID="$R2_ACCESS_KEY" \
  -e AWS_SECRET_ACCESS_KEY="$R2_SECRET_KEY" \
  -e AWS_DEFAULT_REGION=auto \
  -v "${TMP}:/backup:ro" \
  amazon/aws-cli:latest \
  s3 cp "/backup/${NAME}" "s3://${R2_BACKUP_BUCKET}/backups/${NAME}" \
  --endpoint-url "$R2_ENDPOINT" \
  --checksum-algorithm CRC32

echo "[$(date -Is)] done: backups/${NAME}"
