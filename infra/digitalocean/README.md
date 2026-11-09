# infra/digitalocean — the internal tools server

The ODH internal tools (`apps/api` + `apps/internal`) run on one DigitalOcean
Droplet (12 USD: 1 vCPU, 2 GB RAM) at **crm.owldayhouse.com**. Not AWS — the
`infra/aws` notes are for the old plan and do not apply here.

```
                 https://crm.owldayhouse.com
                            │
                    ┌───────▼────────┐   ports 80/443 only
                    │     Caddy      │   HTTPS, auto-renewing cert
                    └───┬────────┬───┘
         /api, /auth,   │        │   everything else
         /healthz       │        │
                 ┌──────▼───┐  ┌─▼──────────────┐
                 │ Go API   │  │ /srv  (static  │
                 │  :5000   │  │ export of      │
                 └────┬─────┘  │ apps/internal) │
                      │        └────────────────┘
               ┌──────▼──────┐
               │ PostgreSQL  │  never published to the host
               │     16      │
               └─────────────┘
```

Files and uploads are **not** on this box: they live in Cloudflare R2 and the
browser talks to R2 directly through presigned URLs.

### What you need on your own machine

`deploy.sh` runs from a development machine, not from the Droplet, and needs
`pnpm`, `ssh` and `rsync` on the PATH (macOS and most Linux have rsync; on a
bare Debian image, `apt install rsync`).

---

## 0. Creating the Droplet

Control-panel labels change; the values in the table are what matter.

### 0.1 Your SSH key (on your Mac)

```bash
ssh-keygen -t ed25519 -C "<your-name>@odh"          # set a passphrase
ssh-add --apple-use-keychain ~/.ssh/id_ed25519      # remember it in Keychain
pbcopy < ~/.ssh/id_ed25519.pub                      # copy the PUBLIC key
```

Only ever paste the `.pub` file anywhere. The file without `.pub` is the
private key and never leaves the Mac.

### 0.2 The Droplet (DigitalOcean control panel)

**Create → Droplets**, then:

| Setting | Value |
|---|---|
| Region | Singapore (SGP1) — the closest to Thailand |
| Image | Ubuntu 24.04 (LTS) x64 |
| Size | Basic · Regular (SSD) · **2 GB RAM / 1 vCPU** (the 12 USD plan) |
| Authentication | **SSH Key** — "New SSH Key", paste the public key from 0.1 |
| Monitoring | on (free metrics and alerts) |
| Backups | optional — weekly whole-server snapshots, extra cost; the nightly `pg_dump` to R2 is the backup that matters |
| Hostname | `odh-crm` |

Do not pick password authentication. Once created, note the **ipv4**
address; it is `<droplet-ip>` everywhere below.

Optional: assign a **Reserved IP** (free while attached) and point DNS at
that instead. Rebuilding the Droplet then never needs a DNS change.

### 0.3 A shortcut on the Mac

```bash
cat >> ~/.ssh/config <<'EOF'

Host odh-crm
  HostName <droplet-ip>
  User root
  UseKeychain yes
  AddKeysToAgent yes
  IdentityFile ~/.ssh/id_ed25519
EOF
ssh odh-crm 'hostname && uptime'
```

---

## 1. First-time setup

Everything below runs on the Droplet as root unless it says otherwise.

### 1.1 SSH by key only

From your own machine, if the Droplet was not created with your key already:

```bash
ssh-copy-id root@<droplet-ip>
```

Then on the Droplet. Use a drop-in file rather than editing `sshd_config`:
on Ubuntu, cloud-init's `sshd_config.d/50-cloud-init.conf` can set
`PasswordAuthentication yes`, and sshd keeps the first value it reads, so an
edit to the main file may silently do nothing. `00-` sorts first.

```bash
cat > /etc/ssh/sshd_config.d/00-odh-hardening.conf <<'EOF'
PasswordAuthentication no
KbdInteractiveAuthentication no
PermitRootLogin prohibit-password
EOF
sshd -t && systemctl reload ssh
sshd -T | grep -E '^(passwordauthentication|permitrootlogin)'
```

