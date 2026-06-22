# CLAUDE.md — Owl Day House (ODH) Web

Context for Claude Code. **Read this first every session.**

## What we're building
Rebuild of **owldayhouse.com** as a **static-first monorepo**. ODH is a Thai software house (Chiang Mai) repositioning for a new era: entry-level AI websites (product **Talon**, ฿3,900) as a funnel that ladders up to enterprise/government systems (e.g. reg.tu.ac.th).

## 🔑 Golden rule
Follow **BUILD_PLAN.md**. Work **one STEP at a time** (Step 0 → 10). Each step has a checklist + a prompt. Don't jump ahead — later steps depend on earlier ones. After each step, `pnpm lint && pnpm build` must pass, then commit before moving on.

## Stack (committed — don't swap without asking)
- Monorepo: **pnpm workspaces + Turborepo**
- Web: **Next.js 15 App Router + TypeScript + Tailwind v4** → **static export** (`output: 'export'`)
- Deploy: `next build` → `apps/web/out/` → **FTP** (primary); Cloudflare Pages optional
- API (optional, Step 8 only): **Go** (Echo + GORM + MySQL + Uber FX) per `PROJECT_TEMPLATE.md`, deployed on a small AWS instance

## Hard constraints
- **Marketing site = 100% static. No backend, no email, no forms.** Every "ติดต่อ/สั่งซื้อ" action links out to **Facebook Messenger** (`m.me/owldayhouse`), phone (`tel:+66924552450`), or LINE.
- Static export requires `images.unoptimized: true` and `trailingSlash: true`.
- Do NOT add runtime data-fetching server components, API routes, or anything that breaks `output: 'export'`.

## Brand — NEVER change the colors
- **Owl Navy `#28254C`** (structure / text) · **Owl Gold `#E9A41B`** (CTA / highlight)
- Support: navyDeep `#1B1938`, goldSoft `#FBEFD3`, paper `#FBF8F1`
- Fonts: **Space Grotesk** (display / numbers), **IBM Plex Sans Thai** (body Thai)
- Feel: **trustworthy** (clean, generous whitespace, real proof) + **exciting** (navy gradients, gold glow, light motion) — "ODH's new journey"
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
- One `<h1>` per page · semantic HTML · `alt` on every image · `lang="th"`.
- **SEO is first-class** (Step 5): metadata API, `sitemap.ts`, `robots.ts`, JSON-LD (Organization / LocalBusiness Chiang Mai / Service), OG images.
- Contact/company facts: บริษัท อาวล์ เดย์ เฮ้าส์ จำกัด · ห้อง B1 ชั้น 1 อาคาร TNC เลขที่ 172 ต.ไชยสถาน อ.สารภี เชียงใหม่ 50140 · 092-455-2450 · FB/IG/LinkedIn = owldayhouse.
- **Go API (if built): follow `PROJECT_TEMPLATE.md` exactly, BUT email/Gmail is removed** (no email anywhere). Internal auth = seed admin in DB, or LINE OTP — **never email OTP**.

## Commands
```
pnpm install      pnpm dev      pnpm build      pnpm lint      pnpm typecheck
# deploy web:
pnpm build && bash infra/ftp-deploy/deploy.sh
```

## Reference (do not treat as the app)
`talon-prototype/` = a working prototype from planning (Talon dashboard, Go-bound backend functions, branded pricing page). **Reference only.** Step 8 builds `apps/api` fresh from `PROJECT_TEMPLATE.md`; the pricing/copy in there informs the `/talon` and `/packages` pages.
