# ODH Web — Build Plan (Monorepo, Static-first)

แผนสร้างเว็บใหม่ของ **Owl Day House (ODH)** ทีละ step พร้อม **checklist** และ **prompt สำหรับ Claude Code** ในแต่ละขั้น
ออกแบบให้ vibe-code แล้วตรวจเองได้ ทุก step จบในตัว commit แล้วไป step ต่อไป

---

## เป้าหมาย & ข้อกำหนด

| หัวข้อ | สิ่งที่เอา |
|---|---|
| Stack หน้าบ้าน | **Next.js (App Router) + TypeScript + Tailwind v4** → **static export** (`output: 'export'`) |
| Deploy หลัก | `next build` → โฟลเดอร์ `out/` → **FTP ขึ้น static host** จบ |
| ติดต่อซื้อขาย | ส่งคนไป **Facebook Page / Messenger / โทร / LINE** — **ไม่มีระบบเมล/ฟอร์ม backend** |
| แบรนด์ | คงเดิม: **Owl Gold `#E9A41B` + Owl Navy `#28254C`** + นกฮูก ออกแบบใหม่ให้ดู *น่าเชื่อถือ + ตื่นเต้น* |
| Service ใหม่ | section เปิดตัว **Talon** (เว็บไว AI ฿3,900) |
| SEO/การตลาด | ทำเต็มรูปแบบ (เมื่อก่อนไม่เคยทำ) — metadata, sitemap, JSON-LD, OG, local SEO เชียงใหม่ |
| API (ถ้าจำเป็น) | **Go** ตาม `PROJECT_TEMPLATE.md` — deploy ถูกสุดบน **AWS** (มีเครดิตฟรี) |
| ทางเลือกหน้าบ้านโหด | **Cloudflare Pages/Workers** |
| โครงสร้าง | **monorepo** พร้อม deploy ได้ทุกแบบ |

> **หลักคิดสำคัญ:** เว็บการตลาดเป็น static ล้วน → ไม่ต้องมี backend ตั้งแต่วันแรก API เป็น *optional* ไว้ทำ Talon dashboard backend ทีหลัง

---

## สถาปัตยกรรม Monorepo

```
odh-web/
├── pnpm-workspace.yaml
├── turbo.json
├── package.json                  # root scripts (turbo)
├── .nvmrc / .npmrc
├── BUILD_PLAN.md                 # ← ไฟล์นี้
│
├── apps/
│   ├── web/                      # [หลัก] Next.js static marketing site
│   │   ├── next.config.ts        # output:'export', images.unoptimized
│   │   ├── app/                  # App Router
│   │   ├── components/
│   │   ├── content/              # data: services, packages, portfolio (typed TS)
│   │   ├── public/               # รูป, og, favicon, robots assets
│   │   └── ...
│   │
│   └── api/                      # [optional] Go REST API (ตาม PROJECT_TEMPLATE.md)
│       └── ... (Echo + GORM + FX) — ตัด Gmail ออก (ไม่ใช้เมลแล้ว)
│
├── packages/
│   ├── ui/                       # ปุ่ม/การ์ด/owl mark ใช้ร่วม (React + Tailwind)
│   ├── brand/                    # design tokens (สี/ฟอนต์) + tailwind preset
│   ├── tsconfig/                 # tsconfig ฐาน
│   └── eslint-config/            # lint ฐาน
│
└── infra/
    ├── ftp-deploy/               # script build+FTP (lftp / ncftp)
    ├── aws/                      # note/IaC สำหรับ Go API (Lightsail/EC2/ECS)
    └── cloudflare/               # note สำหรับ Cloudflare Pages (ทางเลือก)
```

**Stack tooling ที่ commit:**
- Package manager: **pnpm** + workspaces
- Monorepo runner: **Turborepo** (`turbo run build/dev/lint`)
- Node: ระบุใน `.nvmrc` (เช่น 20 LTS)
- Frontend: Next.js 15 App Router, TypeScript, Tailwind v4 (CSS-first `@theme`), `next/font`, `lucide-react`, motion (framer-motion) สำหรับ animation เบา ๆ
- Go API: ตาม `PROJECT_TEMPLATE.md` (Echo/GORM/MySQL/FX) — **ลบ service email/Gmail** เพราะไม่ใช้เมล

---

## Deployment Matrix

| รูปแบบ | ใช้เมื่อ | วิธี |
|---|---|---|
| **FTP static** (หลัก) | ปกติ | `pnpm build` → `apps/web/out/` → FTP ขึ้นโฮส |
| **Cloudflare Pages** | อยากได้ CDN/CI/preview, หน้าบ้านโหดขึ้น | เชื่อม git repo, build command `pnpm --filter web build`, output `apps/web/out` |
| **AWS (Go API)** | เมื่อเริ่มทำ Talon backend | Lightsail/EC2 `t4g.micro` (free-tier) รัน Docker, หรือ ECS Fargate — ดู Step 8 |