Expect `passwordauthentication no` and `permitrootlogin without-password`.
Keep the existing session open until a second one logs in with the key.

### 1.1b Time zone

The Droplet starts on UTC. Set it to Bangkok so the 02:05 backup runs at
night here and not at 09:05:

```bash
timedatectl set-timezone Asia/Bangkok
```

### 1.2 Firewall: 22, 80, 443 and nothing else

```bash
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable
ufw status verbose
```

PostgreSQL is never published to the host (`expose:`, not `ports:` in
`docker-compose.yml`), so there is no 5432 rule to add — and if someone adds
`ports:` by accident, UFW still refuses it from outside.

> Docker can write its own iptables rules that bypass UFW for *published*
> ports. The only published ports here are 80 and 443, which UFW allows
> anyway, so the two agree.

### 1.3 Swap: 2 GB

2 GB of RAM with PostgreSQL, the API and Caddy on it is comfortable, but a
`docker compose build` is not. Swap keeps a build from killing the database.

```bash
fallocate -l 2G /swapfile
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab
sysctl -w vm.swappiness=10
echo 'vm.swappiness=10' > /etc/sysctl.d/99-odh-swappiness.conf
free -h
```

### 1.4 Docker

```bash
curl -fsSL https://get.docker.com | sh
docker compose version
```

### 1.5 The deploy user, the application directory and its secrets

Deploys — from a Mac or from GitHub Actions — run as one non-root user,
`deploy`, which owns `/opt/odh-internal` and may use Docker. Being in the
`docker` group is root-equivalent on this box, so treat the `deploy` key
with the same care as root's.

```bash
adduser --disabled-password --gecos "" deploy
usermod -aG docker deploy                     # after Docker is installed (1.4)
install -d -m 700 -o deploy -g deploy /home/deploy/.ssh
cp /root/.ssh/authorized_keys /home/deploy/.ssh/authorized_keys   # your Mac key
chown deploy:deploy /home/deploy/.ssh/authorized_keys
chmod 600 /home/deploy/.ssh/authorized_keys

install -d -o deploy -g deploy /opt/odh-internal
install -m 600 -o deploy -g deploy /dev/null /opt/odh-internal/.env
nano /opt/odh-internal/.env     # start from infra/digitalocean/.env.example
```

`.env` has to belong to `deploy`: docker compose runs as that user and reads
it. Check from the Mac that `ssh deploy@<droplet-ip> 'docker ps'` works.

Fill in at least `ODH_DOMAIN`, `JWT_SECRET_KEY` (`openssl rand -base64 48`),
`POSTGRES_PASSWORD` and the four `R2_*` values. **`.env` is never committed
and never leaves the server.**

### 1.6 Cloudflare R2

Create two **private** buckets:

| Bucket | What is in it |
|---|---|
| `odh-internal-files` | lead attachments (quotes, briefs, booth photos) |
| `odh-internal-backups` | the nightly `pg_dump`, under `backups/` |

Create an **R2 API token scoped to those two buckets only**, with Object Read
& Write. Nothing else in the Cloudflare account should be reachable with it.
Put its id and secret in `R2_ACCESS_KEY` / `R2_SECRET_KEY`.

On `odh-internal-backups`, add a lifecycle rule: prefix `backups/`, delete
objects **14 days** after creation. That, not the backup script, is what
keeps two weeks of history.

Neither bucket gets public access or a custom domain. The API hands out
presigned URLs that expire after 15 minutes. Presigned URLs only work on the
`<account-id>.r2.cloudflarestorage.com` endpoint, so do not put a custom
domain in `R2_ENDPOINT`.

**`odh-internal-files` needs a CORS policy.** The browser uploads straight to
R2 with a presigned `PUT`, and without CORS the browser blocks it — every
upload fails with a network error even though the URL is valid. On the
bucket's **Settings → CORS Policy → Add CORS policy**, paste:

