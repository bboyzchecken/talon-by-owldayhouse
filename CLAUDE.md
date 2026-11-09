# CLAUDE.md — Owl Day House (ODH) Web

Context for Claude Code. **Read this first every session.**

## What we're building
Rebuild of **owldayhouse.com** as a **static-first monorepo**, bilingual: Thai at the root, English under `/en/`. ODH (based in Bangkok, registered in Chiang Mai) is one team for **Build** (websites, software), **Activate** (kiosk games, KOL and review clips, event production) and **Grow** (digital marketing, social listening with a partner). We build tools for the work: event check-in and prize draws, image/video generation with subtitles for KOLs, and one n8n batch pipeline wrapped in MCP that clients check themselves (social listening data, and competitor tracking for digital marketing). Event production has an internal footage library (clients never see raw files): Google Drive wrapped with MCP so files are tagged by shoot day and subject and our team finds them by asking AI, plus a step that lays files onto a CapCut timeline in storyboard order. Present it as why we deliver edits fast, and as a system we can build for a client. Do not say AI drafts storyboards. A shoot-planning tool does not exist yet; build a prototype only when a client asks. Most are built for one client and cannot be shown, so describe only tools that exist, never claim every service has MCP, and keep the Tools page out of the main menu (footer and services page only). The site shows **no prices** and does not sell Talon or AI-built websites. The current design system and site plan live in `docs/design-system/`.

## 🔑 Golden rule
Follow the phases in `docs/design-system/project/plan-2-sitemap.md`. `BUILD_PLAN.md` describes the original build and is history for positioning and pricing. After each step, `pnpm lint && pnpm build` must pass, then commit before moving on.

## Stack (committed — don't swap without asking)
- Monorepo: **pnpm workspaces + Turborepo**
- Web: **Next.js 15 App Router + TypeScript + Tailwind v4** → **static export** (`output: 'export'`)
- Deploy (marketing site): `next build` → `apps/web/out/` → **FTP** (primary); Cloudflare Pages optional
- Internal tools API: **Go** (Echo + GORM + Uber FX) per `PROJECT_TEMPLATE.md`, but on **PostgreSQL 16** (`gorm.io/driver/postgres`), not MySQL
- Internal tools UI: **Next.js 15 + Tailwind v4 → static export**, same `@odh/brand` / `@odh/ui` as the site
- Internal tools deploy: one **DigitalOcean Droplet** (12 USD: 1 vCPU, 2 GB) running `docker compose` — PostgreSQL + the Go API + **Caddy** for HTTPS — at **crm.owldayhouse.com**. Not AWS; `infra/aws` is the old plan.
- Files and uploads: **Cloudflare R2**, private buckets, presigned URLs only — nothing is stored on the server's disk.

## Hard constraints
- **The internal tools are a separate app.** Never modify `apps/web` for them, and never link to `crm.owldayhouse.com` from the marketing site.
- **No e-mail anywhere in this company's systems**, the internal tools included: no Gmail API, no OTP by e-mail, no self-registration, no password-reset request. The first admin comes from the CLI; that admin creates and resets accounts. Contact e-mail addresses are stored as data only. (LINE Login is a possible future addition; it does not exist yet.)
- **Marketing site = 100% static. No backend, no email, no forms.** Every "ติดต่อ/สั่งซื้อ" action links out to **Facebook Messenger** (`m.me/owldayhouse`), phone (`tel:+66924552450`), LINE, or a `mailto:owldayhouse@gmail.com` link.
- Static export requires `images.unoptimized: true` and `trailingSlash: true`.
- Do NOT add runtime data-fetching server components, API routes, or anything that breaks `output: 'export'`.

## Brand — NEVER change the colors
- **Owl Navy `#28254C`** (primary button, key words) · **Owl Gold `#E9A41B`** (one point per screen). Use them only at key points.
- White is the base of every page, with ink `#15151C` for text. goldSoft and paper are for documents only.
- Logo: use `OwlLogo` without "THE SOFTWARE HOUSE".
- Fonts: **Bricolage Grotesque** + **Anuphan** (display), **IBM Plex Sans Thai** (body), **DM Mono** (labels)
- Feel: **professional** (generous white space, real proof) + **creative** (large type, editorial layouts, a few scroll moments)
- Tokens live in `packages/brand`. **Never hardcode hex in components** — use tokens / CSS variables.

## Monorepo layout
```
apps/web                Next.js static marketing site (primary)
apps/internal           Next.js static internal tools UI (Lead Tracker, + future tools)
apps/api                Go API for the internal tools (Echo + GORM + PostgreSQL 16 + FX)
packages/brand          design tokens + Tailwind theme + fonts
packages/ui             shared React components (OwlMark, Button, Card…)
packages/query          axios + TanStack Query client for the internal UI
packages/tsconfig       base TS config
packages/eslint-config  base lint
infra/ftp-deploy        build + FTP script (marketing site)
infra/digitalocean      Droplet setup, docker compose, Caddy, deploy + backup
infra/aws               old Go API deploy notes (superseded by infra/digitalocean)
infra/cloudflare        Cloudflare Pages option
```

## Conventions
- TypeScript strict. Shared deps via `workspace:*` (`@odh/brand`, `@odh/ui`).
- One `<h1>` per page · semantic HTML · `alt` on every image · `lang` set per locale by the root layouts in `app/(th)` and `app/(en)/en`. Page copy lives in `apps/web/content/`.
- **SEO is first-class** (Step 5): metadata API, `sitemap.ts`, `robots.ts`, JSON-LD (Organization / LocalBusiness / Service), OG images.
- Present the company as an experienced, global-ready team ("ทีมของเรา", "ทีมมากประสบการณ์"), not by city. Bangkok appears only as the location fact; show the Chiang Mai address only as the registered office. Contact/company facts: บริษัท อาวล์ เดย์ เฮ้าส์ จำกัด · ห้อง B1 ชั้น 1 อาคาร TNC เลขที่ 172 ต.ไชยสถาน อ.สารภี เชียงใหม่ 50140 · 092-455-2450 · owldayhouse@gmail.com · FB/IG/LinkedIn = owldayhouse.
- **Go API: follow `PROJECT_TEMPLATE.md` exactly, with two documented departures** — PostgreSQL 16 instead of MySQL, and email/Gmail removed entirely. Auth = a seed admin created by the CLI, who then creates the sales accounts; LINE Login may come later — **never email OTP**.
- **Internal tools: one tool per domain behind its own route prefix** (`/api/leads/...`), with auth, accounts and files shared. Adding a tool = a model + store + handler file + a route-prefix registration, plus a page folder and an entry in `apps/internal/lib/tools.ts`. See `apps/api/README.md`.
- Roles are `admin` (the company) and `sales`. Every internal page is `noindex`.

## Commands
```
pnpm install      pnpm dev      pnpm build      pnpm lint      pnpm typecheck      pnpm test

# marketing site
pnpm build:web && bash infra/ftp-deploy/deploy.sh

# internal tools
pnpm --filter internal dev        # UI on :3100
pnpm --filter api dev             # Go API on :5000
pnpm --filter api test            # go test ./... (see apps/api/README.md for the DB tests)
ODH_DROPLET_HOST=<ip> bash infra/digitalocean/deploy.sh
```

## Reference (do not treat as the app)
`talon-prototype/` = a working prototype from planning (Talon dashboard, Go-bound backend functions). **Reference only.** `apps/api` was built fresh from `PROJECT_TEMPLATE.md` and owes it nothing. Do not bring its pricing or Talon copy back to the site.