---

## วิธีใช้แผนนี้กับ Claude Code

1. เปิด repo `odh-web/` ใน Claude Code
2. ทำ **ทีละ step** — copy **Prompt** ของ step นั้นไปวาง
3. รีวิว diff ที่ Claude Code เสนอ → ติ๊ก **Checklist** ให้ครบ
4. `pnpm lint && pnpm build` ผ่าน → `git commit` → ไป step ถัดไป
5. แต่ละ prompt เขียนให้ Claude Code รู้ convention ของ repo อยู่แล้ว ไม่ต้องอธิบายซ้ำ

---
---

# STEP 0 — Scaffold Monorepo

**Goal:** วางโครง monorepo ว่าง ๆ ให้พร้อม (pnpm + turbo) build/lint ได้แม้ยังไม่มีโค้ดจริง

**Checklist**
- [x] `pnpm-workspace.yaml` ครอบ `apps/*` และ `packages/*`
- [x] `turbo.json` มี pipeline `build`, `dev`, `lint`, `typecheck` *(turbo 2.x ใช้คีย์ `tasks`)*
- [x] root `package.json` มี scripts ที่เรียก turbo
- [x] `.nvmrc` (Node 20), `.gitignore` (node_modules, .next, out, .turbo, .env*)
- [x] `packages/tsconfig` + `packages/eslint-config` ใช้ร่วมได้
- [x] `pnpm install` สำเร็จ, `pnpm turbo run lint` ผ่าน (no-op ได้)

**Claude Code Prompt**
```
สร้าง monorepo ชื่อ odh-web ด้วย pnpm workspaces + Turborepo

โครงสร้าง:
- apps/   (จะมี web, api ทีหลัง)
- packages/  (brand, ui, tsconfig, eslint-config)
- infra/  (ftp-deploy, aws, cloudflare — แค่โฟลเดอร์ + README ว่าง)

ต้องมี:
1. pnpm-workspace.yaml ครอบ "apps/*" และ "packages/*"
2. turbo.json: pipeline build (dependsOn ^build, outputs ["out/**",".next/**","dist/**"]), dev (cache:false, persistent:true), lint, typecheck
3. root package.json: scripts "dev","build","lint","typecheck" เรียกผ่าน turbo; packageManager pnpm
4. .nvmrc = 20 ; .npmrc (shamefully-hoist=false) ; .gitignore ครบ (node_modules,.next,out,dist,.turbo,.env*,*.log)
5. packages/tsconfig: base tsconfig (strict:true, moduleResolution Bundler) export ให้ตัวอื่น extends
6. packages/eslint-config: flat config ฐานสำหรับ TS+React, export ให้ตัวอื่น
7. packages/brand และ packages/ui: สร้าง package.json + index ว่าง ๆ ไว้ก่อน (ใส่ของจริง step ถัดไป)

ห้ามใส่ business logic ใด ๆ ใน step นี้ แค่ให้ pnpm install + turbo run lint ผ่าน
ยืนยันด้วยการรัน pnpm install และ pnpm turbo run lint
```

---

# STEP 1 — Brand Tokens & Design System

**Goal:** รวมสี/ฟอนต์/owl mark/ปุ่ม-การ์ด ไว้ที่ `packages/brand` + `packages/ui` ให้ทั้งเว็บใช้ค่าเดียวกัน คุมแบรนด์ไม่เพี้ยน

**Design direction (น่าเชื่อถือ + ตื่นเต้น):**
- สีหลัก: Owl Navy `#28254C` (โครง/ตัวอักษร), Owl Gold `#E9A41B` (ไฮไลต์/CTA)
- เสริม: navy เข้ม `#1B1938`, gold อ่อน `#FBEFD3`, paper `#FBF8F1`, ink/muted
- ฟอนต์: **Space Grotesk** (หัวข้อ/ตัวเลข — ดูเทคโนโลยี), **IBM Plex Sans Thai** (เนื้อหาไทย)
- ความรู้สึก: โครงสะอาด whitespace เยอะ = น่าเชื่อถือ; gradient navy→navy เข้ม + glow ทอง + motion เบา = ตื่นเต้น "การเดินทางครั้งใหม่"

**Checklist**
- [x] `packages/brand`: export tokens (object TS) + Tailwind v4 `@theme` CSS + ฟอนต์ config
- [x] `packages/ui`: `<OwlMark/>`, `<Button/>` (navy/gold/ghost), `<Card/>`, `<Badge/>`, `<SectionHeading/>`
- [x] ทุก component พึ่ง tokens จาก brand ไม่ฮาร์ดโค้ดสีซ้ำ
- [x] มีไฟล์ตัวอย่าง/story สั้น ๆ ให้ดูว่า render ได้ *(`Showcase` + README + พรีวิวในแชท)*