```json
[
  {
    "AllowedOrigins": ["https://crm.owldayhouse.com"],
    "AllowedMethods": ["PUT", "GET", "HEAD"],
    "AllowedHeaders": ["Content-Type"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }
]
```

The origin is exactly `https://crm.owldayhouse.com` — no trailing slash, no
path. The dashboard takes this flat array; `wrangler r2 bucket cors set`
wants a different shape. `odh-internal-backups` needs no CORS: only the
server talks to it.

### 1.7 DNS

`owldayhouse.com` is currently hosted at the web host the main site is on,
not at Cloudflare. Add one record there:

| Type | Name | Value | TTL |
|---|---|---|---|
| A | `crm` | the Droplet's IPv4 | 300 (raise it later) |

Caddy then gets the certificate itself over HTTP-01 the first time it starts.
Check the record has spread before deploying:

```bash
dig +short crm.owldayhouse.com
```

**If the domain is moved to Cloudflare later**, one of these:

- **Simplest — leave the record grey (DNS only).** In the Cloudflare DNS tab
  click the orange cloud on the `crm` record so it turns grey. Traffic goes
  straight to the Droplet, HTTP-01 keeps working and nothing here changes.
- **Orange cloud (proxied).** Cloudflare terminates TLS itself, so HTTP-01
  cannot reach Caddy and the certificate stops renewing. Then Caddy has to
  use the DNS-01 challenge, which needs a Caddy build with the Cloudflare
  plugin — the stock `caddy:2-alpine` image does not have it. Replace the
  `caddy` service's `image:` with a small build:

  ```dockerfile
  FROM caddy:2-builder AS builder
  RUN xcaddy build --with github.com/caddy-dns/cloudflare
  FROM caddy:2-alpine
  COPY --from=builder /usr/bin/caddy /usr/bin/caddy
  ```

  add `CLOUDFLARE_API_TOKEN` (Zone → DNS → Edit, for this zone only) to
  `.env`, and in the `Caddyfile` add inside the site block:

  ```
  tls {
      dns cloudflare {env.CLOUDFLARE_API_TOKEN}
  }
  ```

  Set the Cloudflare SSL mode to **Full (strict)**, never Flexible.

### 1.8 First deploy

From your own machine, in the repository. It connects as `deploy` (set
`ODH_DROPLET_USER` to override):

```bash
ODH_DROPLET_HOST=<droplet-ip> bash infra/digitalocean/deploy.sh
```

After this, deploys normally happen from GitHub Actions — section 5.

### 1.9 The first admin, then the sales accounts

There is no e-mail anywhere in this system, so the first admin is created on
the server and that admin creates everyone else.

```bash
ssh deploy@<droplet-ip>
cd /opt/odh-internal
docker compose exec api ./odh-internal-api seed \
  -username admin -name "ชื่อ นามสกุล"
```

It prints a generated password once — copy it, it is not shown again and
nothing is e-mailed. Then either add the three sales accounts from the Admin
screen in the browser, or from here:

```bash
docker compose exec api ./odh-internal-api create-user \
  -username <username> -name "ชื่อ นามสกุล" -role sales
```

Finally, sign in at `https://crm.owldayhouse.com` and set the cut-off date on
**Admin → วันหมดเขต** (the migration seeds `2026-12-31`).

### 1.10 The nightly backup

```bash
chmod +x /opt/odh-internal/backup.sh
crontab -e
```

```cron
5 2 * * * /opt/odh-internal/backup.sh >> /var/log/odh-backup.log 2>&1
```

02:05 server time. Run it once by hand first and check the object appears in
R2.

---

## 2. Deploying a change

Normally: merge to `main`. GitHub Actions tests and deploys (section 5).
By hand, from a Mac, when Actions is unavailable:

```bash
ODH_DROPLET_HOST=<droplet-ip> bash infra/digitalocean/deploy.sh
```

