# แผน 3: รายการเอา Talon และราคาออก

ตรวจจากโค้ดใน commit `ca3c6c6` รวมงานที่ยังไม่ commit ใน working tree

## ลบทั้งไฟล์

| ไฟล์ | เหตุผล |
| --- | --- |
| `apps/web/app/talon/page.tsx` | หน้าขาย Talon |
| `apps/web/app/packages/page.tsx` | หน้าราคา |
| `apps/web/components/TalonLaunch.tsx` | ส่วนโปรโมตในหน้าแรก |
| `apps/web/components/CarePlans.tsx` | ราคาดูแลรายเดือน |
| `apps/web/components/ValueLadder.tsx` | บันไดราคา |
| `apps/web/content/packages.ts` | ข้อมูลแพ็กเกจและ FAQ ราคา |
| `apps/web/content/ladder.ts` | ข้อมูลบันไดราคา |

## แก้ข้อความหรือลิงก์

| ไฟล์ | สิ่งที่ต้องแก้ |
| --- | --- |
| `apps/web/app/layout.tsx` | title, description, keywords ที่มี ฿3,900 และ Talon |
| `apps/web/app/page.tsx` | เอา `TalonLaunch` และ `ValueLadder` ออก |
| `apps/web/app/about/page.tsx` | ประโยค "เว็บแรกราคา ฿3,900" |
| `apps/web/app/work/page.tsx` | ประโยคปิดท้ายที่มีราคา |
| `apps/web/app/not-found.tsx` | ลิงก์ Talon และแพ็กเกจ |
| `apps/web/app/sitemap.ts` | เส้นทาง `/talon` และ `/packages` |
| `apps/web/app/news/page.tsx` | title และ description ที่มีคำว่าราคา |
| `apps/web/app/showcase/reveal/page.tsx` | description |
| `apps/web/components/Nav.tsx` | เมนูและปุ่ม "เริ่มเลย ฿3,900" |
| `apps/web/components/Footer.tsx` | ลิงก์ราคาและ "เสร็จใน 5 วัน" |
| `apps/web/components/Hero.tsx` | หัวเรื่องและปุ่ม |
| `apps/web/components/RevealHero.tsx` | ข้อความและปุ่ม |
| `apps/web/components/WhyUs.tsx` | ข้อความราคา |
| `apps/web/content/site.ts` | เมนู Talon, แพ็กเกจ และ tagline |
| `apps/web/content/portfolio.ts` | บรรทัด 82 ที่เขียนถึง ฿3,900 |
| `apps/web/lib/structured-data.ts` | `priceRange` และ `talonServiceSchema` |
| `apps/web/lib/seo.ts` | ตัวอย่างใน comment |
| `apps/web/.env.example` | comment ที่อ้างถึง Talon dashboard |
| `packages/ui/src/showcase.tsx`, `packages/ui/README.md` | ข้อความตัวอย่าง |
| `apps/web/public/og.png` | ในภาพมี "from 3,900 THB" ต้องทำภาพใหม่ |
| `infra/ftp-deploy/README.md` | ข้อความที่อ้างถึง Talon |
| `packages/ui/src/owl-logo.tsx`, `apps/web/public/brand/ODH_Banding*.svg` | เปลี่ยนเป็นโลโก้ไม่มี "THE SOFTWARE HOUSE" |
| `packages/brand/src/fonts.ts`, `theme.css`, `tokens.ts` | เปลี่ยนฟอนต์ สีพื้น และ token ตาม DS ใหม่ |

## บทความ

| ไฟล์ | แนวทางที่แนะนำ |
| --- | --- |
| `content/news/rab-tham-website-chiang-mai-rakha.tsx` | เขียนใหม่เป็น "วิธีเลือกทีมทำเว็บ" คง URL เดิม ตัดตัวเลขราคา |
| `content/news/rab-tham-website-krungthep.tsx` | ตัดราคาและลิงก์ Talon |
| `content/news/thurakit-chiang-mai-tong-mi-website.tsx` | ตัดลิงก์ Talon |
| `content/news/thurakit-prap-tua-yuk-ai.tsx` | ตัดลิงก์ Talon |
| `content/news.ts` | แก้ description และ keywords ทั้งหมดที่มีราคา |

บทความแรกเป็นคู่มือราคาตลาด และ keyword "ราคา" อาจมีผลต่ออันดับค้นหา การคง URL แล้วเปลี่ยนเนื้อหาจะเสียน้อยกว่าการลบ

## ไม่ต้องแก้

| ไฟล์ | เหตุผล |
| --- | --- |
| `apps/web/content/portfolio.ts` บรรทัด 44 | "ช่วงราคา" เป็นฟีเจอร์ของเว็บลูกค้า |
| `apps/web/lib/owl-docs/template.html` | เครื่องมือภายในสำหรับออกเอกสาร |
| `apps/web/public/up-docs/proposal/index.html` | เอกสารของลูกค้า |

## เอกสารและโค้ดฝั่ง repo

`CLAUDE.md` และ `BUILD_PLAN.md` ยังเขียนว่า Talon เป็น funnel หลัก และยังกำหนดฟอนต์กับพื้น paper แบบเดิม ต้องแก้พร้อมกัน ส่วน `talon-prototype/` และ `packages/query` เป็นโค้ดอ้างอิงที่ไม่แสดงบนเว็บ เก็บไว้หรือแยกออกได้ภายหลัง