**Claude Code Prompt**
```
สร้าง design system ของ ODH ใน packages/brand และ packages/ui

packages/brand:
- tokens.ts: export สี (navy #28254C, navyDeep #1B1938, gold #E9A41B, goldSoft #FBEFD3,
  paper #FBF8F1, ink #28254C, muted #6E6B86, line #EAE6DB), radii, shadow, font families
- theme.css: Tailwind v4 @theme ที่ map tokens เป็น CSS variables (--color-navy ฯลฯ)
- fonts.ts: ตั้งค่า next/font สำหรับ Space Grotesk (display) + IBM Plex Sans Thai (body),
  export ตัวแปร className/variable ให้ apps/web เอาไปใส่ <html>

packages/ui (React + Tailwind, ใช้ tokens จาก brand):
- OwlMark: SVG นกฮูก/ก้นหอย สไตล์โลโก้ ODH (navy บนพื้นทองตามขนาด prop) — refine ให้ดูพรีเมียม
- Button: variant 'navy' | 'gold' | 'ghost', size sm/md/lg, รองรับ asChild (เป็น <a> ได้)
- Card, Badge, SectionHeading (eyebrow + title + subtitle)
- ทุกตัว: TypeScript, forwardRef, ไม่ฮาร์ดโค้ด hex (อ้าง CSS variables/tailwind theme)

เพิ่ม README สั้น ๆ ใน packages/ui โชว์การ import ใช้งาน
เป้าหมาย: ดูน่าเชื่อถือแต่ตื่นเต้น — โครงสะอาด, ปุ่ม gold เป็น CTA หลัก, navy เป็นโครง
```

---

# STEP 2 — Next.js App (Static Export)

**Goal:** ตั้ง `apps/web` ให้รันได้ + export เป็น static (`out/`) + ฟอนต์/แบรนด์ติด

**Checklist**
- [x] `apps/web` รัน `pnpm --filter web dev` ได้
- [x] `next.config.ts`: `output: 'export'`, `images: { unoptimized: true }`, `trailingSlash: true`
- [x] Tailwind v4 ติดตั้ง + import `@odh/brand/theme.css`
- [x] `app/layout.tsx` ใส่ฟอนต์จาก `packages/brand`, lang="th", base metadata
- [x] `pnpm --filter web build` ออก `apps/web/out/` มี `index.html`

**Claude Code Prompt**
```
สร้าง apps/web เป็น Next.js 15 (App Router) + TypeScript + Tailwind v4 ตั้งค่าเป็น static export

ต้องมี:
1. next.config.ts: output:'export', images.unoptimized:true, trailingSlash:true, reactStrictMode
2. ติดตั้ง Tailwind v4 (CSS-first) + import theme จาก @odh/brand (packages/brand/theme.css)
3. app/layout.tsx:
   - <html lang="th"> ใส่ฟอนต์ Space Grotesk + IBM Plex Sans Thai จาก @odh/brand/fonts
   - base metadata (title template "%s | Owl Day House", description, metadataBase)
   - พื้นหลัง paper, ตัวอักษร ink
4. app/page.tsx: หน้า home ชั่วคราว แสดง OwlMark + ปุ่ม CTA (จาก @odh/ui) เพื่อพิสูจน์ว่าแบรนด์ติด
5. globals.css: reset เบา ๆ + ใช้ token

ใช้ workspace deps @odh/brand, @odh/ui (pnpm workspace:*)
ยืนยันด้วย pnpm --filter web build แล้วเช็คว่า apps/web/out/index.html ถูกสร้าง
```

---

# STEP 3 — Site Structure, Nav & Footer

**Goal:** วางหน้าทั้งหมด + nav + footer (ติดต่อ = Facebook/โทร/LINE, ไม่มีเมลฟอร์ม)

**หน้าเว็บ (route):**
- `/` หน้าแรก (hero + ladder + Talon teaser + งานเด่น + แพ็กเกจย่อ + CTA)
- `/services` เราทำอะไร (เว็บ, แอป, ระบบองค์กร, กราฟิก)
- `/talon` **เปิดตัว Talon** (เว็บไว AI ฿3,900) — หน้าเด่นของแคมเปญ
- `/packages` แพ็กเกจ + บันได 4 ขั้น (รวม pricing)
- `/work` ผลงาน (ดันงานราชการ/มหาวิทยาลัยขึ้นบน — reg.tu.ac.th)
- `/about` เราคือใคร
- `/contact` ติดต่อ → ปุ่ม Messenger / โทร / LINE / แผนที่เชียงใหม่

**Checklist**
- [x] ทุก route ข้างบนมีไฟล์ `app/<route>/page.tsx` (เนื้อหา placeholder ได้)
- [x] `<Nav/>` sticky, โลโก้ ODH, เมนูครบ, ปุ่ม "เริ่มเลย ฿3,900" → `/talon`
- [x] `<Footer/>` มีที่อยู่เชียงใหม่จริง, โทร 092-455-2450, Facebook/IG/LinkedIn, ลิงก์ภายใน
- [x] ปุ่มติดต่อทั้งหมดชี้ FB Messenger `m.me/owldayhouse`, `tel:+66924552450`, LINE
- [x] ไม่มี `<form>` ส่งเมลที่ไหนเลย