The script builds `apps/internal` **locally** (a Next build on 1 vCPU next to
a running PostgreSQL is what the swap file is there for, but it is still slow
and best avoided), copies the export, the `apps/api` source and the compose
files up, rebuilds the API image on the Droplet and waits for `/healthz`.

Database migrations run automatically when the API starts, so a schema change
needs no extra step. To run them without starting the server:

```bash
docker compose exec api ./odh-internal-api up
```

---

## 3. Backup and restore

### What is backed up

`backup.sh` writes one `pg_dump -Fc` (custom format, compressed) per night to
`s3://odh-internal-backups/backups/odh_internal-YYYYMMDD-HHMM.dump`. The R2
lifecycle rule deletes anything older than 14 days.

Uploaded **files** are not in the dump — they already live in R2, in a
separate bucket, and are not touched by a database restore.

### Checking the backups

```bash
docker run --rm \
  -e AWS_ACCESS_KEY_ID=$R2_ACCESS_KEY -e AWS_SECRET_ACCESS_KEY=$R2_SECRET_KEY \
  -e AWS_DEFAULT_REGION=auto amazon/aws-cli:latest \
  s3 ls s3://odh-internal-backups/backups/ --endpoint-url $R2_ENDPOINT
```

### Restoring

On the Droplet, in `/opt/odh-internal`, with `.env` loaded
(`set -a; . ./.env; set +a`):

```bash
# 1. fetch the dump you want
mkdir -p /tmp/restore && cd /tmp/restore
docker run --rm \
  -e AWS_ACCESS_KEY_ID=$R2_ACCESS_KEY -e AWS_SECRET_ACCESS_KEY=$R2_SECRET_KEY \
  -e AWS_DEFAULT_REGION=auto -v /tmp/restore:/restore amazon/aws-cli:latest \
  s3 cp s3://odh-internal-backups/backups/<file>.dump /restore/ \
  --endpoint-url $R2_ENDPOINT

# 2. stop the API so nothing writes while the data is replaced
cd /opt/odh-internal && docker compose stop api

# 3. restore into the live database, replacing what is there
docker compose exec -T postgres \
  pg_restore -U "$POSTGRES_USERNAME" -d "$POSTGRES_DATABASE" \
  --clean --if-exists --no-owner < /tmp/restore/<file>.dump

# 4. start the API again (it re-runs migrations on boot)
docker compose start api
docker compose logs -f --tail=50 api
```

To rehearse a restore without touching live data, create a scratch database
first (`docker compose exec postgres createdb -U "$POSTGRES_USERNAME"
odh_restore_test`) and point `pg_restore -d odh_restore_test` at it.

---

## 4. Day to day

```bash
cd /opt/odh-internal

docker compose ps                       # what is running
docker compose logs -f --tail=100 api   # API logs (JSON in production)
docker compose logs -f --tail=100 caddy # certificate and HTTP logs
docker compose restart api              # restart just the API
# NEVER `docker compose down -v` or `docker volume prune`: -v deletes the
# PostgreSQL volume, i.e. every lead. `docker compose down` (no -v) is safe.
docker compose exec postgres psql -U "$POSTGRES_USERNAME" -d "$POSTGRES_DATABASE"

free -h                                 # memory and swap
docker stats --no-stream                # per-container memory
```

### Resource budget

| Service | `mem_limit` | Why |
|---|---|---|
| postgres | 900 MB | `shared_buffers=512MB` + work memory for 25 connections |
| api | 400 MB | a Go binary; this is generous |
| caddy | 200 MB | static files and TLS |

That leaves roughly 500 MB for the host, plus 2 GB of swap for builds.

`max_connections=25` on the server against `POSTGRES_MAX_OPEN_CONNS=10` in
`.env`: the API can never exhaust the server, and there is room left for a
`psql` session and the nightly `pg_dump`. Raise them together or not at all.

### Security checklist

