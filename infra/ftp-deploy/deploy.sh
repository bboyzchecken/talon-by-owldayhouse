#!/usr/bin/env bash
#
# Deploy the static export (apps/web/out) to an FTP host via `lftp mirror`.
# Credentials come from the environment — never hardcode them here.
#
#   FTP_HOST        ftp host (e.g. ftp.yourhost.com)   [required]
#   FTP_USER        ftp username                        [required]
#   FTP_PASS        ftp password                        [required]
#   FTP_REMOTE_DIR  remote target dir (e.g. /public_html, default "/")
#   FTP_PORT        ftp port (default 21)
#   FTP_PROTO       "ftp" (default) or "ftps" for FTP over TLS
#
# Usage:  pnpm build:web && bash infra/ftp-deploy/deploy.sh
#    or:  pnpm deploy:web

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
LOCAL_DIR="$REPO_ROOT/apps/web/out"

# Load env from infra/ftp-deploy/.env or repo-root .env if present (not committed).
for env_file in "$SCRIPT_DIR/.env" "$REPO_ROOT/.env"; do
  if [ -f "$env_file" ]; then
    echo "→ loading env from $env_file"
    set -a
    # shellcheck disable=SC1090
    . "$env_file"
    set +a
  fi
done

FTP_REMOTE_DIR="${FTP_REMOTE_DIR:-/}"
FTP_PORT="${FTP_PORT:-21}"
FTP_PROTO="${FTP_PROTO:-ftp}"

# --- preflight checks ---
fail() { echo "✗ $1" >&2; exit 1; }

# --- the quote form's build-time values ---
# NEXT_PUBLIC_* is inlined into the bundle, so a placeholder left in .env ships
# to every visitor and there is no runtime to catch it. One did: the literal
# "<Site Key จาก Cloudflare Turnstile>" went out as the Turnstile site key, the
# form switched itself to Turnstile while the intake was on ALTCHA, and no
# quote request could be sent at all. The site now ignores a value that is not
# shaped like a key, and this refuses to ship one in the first place.
if [ -n "${NEXT_PUBLIC_TURNSTILE_SITE_KEY:-}" ]; then
  case "$NEXT_PUBLIC_TURNSTILE_SITE_KEY" in
    0x????????????????*) ;;
    *) fail "NEXT_PUBLIC_TURNSTILE_SITE_KEY is not a Turnstile site key: '$NEXT_PUBLIC_TURNSTILE_SITE_KEY'.
    A real one starts with 0x (e.g. 0x4AAAAAAABkMYinukE8nzYS). Leave it EMPTY to
    use ALTCHA, our own bot check — that is what the intake runs unless the
    Droplet has TURNSTILE_SECRET set." ;;
  esac
fi

command -v lftp >/dev/null 2>&1 || fail "lftp not found. Install it (macOS: brew install lftp · Debian/Ubuntu: apt-get install lftp)."

missing=()
[ -n "${FTP_HOST:-}" ] || missing+=("FTP_HOST")
[ -n "${FTP_USER:-}" ] || missing+=("FTP_USER")
[ -n "${FTP_PASS:-}" ] || missing+=("FTP_PASS")
if [ ${#missing[@]} -gt 0 ]; then
  fail "missing env: ${missing[*]} — set them or copy infra/ftp-deploy/.env.example to .env"
fi

[ -d "$LOCAL_DIR" ] || fail "build output not found at $LOCAL_DIR — run 'pnpm build:web' first."
[ -f "$LOCAL_DIR/index.html" ] || fail "$LOCAL_DIR has no index.html — the build looks incomplete."

if [ -n "${NEXT_PUBLIC_INTAKE_URL:-}" ]; then
  case "$NEXT_PUBLIC_INTAKE_URL" in
    https://*) ;;
    *) fail "NEXT_PUBLIC_INTAKE_URL must be an https origin with no trailing slash (e.g. https://api.owldayhouse.com), got '$NEXT_PUBLIC_INTAKE_URL'." ;;
  esac
fi

# --- .htaccess: upload it only when it differs from the server's ---
# LiteSpeed caches .htaccess until the host restarts it, so re-sending an identical
# file every deploy just hides which deploy actually changed the rules.
lftp_opts="set cmd:fail-exit yes;
set net:max-retries 2;
set ftp:ssl-allow $([ "$FTP_PROTO" = "ftps" ] && echo yes || echo no);
set ssl:verify-certificate no;
open -p $FTP_PORT -u \"$FTP_USER\",\"$FTP_PASS\" \"$FTP_PROTO://$FTP_HOST\";"

htaccess_exclude=""
htaccess_changed="no"
if [ -f "$LOCAL_DIR/.htaccess" ]; then
  remote_htaccess="$(mktemp)"
  lftp -c "$lftp_opts get \"${FTP_REMOTE_DIR%/}/.htaccess\" -o \"$remote_htaccess\"; bye" >/dev/null 2>&1 || true
  if cmp -s "$remote_htaccess" "$LOCAL_DIR/.htaccess"; then
    htaccess_exclude="--exclude-glob .htaccess"
    echo "→ .htaccess unchanged on the server — skipping it"
  else
    htaccess_changed="yes"
    echo "→ .htaccess differs from the server's — uploading it"
  fi
  rm -f "$remote_htaccess"
fi

file_count="$(find "$LOCAL_DIR" -type f | wc -l | tr -d ' ')"
echo "→ uploading $file_count files"
echo "  from: $LOCAL_DIR"
echo "  to:   $FTP_PROTO://$FTP_HOST:$FTP_PORT$FTP_REMOTE_DIR"

# --- mirror (reverse = local→remote), delete stale remote files ---
lftp -c "
set cmd:fail-exit yes;
set net:max-retries 2;
set ftp:ssl-allow $([ "$FTP_PROTO" = "ftps" ] && echo yes || echo no);
set ssl:verify-certificate no;
open -p $FTP_PORT -u \"$FTP_USER\",\"$FTP_PASS\" \"$FTP_PROTO://$FTP_HOST\";
mirror --reverse --delete --parallel=4 --verbose \
  --exclude-glob .DS_Store \
  --exclude-glob *.map \
  $htaccess_exclude \
  \"$LOCAL_DIR/\" \"$FTP_REMOTE_DIR\";
bye
"

echo "✓ deploy complete — $file_count files synced to $FTP_HOST$FTP_REMOTE_DIR"
if [ "$htaccess_changed" = "yes" ]; then
  echo "! .htaccess changed. Ask the host to restart LiteSpeed, or it keeps serving the old rules."
fi
echo "  next: open https://owldayhouse.com/ and verify, then (re)submit the sitemap in Google Search Console."