**Claude Code Prompt**
```
สร้างโครงหน้าและ navigation ของ apps/web

Routes (App Router) — สร้าง page.tsx ทุกอัน(เนื้อหา placeholder + SectionHeading ได้):
/ , /services , /talon , /packages , /work , /about , /contact

components/Nav.tsx:
- sticky top, พื้น navy โปร่ง/blur, OwlMark + "OWL DAY HOUSE"
- เมนู: เราคือใคร(/about) เราทำอะไร(/services) ผลงาน(/work) แพ็กเกจ(/packages) Talon(/talon) ติดต่อ(/contact)
- ปุ่ม CTA gold "เริ่มเลย ฿3,900" → /talon
- responsive: mobile เป็น hamburger (client component)

components/Footer.tsx:
- ที่อยู่จริง: ห้อง B1 ชั้น 1 อาคาร TNC เลขที่ 172 ต.ไชยสถาน อ.สารภี เชียงใหม่ 50140
- โทร: 092-455-2450 (tel:+66924552450)
- Social: facebook.com/owldayhouse, instagram.com/owldayhouse, LinkedIn
- ลิงก์ภายในครบ + บรรทัด "บริษัท อาวล์ เดย์ เฮ้าส์ จำกัด" + ปีปัจจุบัน

สำคัญ: ทุกการ "ติดต่อ/สั่งซื้อ" ให้ลิงก์ออกไป FB Messenger (m.me/owldayhouse), โทร, หรือ LINE
ห้ามมีฟอร์มส่งอีเมลหรือ backend ใด ๆ — เว็บเป็น static ล้วน
วาง Nav/Footer ใน app/layout.tsx ให้ทุกหน้ามี
```

---

# STEP 4 — Hero, Value Ladder & Talon Launch (หัวใจดีไซน์)

**Goal:** สร้าง section สำคัญที่สื่อ "การเดินทางครั้งใหม่" — น่าเชื่อถือ + ตื่นเต้น และเปิดตัว Talon ให้เด่น

**Sections บนหน้าแรก:**
1. **Hero** — พาดหัวกล้า ๆ: *"จากเว็บแรก ฿3,900 สู่ระบบระดับองค์กร"* + ปุ่มคู่ (เริ่มเลย ฿3,900 / ดูผลงาน) + ภาพ/gradient navy + glow ทอง + motion เบา
2. **Value Ladder** — บันได 4 ขั้น (เว็บไว → เว็บธุรกิจ → ระบบ/ร้านออนไลน์ → องค์กร/ราชการ) ให้ลูกค้าเห็นว่าโตต่อได้
3. **Talon Launch band** — แถบ spotlight (navy เข้ม + gold) ประกาศ service ใหม่ "Talon — เว็บไว AI เสร็จใน 5 วัน" + ปุ่มไป `/talon`
4. **Trust / งานเด่น** — โลโก้ลูกค้า + ดันงานราชการ/มหาวิทยาลัย (reg.tu.ac.th) เป็น proof
5. **CTA ปิด** — ไป Messenger

**Checklist**
- [x] Hero มี gradient + accent ทอง + animation เข้าเบา ๆ (ไม่หน่วง LCP)
- [x] Ladder 4 ขั้น เป็น component ใช้ data จาก `content/`
- [x] Talon band เด่น แยกจากส่วนอื่นชัด มีปุ่มไป `/talon`
- [x] Trust section ดึง portfolio data, งานราชการอยู่บนสุด
- [x] ทุก section responsive + ใช้ tokens แบรนด์
- [x] หน้า `/talon` เต็ม: ปัญหา→ทางออก(AI+คนไทยดูแล)→ราคา ฿3,900→แพ็กดูแล→CTA Messenger

