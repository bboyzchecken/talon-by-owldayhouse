# CLAUDE.md — Owl Day House (ODH) Web

Context for Claude Code. **Read this first every session.**

## What we're building
Rebuild of **owldayhouse.com** as a **static-first monorepo**, bilingual: Thai at the root, English under `/en/`. ODH (Chiang Mai) is one team for **Build** (websites, software), **Activate** (kiosk games, KOL, event filming and reviews) and **Grow** (digital marketing, social listening with a partner). Every service comes with brand-owned tools that connect to the brand's own AI through MCP (say this on the Tools page and sparingly elsewhere). The site shows **no prices** and does not sell Talon or AI-built websites. The current design system and site plan live in `docs/design-system/`.

## 🔑 Golden rule
Follow the phases in `docs/design-system/project/plan-2-sitemap.md`. `BUILD_PLAN.md` describes the original build and is history for positioning and pricing. After each step, `pnpm lint && pnpm build` must pass, then commit before moving on.

## Stack (committed — don't swap without asking)
- Monorepo: **pnpm workspaces + Turborepo**
- Web: **Next.js 15 App Router + TypeScript + Tailwind v4** → **static export** (`output: 'export'`)
- Deploy: `next build` → `apps/web/out/` → **FTP** (primary); Cloudflare Pages optional
- API (optional, Step 8 only): **Go** (Echo + GORM + MySQL + Uber FX) per `PROJECT_TEMPLATE.md`, deployed on a small AWS instance

## Hard constraints
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
apps/api                optional Go API (Step 8)
packages/brand          design tokens + Tailwind theme + fonts
packages/ui             shared React components (OwlMark, Button, Card…)
packages/tsconfig       base TS config
packages/eslint-config  base lint
infra/ftp-deploy        build + FTP script
infra/aws               Go API deploy notes
infra/cloudflare        Cloudflare Pages option
```

## Conventions
- TypeScript strict. Shared deps via `workspace:*` (`@odh/brand`, `@odh/ui`).
- One `<h1>` per page · semantic HTML · `alt` on every image · `lang` set per locale by the root layouts in `app/(th)` and `app/(en)/en`. Page copy lives in `apps/web/content/`.
- **SEO is first-class** (Step 5): metadata API, `sitemap.ts`, `robots.ts`, JSON-LD (Organization / LocalBusiness Chiang Mai / Service), OG images.
- Contact/company facts: บริษัท อาวล์ เดย์ เฮ้าส์ จำกัด · ห้อง B1 ชั้น 1 อาคาร TNC เลขที่ 172 ต.ไชยสถาน อ.สารภี เชียงใหม่ 50140 · 092-455-2450 · owldayhouse@gmail.com · FB/IG/LinkedIn = owldayhouse.
- **Go API (if built): follow `PROJECT_TEMPLATE.md` exactly, BUT email/Gmail is removed** (no email anywhere). Internal auth = seed admin in DB, or LINE OTP — **never email OTP**.

## Commands
```
pnpm install      pnpm dev      pnpm build      pnpm lint      pnpm typecheck
# deploy web:
pnpm build && bash infra/ftp-deploy/deploy.sh
```

## Reference (do not treat as the app)
`talon-prototype/` = a working prototype from planning (Talon dashboard, Go-bound backend functions). **Reference only.** Step 8 builds `apps/api` fresh from `PROJECT_TEMPLATE.md`. Do not bring its pricing or Talon copy back to the site.
