# infra/ftp-deploy

Build the static marketing site and upload `apps/web/out/` to an FTP host with
one command. Credentials are read from the environment — never committed.

## One-time setup

1. Install **lftp**
   - macOS: `brew install lftp`
   - Debian/Ubuntu: `sudo apt-get install lftp`
2. Create the env file from the template and fill in your host:
   ```bash
   cp infra/ftp-deploy/.env.example infra/ftp-deploy/.env
   # edit infra/ftp-deploy/.env  → FTP_HOST / FTP_USER / FTP_PASS / FTP_REMOTE_DIR
   ```
   `.env` is git-ignored. You can also export the variables in your shell instead.
3. (Apache hosts only) upload `htaccess.example` to the site root as `.htaccess`
   for gzip + long-cache on `/_next/static` + a proper 404 page.

## Deploy

```bash
pnpm deploy:web
# = pnpm build:web  (turbo build --filter web → apps/web/out)
#   + bash infra/ftp-deploy/deploy.sh  (lftp mirror --reverse --delete)
```

Or run the two steps separately:

```bash
pnpm build:web
bash infra/ftp-deploy/deploy.sh
```

`deploy.sh` mirrors `apps/web/out` to `FTP_REMOTE_DIR`, deleting remote files that
no longer exist locally (so old pages are cleaned up), and prints how many files
were synced. It refuses to run if env vars are missing or the build output isn't there.

## Env vars

| Var | Required | Notes |
| --- | --- | --- |
| `FTP_HOST` | ✅ | e.g. `ftp.yourhost.com` |
| `FTP_USER` | ✅ | ftp username |
| `FTP_PASS` | ✅ | ftp password |
| `FTP_REMOTE_DIR` | – | target dir, default `/` (often `/public_html`) |
| `FTP_PORT` | – | default `21` |
| `FTP_PROTO` | – | `ftp` (default) or `ftps` for FTP over TLS |

## Post-deploy checklist

- [ ] Open https://owldayhouse.com/ — every route, image, and Messenger/phone/LINE link works
- [ ] Check a deep link with trailing slash (e.g. `/talon/`) loads, and a bad URL shows the 404 page
- [ ] OG preview looks right (Facebook Sharing Debugger) — image = `/og.png`
- [ ] Domain `owldayhouse.com` points to the host (DNS/SSL ok)
- [ ] Submit `https://owldayhouse.com/sitemap.xml` in Google Search Console + verify the domain
- [ ] Set up Google Business Profile (Chiang Mai) and link the site
