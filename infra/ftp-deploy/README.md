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
3. Nothing to do for `.htaccess`: the live one lives in `apps/web/public/.htaccess`
   and ships with the build. `htaccess.example` is a fuller Apache reference (gzip,
   long-cache on `/_next/static`) kept for hosts that support those directives.

## Deploy

On Windows, or anywhere without lftp, use the Python script. It shows its plan with
`--dry-run`, removes files only inside folders this site owns, and backs up the remote
`.htaccess`. The site's `.htaccess` lives in `apps/web/public/` and ships with the build.

```bash
python infra/ftp-deploy/deploy.py --dry-run
python infra/ftp-deploy/deploy.py
```

With lftp:

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

## LiteSpeed and .htaccess

The host (`owldayhouse.com`, 110.78.166.253) runs LiteSpeed, and it behaves in two ways
that Apache does not:

- **Only `RewriteRule` is read from `.htaccess`.** `ErrorDocument`, `RedirectMatch` and
  the `mod_headers` / `mod_deflate` blocks are ignored, so every redirect in
  `apps/web/public/.htaccess` is written as a `RewriteRule`.
- **The file is re-read only after a LiteSpeed restart.** Uploading it changes nothing
  until the host restarts the server, so message support and ask for a restart.

Both deploy scripts therefore upload `.htaccess` only when its content differs from the
server's, and print a reminder when it does.

The 404 page is served by a catch-all `RewriteRule`, which means unknown URLs answer
**HTTP 200** with the 404 page — a soft 404 that Google treats as a duplicate. The real
fix is on the host: ask them to point the vhost's custom 404 error page at `/404.html`,
then delete the catch-all (the three commented lines) from `apps/web/public/.htaccess`.

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
- [ ] Check a deep link with trailing slash (e.g. `/services/`) loads, and a bad URL shows the 404 page
- [ ] `curl -sI https://owldayhouse.com/talon/` and `/packages/` → `301` to their new URLs
- [ ] `curl -sI https://owldayhouse.com/no-such-page/` → ideally `404`; `200` means the
      vhost 404 is still unset and the catch-all rewrite is doing the work
- [ ] OG preview looks right (Facebook Sharing Debugger) — image = `/og.png`
- [ ] Domain `owldayhouse.com` points to the host (DNS/SSL ok)
- [ ] Submit `https://owldayhouse.com/sitemap.xml` in Google Search Console + verify the domain
- [ ] Set up Google Business Profile (Chiang Mai) and link the site
