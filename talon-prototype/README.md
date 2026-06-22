# 🦉 Talon — by Owl Day House

ระบบหาลีดกึ่งอัตโนมัติ: **หาธุรกิจที่ยังไม่มีเว็บ → สร้างเว็บตัวอย่าง → ส่งเมลเสนอขาย → ติดตามสถานะ**
ระบบทำงานให้ทั้ง pipeline แต่ "คน" เป็นคนปิดการขายเอง

ผลิตภัณฑ์ภายใต้ **บริษัท อาวล์ เดย์ เฮ้าส์ จำกัด** · owldayhouse.com
แบรนด์: Owl Gold `#E9A41B` · Owl Navy `#28254C`

---

## โครงสร้างระบบ

```
            ┌─────────────────────────────────────────────┐
            │              Talon Dashboard (React)         │
            │     ดูลีด · เปลี่ยนสถานะ · ดูเว็บ · ร่างเมล      │
            └───────────────┬─────────────────────────────┘
                            │
     ┌──────────────────────┼──────────────────────┐
     ▼                      ▼                      ▼
[1] /api/places       [2] worker             [3] /api/send-email
 Google Places API     generate-site.js        Resend
 หาธุรกิจไม่มีเว็บ        สร้าง+deploy เว็บ        ส่งเมล → mark pitched
     │                      │                      │
     └──────────────────────┴──────────────────────┘
                            ▼
                    Supabase (Postgres)
              leads · outreach_log  (สถานะถาวร)
```

## Stack

| ส่วน | ใช้ | ทำไม |
|---|---|---|
| Frontend | React (`Talon.jsx`) | dashboard, แก้เองได้ |
| Backend | Vercel Serverless | ซ่อน API key, เลี่ยง CORS |
| Database | Supabase (Postgres) | เก็บสถานะ + กันลีดซ้ำ (`place_id` unique) |
| หาลีด | Google Places API (New) | ข้อมูลธุรกิจ + เช็คมี/ไม่มีเว็บ |
| ส่งเมล | Resend | ถูก, deliverability ดี |
| Host เว็บที่สร้าง | Vercel / Netlify / Supabase Storage | subdomain ต่อร้าน |

---

## ไฟล์ในโปรเจกต์

```
talon/
├── Talon.jsx            # dashboard (รีแบรนด์แล้ว)
├── schema.sql           # ตาราง Supabase — รันครั้งเดียว
├── api/
│   ├── places.js        # [1] หาลีด (กรองไม่มีเว็บ)
│   └── send-email.js    # [3] ส่งเมล + mark pitched
└── lib/
    └── generate-site.js # [2] สร้างเว็บจากข้อมูลลีด
```

---

## ขั้นตอน deploy (≈ 30 นาที)

**1. Supabase** — สร้างโปรเจกต์ → SQL Editor → รัน `schema.sql`
เก็บค่า: `SUPABASE_URL`, `SUPABASE_SERVICE_KEY` (service role)

**2. Google Places** — เปิด Google Cloud project → เปิดใช้ *Places API (New)* → สร้าง API key → เก็บ `GOOGLE_PLACES_KEY`
> มี free credit รายเดือน, หลังจากนั้นคิดตาม usage — ตั้ง quota กันบิลบาน

**3. Resend** — สมัคร → verify โดเมน (เช่น `mail.owldayhouse.com`) → เก็บ `RESEND_API_KEY`, ตั้ง `RESEND_FROM` เช่น `Owl Day House <hello@owldayhouse.com>`

**4. Vercel** — เอา repo ขึ้น → ใส่ env ทั้งหมด → deploy
`npm i @supabase/supabase-js` ก่อน (ใช้ใน api/)

**5. Dashboard** — สลับ mock เป็น API จริง:
```js
// ใน Talon.jsx > runSearch()
const r = await fetch(`/api/places?niche=${niche}&area=${area}&save=1`);
const { leads } = await r.json();
setLeads(ls => [...leads, ...ls]);
```

### ENV ทั้งหมด
```
GOOGLE_PLACES_KEY=
SUPABASE_URL=
SUPABASE_SERVICE_KEY=
RESEND_API_KEY=
RESEND_FROM=Owl Day House <hello@owldayhouse.com>
```

---

## Flow การทำงาน

1. **หา** — เลือก niche + พื้นที่ → `/api/places` คืนเฉพาะร้านที่ `website_uri` ว่าง → บันทึกลง `leads` (`status=new`)
2. **คิว** — กดเลือกลีดที่น่าสนใจ → `status=queued`
3. **สร้าง** — worker หยิบ queued → `generateSiteHTML()` → deploy → เก็บ `preview_url` → `status=built`
4. **เสนอขาย** — ร่างเมลแนบ `preview_url` → `/api/send-email` → `status=pitched` (มีกันส่งซ้ำใน 7 วัน)
5. **ปิดการขาย** — **คนคุยเอง** → อัปเดต `won` / `rejected` / `noreply`

---

## ⚠️ ข้อควรระวัง (สำคัญ)

- **อย่า scrape Google Maps ตรง ๆ** — ผิด ToS เสี่ยงโดนแบน ใช้ Places API ที่จ่ายตาม usage แทน
- **PDPA** — cold email ในไทยควรมีลิงก์ยกเลิก/ที่มาข้อมูลชัดเจน, เริ่ม volume น้อย, ใช้น้ำเสียงเหมือนคนจริง deliver ดีกว่า mass
- **ตั้ง quota Places API** กันค่าใช้จ่ายพุ่งตอนทดสอบ
- เปิด **RLS** ใน Supabase ก่อนขึ้น production

---

## ต่อยอด

- Build queue จริงด้วย Supabase cron / pg_cron
- Upsell ใน dashboard: SEO, Google Ads, LINE OA
- โดเมนต่อร้าน + ระบบ go-live เมื่อปิดการขายได้
- Dashboard รายเดือน: ลีด/สัปดาห์, conversion ต่อ niche