**Claude Code Prompt**
```
สร้าง sections หลักของหน้าแรกและหน้า /talon ด้วยดีไซน์ "น่าเชื่อถือ + ตื่นเต้น" (แบรนด์ navy/gold)

ใส่ data ใน apps/web/content/ (typed TS): ladder[], packages[], portfolio[]

หน้าแรก (ประกอบจาก components):
1) Hero.tsx — พื้น gradient navy→navyDeep + แสง glow ทอง, พาดหัวใหญ่ (Space Grotesk)
   "จากเว็บแรก ฿3,900 สู่ระบบระดับองค์กร", ซับ "AI เร็ว + ทีมคนไทยดูแลจริง",
   ปุ่มคู่: gold "เริ่มเลย ฿3,900"(→/talon) + ghost "ดูผลงาน"(→/work)
   ใส่ motion เข้าแบบ fade/translate เบา ๆ (framer-motion) อย่าให้กระทบ performance
2) ValueLadder.tsx — 4 ขั้น (เว็บไว/เว็บธุรกิจ/ระบบ-ร้านออนไลน์/องค์กร-ราชการ) พร้อมราคาเริ่ม
   ดีไซน์เป็นขั้นบันไดไล่ระดับ มีลูกศรโต ดึงจาก content/ladder
3) TalonLaunch.tsx — แถบ spotlight navyDeep + ขอบ/ตัวอักษร gold, badge "NEW",
   "Talon — เว็บไซต์ไวด้วย AI เสร็จใน 5 วัน", ปุ่ม gold → /talon
4) TrustStrip.tsx — โลโก้ลูกค้า + การ์ดงานเด่น โดยงานราชการ/มหาวิทยาลัย (reg.tu.ac.th) อยู่อันแรก
5) ClosingCTA.tsx — ปุ่มใหญ่ "ทักเราเลย" → m.me/owldayhouse

หน้า /talon (app/talon/page.tsx): ปัญหาลูกค้า(DIY ด้วย AI แล้วพัง) → ทางออก ODH (เร็วเท่า AI แต่มีคนดูแล)
→ สิ่งที่ได้ ฿3,900 → แพ็กดูแลรายเดือน(เดือนแรกฟรี, 390/690/990) → ความน่าเชื่อถือ(บริษัทจดทะเบียน+งานราชการ)
→ CTA Messenger. ทุกราคา/รายการดึงจาก content/packages

เน้น: โครงสะอาด, ตัวเลขใช้ Space Grotesk, gold เฉพาะจุดเน้น, ไม่รก, โหลดไว
```

---

# STEP 5 — SEO & Marketing Foundation

**Goal:** วางรากฐาน SEO ครบ (เมื่อก่อนไม่มีเลย) — ทำให้ Google เจอ + local SEO เชียงใหม่ + แชร์สวย

**Checklist**
- [x] `generateMetadata` ทุกหน้า (title/description/canonical/OG/Twitter) *(ผ่าน `lib/seo.ts` pageMeta + layout defaults)*
- [x] `app/sitemap.ts` ออก `/sitemap.xml` ครบทุก route
- [x] `app/robots.ts` ออก `/robots.txt` (allow + ชี้ sitemap)
- [x] JSON-LD: `Organization`, `LocalBusiness` (ที่อยู่/พิกัดเชียงใหม่/โทร/เวลาเปิด), `Service` (Talon), `BreadcrumbList`
- [x] OG image (static `/og.png` 1200×630 แบรนด์ ODH — สร้างด้วย next/og แล้ว export เป็นไฟล์จริง)
- [x] favicon + `manifest` *(apple-touch-icon ค้าง — ต้องการ PNG 180×180)*
- [x] HTML semantic (h1 เดียว/หน้า ✓, lang th ✓, รูปเป็น inline SVG มี aria-label)
- [x] Analytics: Plausible (component แยก, เปิดเมื่อตั้ง env `NEXT_PUBLIC_ANALYTICS_DOMAIN`)
- [ ] Lighthouse SEO ≥ 95, Performance ดี *(วัดจริงตอน pre-launch Step 10)*

**Claude Code Prompt**
```
ติดตั้ง SEO ครบให้ apps/web (เดิมไม่เคยทำ SEO เลย เน้นบอกต่อ)

1) Metadata: ใส่ generateMetadata หรือ metadata object ทุก route
   - title/description ภาษาไทยมี keyword: "รับทำเว็บไซต์ เชียงใหม่", "รับทำเว็บไซต์บริษัท",
     "ทำเว็บไซต์ AI ราคาถูก", "รับทำระบบ/เว็บแอป", "Talon เว็บไว"
   - canonical (อิง metadataBase = https://owldayhouse.com), openGraph + twitter card
2) app/sitemap.ts → sitemap.xml (ทุก route, lastModified)
3) app/robots.ts → robots.txt (allow all, ชี้ sitemap)
4) JSON-LD (ใส่เป็น <script type="application/ld+json"> ใน layout/หน้า):
   - Organization (ชื่อ, โลโก้, sameAs FB/IG/LinkedIn)
   - LocalBusiness: บริษัท อาวล์ เดย์ เฮ้าส์ จำกัด, address เชียงใหม่ (ต.ไชยสถาน อ.สารภี 50140),
     telephone +66924552450, geo, openingHours
   - Service สำหรับ Talon (เว็บไซต์ราคาเริ่ม 3900 THB)
   - BreadcrumbList ต่อหน้า
5) OG image แบรนด์ ODH (navy/gold + โลโก้) ขนาด 1200x630 — ใช้ opengraph-image.tsx ได้
6) favicon set + app/manifest.ts (name, theme_color navy, icons)
7) เช็ค semantic: h1 เดียวต่อหน้า, alt ครบ, heading เป็นลำดับ
8) Analytics: ใส่ Plausible (script เดียว เบา) — ทำเป็น component แยก ใส่ใน layout
   (ทำ env NEXT_PUBLIC_ANALYTICS_DOMAIN กันฮาร์ดโค้ด)

ยืนยัน: build แล้วมี out/sitemap.xml, out/robots.txt และ JSON-LD อยู่ใน HTML
```

