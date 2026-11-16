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

### Build-time values for the quote form

The form on `/contact/` is compiled into the static bundle, so this goes in the
environment of `pnpm build:web` (or `apps/web/.env.local`), not on the FTP host.

| Var | Notes |
| --- | --- |
| `NEXT_PUBLIC_INTAKE_URL` | `https://api.owldayhouse.com`, no trailing slash |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | **leave unset.** The bot check is ALTCHA, our own, with no account. Set it only to switch to Cloudflare Turnstile (then the Droplet needs `TURNSTILE_SECRET`) |

> **Never put a placeholder in either of these.** `NEXT_PUBLIC_*` is inlined
> into the bundle at build time; the static site has no runtime that could
> notice a bad value later. A build once shipped the literal text
> `<Site Key จาก Cloudflare Turnstile>` as the site key — a non-empty string, so
> the form switched itself to Turnstile, asked Cloudflare for a widget under a
> key that does not exist, and answered every quote request with "give the bot
> check a moment". The intake was on ALTCHA the whole time. `apps/web/lib/intake.ts`
> now ignores a value that is not shaped like a real key, and `deploy.sh`
> refuses to upload a build made with one, but the right value is still
> an empty line.

The form appears only when the intake URL is set **and** `contact.replyWithinBusinessDays`
in `apps/web/content/site.ts` is a number (it is 1). Without the URL, `/contact/`
builds without the form, as before. Turn the intake on (Droplet,
`infra/digitalocean` section 1.11) before deploying a build that has the form.

## Post-deploy checklist

- [ ] Open https://owldayhouse.com/ — every route, image, and Messenger/phone/LINE link works
- [ ] Check a deep link with trailing slash (e.g. `/services/`) loads, and a bad URL shows the 404 page
- [ ] `curl -sI https://owldayhouse.com/talon/` and `/packages/` → `301` to their new URLs
- [ ] `curl -sI https://owldayhouse.com/no-such-page/` → ideally `404`; `200` means the
      vhost 404 is still unset and the catch-all rewrite is doing the work
- [ ] If the form is on: send it once from `/contact/` and find it in the CRM under งานเข้า
- [ ] OG preview looks right (Facebook Sharing Debugger) — image = `/og.png`
- [ ] Domain `owldayhouse.com` points to the host (DNS/SSL ok)
- [ ] Submit `https://owldayhouse.com/sitemap.xml` in Google Search Console + verify the domain
- [ ] Set up Google Business Profile (Chiang Mai) and link the site