- [ ] SSH by key only, root password login off
- [ ] UFW allows 22, 80, 443 and nothing else
- [ ] PostgreSQL is not published to the host (`expose:`, not `ports:`)
- [ ] `.env` is `chmod 600`, owned by root, and not in git
- [ ] The R2 token is scoped to the two buckets, and both are private
- [ ] `CORS_ORIGINS` names only `https://crm.owldayhouse.com`
- [ ] Sign-in is rate-limited in the API (per IP, with a short burst)
- [ ] The whole host is `noindex` — Caddy sends `X-Robots-Tag` and the app
      ships its own `robots.txt`

---

## 5. CI/CD with GitHub Actions

`.github/workflows/deploy-internal.yml` runs on every push to `main` that
touches the internal tools (`apps/api`, `apps/internal`, `packages`,
`infra/digitalocean`, the lockfile), and by hand from the Actions tab. A
change to `apps/web` alone does not redeploy the CRM.

1. **check** — `pnpm lint`, the Go tests against a real PostgreSQL 16
   service (with `ODH_TEST_REQUIRE_DB=1`, so a database problem fails the
   run instead of skipping the ownership tests), and `pnpm build`.
2. **deploy** — only if *check* passed, in the `production` environment:
   loads the deploy key and pins the Droplet's host key, then runs the same
   `infra/digitalocean/deploy.sh` a person would. Deploys never overlap.

### 5.1 A key just for GitHub (on your Mac)

A separate key, so it can be revoked without touching anyone's own.

```bash
ssh-keygen -t ed25519 -N "" -C "github-actions@odh-crm" -f ~/.ssh/odh_github_deploy
ssh deploy@<droplet-ip> 'cat >> ~/.ssh/authorized_keys' < ~/.ssh/odh_github_deploy.pub
ssh -i ~/.ssh/odh_github_deploy -o IdentitiesOnly=yes deploy@<droplet-ip> 'docker ps --format "{{.Names}}"'
```

### 5.2 Pin the Droplet's host key

`ssh-keyscan` trusts whatever answers, so compare its fingerprint with the
one the Droplet reports about itself before saving it:

```bash
ssh-keyscan -t ed25519 <droplet-ip> 2>/dev/null > /tmp/odh_known_hosts
ssh-keygen -lf /tmp/odh_known_hosts                                   # from the network
ssh deploy@<droplet-ip> 'ssh-keygen -lf /etc/ssh/ssh_host_ed25519_key.pub'   # from the box
```

The two `SHA256:` fingerprints must match.

### 5.3 The `production` environment on GitHub

With the GitHub CLI (independent of how the web UI looks this year):

```bash
gh api -X PUT repos/bboyzchecken/talon-by-owldayhouse/environments/production
gh variable set DROPLET_HOST --env production --body "<droplet-ip>"
gh variable set DROPLET_USER --env production --body "deploy"
gh secret set DROPLET_SSH_KEY --env production < ~/.ssh/odh_github_deploy
gh secret set DROPLET_KNOWN_HOSTS --env production < /tmp/odh_known_hosts
```

Or in the web UI: **Settings → Environments → New environment** →
`production`, then add the two variables and the two secrets with exactly
those names. Worth turning on there too:

- **Deployment branches**: `main` only.
- **Required reviewers** (optional): a person approves each deploy.

Then remove the private key from the Mac — GitHub holds the only copy, and
a lost one is replaced by repeating 5.1:

```bash
rm ~/.ssh/odh_github_deploy /tmp/odh_known_hosts
```

### 5.4 First run

**Actions → Deploy internal tools → Run workflow** on `main`. The *deploy*
job ends with `Deployed. https://crm.owldayhouse.com is serving commit …`.

### 5.5 Revoking

Delete the `github-actions@odh-crm` line from
`/home/deploy/.ssh/authorized_keys` on the Droplet, then delete the
`DROPLET_SSH_KEY` secret. If the Droplet is rebuilt, its host key changes:
redo 5.2, or the deploy stops with a host-key error — which is the point.