---

# STEP 6 — Content & SEO Copy (ภาษาไทย)

**Goal:** ใส่เนื้อหาจริง + คีย์เวิร์ดให้ทุกหน้า (ไม่ใช่ lorem) เพื่อ rank + แปลงเป็นลูกค้า

**Checklist**
- [x] คีย์เวิร์ดหลัก/รองต่อหน้า (เชียงใหม่ + บริการ + Talon)
- [x] เนื้อหา home/services/talon/packages/work/about/contact เป็นไทยจริง อ่านลื่น
- [x] แต่ละหน้า: h1 ชัด, ย่อหน้าเปิดมี keyword ธรรมชาติ, CTA ลง Messenger
- [x] portfolio: งานราชการ/มหาวิทยาลัยมีคำอธิบาย + ผลลัพธ์ *(reg.tu.ac.th อยู่บนสุด)*
- [x] meta description ทุกหน้า ≤ 160 ตัวอักษร *(วัดจริง 99–128 อักขระ)*

**Claude Code Prompt**
```
เขียนเนื้อหาจริงภาษาไทย (เลิก placeholder) ให้ทุกหน้า apps/web เพื่อ SEO + ปิดการขาย

โทน: น่าเชื่อถือแบบบริษัทจริง + ทันสมัย ไม่โอ้อวด
ต่อหน้า กำหนด: keyword หลัก 1 + รอง 2-3, h1, ย่อหน้าเปิด(สอด keyword ธรรมชาติ), CTA ไป m.me/owldayhouse

- / : เล่าการเดินทางใหม่ของ ODH (เริ่มเล็กได้ โตได้ ไม่ต้องย้ายเจ้า) + จุดเด่น AI+คนดูแล
- /services : เว็บไซต์, เว็บ/โมบายแอป, ระบบองค์กร, กราฟิก — แต่ละอันบอกว่าช่วยอะไร
- /talon : ขายเว็บไว ฿3,900 (โครงตาม Step 4) เน้น "AI เร็ว + ไม่พังเพราะมีทีมดูแล"
- /packages : บันได 4 ขั้น + แพ็กดูแลรายเดือน อธิบายความคุ้ม
- /work : ดันงานราชการ/มหาวิทยาลัย (เช่นระบบลงทะเบียน) ขึ้นก่อน + ผลลัพธ์/ความรับผิดชอบ
- /about : บริษัทเชียงใหม่, ทีม, ทำไมน่าไว้ใจ (จดทะเบียน, ออกใบกำกับภาษี, ผลงานจริง)
- /contact : ช่องทาง FB/โทร/LINE/แผนที่ + เวลาทำการ

อัปเดต content/*.ts ให้ตรง และใส่ meta description ≤160 ตัวอักษรทุกหน้า
หลีกเลี่ยง keyword stuffing — เขียนให้คนอ่านลื่นก่อน
```

---

# STEP 7 — Build & Deploy (Static + FTP)

**Goal:** ออก `out/` แล้วส่งขึ้นโฮสด้วย FTP ให้ทำซ้ำได้ด้วยคำสั่งเดียว

**Checklist**
- [ ] `pnpm build` ออก `apps/web/out/` ครบ (มี html ทุก route, sitemap, robots, assets)
- [ ] เช็ค `out/` เปิดด้วย static server แล้วลิงก์/รูป/route ทำงาน (trailingSlash)
- [ ] สคริปต์ `infra/ftp-deploy/` อัปโหลด `out/` ขึ้นโฮส (lftp mirror) อ่าน credential จาก env
- [ ] ตั้ง caching headers/`.htaccess` ที่โฮส (ถ้า Apache) สำหรับ asset hashed
- [ ] โดเมน owldayhouse.com ชี้ถูก, ทดสอบ live, ส่ง sitemap เข้า Google Search Console

**Claude Code Prompt**
```
ทำระบบ build + deploy แบบ static FTP สำหรับ apps/web

1) ยืนยัน next.config output:'export' ออก out/ ครบ; เพิ่ม root script "build:web" = turbo build --filter web
2) infra/ftp-deploy/deploy.sh:
   - ใช้ lftp mirror -R (reverse) จาก apps/web/out → โฮส
   - อ่าน FTP_HOST, FTP_USER, FTP_PASS, FTP_REMOTE_DIR จาก env (.env ไม่ commit)
   - มี --delete เพื่อลบไฟล์เก่าที่หายไป, exclude ไฟล์ระบบ
   - echo สรุปจำนวนไฟล์ + เตือนถ้า env ไม่ครบ
3) infra/ftp-deploy/README.md: วิธีตั้ง env + รัน (pnpm build:web && bash infra/ftp-deploy/deploy.sh)
4) ตัวอย่าง .htaccess (กรณีโฮส Apache): gzip + cache-control สำหรับ /_next/static (immutable),
   และ rule รองรับ trailingSlash/404 → /404.html
5) เพิ่ม checklist post-deploy ใน README: ทดสอบ live, Google Search Console submit sitemap

อย่าใส่ credential จริงในโค้ด ใช้ env ล้วน
```

---

# STEP 8 — (Optional) Go API บน AWS

**Goal:** เมื่อเริ่มทำ Talon backend (lead pipeline/dashboard) — สร้าง `apps/api` จาก `PROJECT_TEMPLATE.md` แล้ว deploy ถูกสุดบน AWS

> ทำ step นี้ **ต่อเมื่อจำเป็น** — เว็บการตลาดไม่ต้องใช้

**ปรับจาก template:**
- คง: Echo + GORM + MySQL + FX, layered/repository, JWT, validator, pagination, Docker multi-stage
- **ตัดออก:** service email/Gmail (ไม่ใช้เมลแล้ว) — เอา notification ไปทาง FB/LINE/manual แทน
- โดเมนเริ่มต้นสำหรับ Talon: `lead` (ตามสคีมาที่เราออกแบบไว้: place_id unique, status, flagged, note ฯลฯ)

**Deploy ถูกสุด (มีเครดิต AWS):**
- แนะนำ **Lightsail / EC2 `t4g.micro`** (free-tier ARM) รัน Docker (api + MySQL container หรือ RDS free-tier) — เหมาะกับ Echo ที่เป็น long-running + MySQL ของ template
- ทางเลือก: **ECS Fargate** (จ่ายตามใช้) หรือ **App Runner** (ง่าย)
- Lambda ใช้ได้ก็ต่อเมื่อ refactor เป็น stateless + ใช้ RDS Proxy (ไม่แนะนำกับ template นี้ตอนแรก)

**Checklist**
- [ ] `apps/api` ตาม convention ใน `PROJECT_TEMPLATE.md` (pkg/models|store|handlers|services|utils)
- [ ] ลบ email service + env Gmail ออกหมด, แก้ main.go/Server ให้ไม่อ้างถึง
- [ ] โดเมน `lead` ครบ (model+store+handler+routes+migration) ตามสคีมา Talon
- [ ] `docker-compose.yml` (api+mysql) รัน local ได้, `go run main.go up` migration ผ่าน
- [ ] Dockerfile multi-stage build ได้ image เล็ก
- [ ] infra/aws มี README ขั้นตอน deploy (Lightsail/EC2 + Docker) + security group + env
- [ ] CORS อนุญาตเฉพาะโดเมนเว็บ + Talon dashboard

**Claude Code Prompt**
```
สร้าง apps/api เป็น Go REST API โดยยึดสถาปัตยกรรมจากไฟล์ PROJECT_TEMPLATE.md ทุกประการ
(Echo v4 + GORM + MySQL + Uber FX + JWT + validator + gormigrate + Docker multi-stage,
layered/repository, JSON snake_case, error shape {"error":"..."}, port 5000, tz Asia/Bangkok)

ความต่างจาก template:
- ลบ service email/Gmail และ env GMAIL_* ทั้งหมด (โปรเจกต์นี้ไม่ใช้อีเมล) แก้ main.go, config, Server ให้ไม่อ้างถึง
- คง storage R2 ไว้ได้ (เผื่อเก็บรูปเว็บที่ generate)

สร้างโดเมน "lead" สำหรับ Talon ตามสคีมา:
- model Lead: place_id(uniqueIndex) name category niche area rating reviews phone email address
  has_website website_uri status(new|queued|built|pitched|won|rejected|noreply) flagged note
  preview_url pitched_at created_at updated_at + LeadStore interface + ListLeadQuery(pagination+filter status/niche)
- store/lead/lead.store.go ตาม pattern repository
- handlers/api/lead.handler.go: list(filter+pagination), get, create(upsert by place_id), updateStatus, addNote, toggleFlag
- register ใน main.go (fx.Provide) + api.go routes (กลุ่ม /api ป้องกันด้วย JWT)
- migration เพิ่ม Lead ใน AutoMigrate

เพิ่ม:
- docker-compose.yml (api + mysql:8.0, tz Asia/Bangkok) ตาม template
- infra/aws/README.md: ขั้นตอน deploy ถูกสุดบน Lightsail หรือ EC2 t4g.micro ด้วย Docker
  (อัปโหลด image/compose, security group เปิด 443/5000, env, reverse proxy/caddy สำหรับ TLS)
- CORS: อนุญาตเฉพาะ https://owldayhouse.com และโดเมน dashboard

ยืนยัน: go build ผ่าน, go run main.go up รัน migration ได้บน mysql ของ compose
```

---

# STEP 9 — (Optional) Cloudflare Path

**Goal:** ถ้าหน้าบ้านโหดขึ้น/อยากได้ CDN + CI + preview แทน FTP

**Checklist**
- [ ] เชื่อม repo กับ Cloudflare Pages, build `pnpm --filter web build`, output dir `apps/web/out`
- [ ] ตั้ง custom domain owldayhouse.com + SSL อัตโนมัติ
- [ ] (ถ้าต้อง edge logic) Cloudflare Workers สำหรับ redirect/geo/A-B — แยกใน `infra/cloudflare`
- [ ] เก็บ FTP ไว้เป็น fallback ได้

**Claude Code Prompt**
```
เพิ่มทางเลือก deploy ผ่าน Cloudflare Pages สำหรับ apps/web (เก็บ FTP ไว้เป็น fallback)

1) infra/cloudflare/README.md: ตั้ง Cloudflare Pages เชื่อม git
   - build command: pnpm install && pnpm --filter web build
   - build output directory: apps/web/out
   - root: monorepo (ตั้ง env PNPM + NODE_VERSION)
   - custom domain owldayhouse.com + SSL
2) (option) ตัวอย่าง Cloudflare Worker ใน infra/cloudflare/worker/ สำหรับ edge redirect/headers
   เช่น เพิ่ม security headers หรือ redirect www→apex
3) บันทึกข้อต่าง: static export ใช้ได้ตรง ๆ ไม่ต้อง next-on-pages; ถ้าอนาคตต้อง SSR ค่อยพิจารณา

ไม่ต้องผูก vendor — ทำให้ FTP กับ Cloudflare สลับกันได้
```

---

# STEP 10 — Launch & Marketing Ops

**Goal:** ปล่อยจริง + ตั้งระบบให้ติด Google และเก็บลูกค้าผ่าน Facebook

**Checklist (ปล่อยเว็บ)**
- [ ] Lighthouse: SEO ≥95, Performance/Best Practices/Accessibility เขียว
- [ ] ทุกลิงก์ใช้งานได้, รูปมี alt, mobile ดูดี, ปุ่ม Messenger/โทร/LINE ใช้จริง
- [ ] sitemap ส่งเข้า **Google Search Console** + verify โดเมน
- [ ] ตั้ง **Google Business Profile** (เชียงใหม่) เชื่อมเว็บ — local SEO
- [ ] OG ทดสอบด้วย Facebook Sharing Debugger ให้ภาพ/หัวข้อขึ้นถูก
- [ ] Analytics เก็บ event ได้ (Plausible/GA4)

**Checklist (การตลาดต่อเนื่อง)**
- [ ] หน้า `/talon` เป็น landing สำหรับยิงแคมเปญ/โพสต์ FB
- [ ] เก็บรีวิว/เคสลูกค้ารายแรก ๆ มาขึ้น `/work`
- [ ] เขียนบทความ/ข่าว (`/news` ภายหลัง) จับ keyword ท้องถิ่น = SEO ระยะยาว
- [ ] footer "by Owl Day House" บนเว็บไวลูกค้าทุกเว็บ = backlink + brand (จาก Talon)

**Claude Code Prompt**
```
ทำ pre-launch QA + ไฟล์ช่วยการตลาดให้ apps/web

1) สร้าง docs/LAUNCH_CHECKLIST.md รวม:
   - ขั้นตอน Google Search Console (verify ด้วย DNS/HTML), submit sitemap
   - ตั้ง Google Business Profile เชียงใหม่ + ลิงก์เว็บ
   - ทดสอบ OG ด้วย Facebook Sharing Debugger
   - เกณฑ์ Lighthouse ที่ต้องผ่าน
2) ตรวจทั้งเว็บ: h1 เดียว/หน้า, alt รูปครบ, internal links ไม่ตาย, metadata ครบทุก route
   แล้วสรุปจุดที่ต้องแก้เป็น report
3) เพิ่ม utm helper เล็ก ๆ (lib) ให้ปุ่ม CTA ไป Messenger แนบ utm_source ได้ (เช่นจากโพสต์ FB)
4) เตรียมโครง /news (blog) แบบ static (อ่านจาก content/posts/*.mdx) ไว้ทำ SEO ระยะยาว — โครงเปล่าพอ

รันตรวจแล้วรายงานผลให้ครบก่อนปล่อยจริง
```

---

## สรุป Flow การทำงาน

```
Step 0 scaffold → 1 brand → 2 next static → 3 โครงหน้า/nav → 4 hero+ladder+Talon
      → 5 SEO → 6 เนื้อหาไทย → 7 build+FTP  ✅ ปล่อยเว็บได้
(optional) 8 Go API บน AWS · 9 Cloudflare · 10 launch ops + การตลาด
```

**เว็บการตลาดพร้อมปล่อยจบที่ Step 7** — Step 8 ขึ้นไปทำเมื่อพร้อมขยาย Talon เป็นระบบจริง

ทุก step: copy prompt → Claude Code ทำ → ติ๊ก checklist → `pnpm lint && pnpm build` → commit → ต่อ
