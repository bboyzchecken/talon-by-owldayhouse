# แผน 2: โครงเว็บใหม่

## แผนผังเว็บ

| URL | หน้า | หมายเหตุ |
| --- | --- | --- |
| `/` | หน้าแรก | ลำดับ section อยู่ด้านล่าง |
| `/services/` | ภาพรวม 3 เสา | ใช้ URL เดิม รักษา SEO |
| `/services/website-software/` | เว็บไซต์และซอฟต์แวร์ | ใหม่ |
| `/services/event-interactive/` | Event Interactive | ใหม่ |
| `/services/kol-influencer/` | KOL และ Influencer | ใหม่ |
| `/services/event-content/` | Event Content และรีวิว | ใหม่ |
| `/services/digital-marketing/` | Digital Marketing | ใหม่ |
| `/services/social-listening/` | Social Listening และรายงาน | ใหม่ |
| `/tools/` | เครื่องมือของแบรนด์ | ใหม่ |
| `/work/` | ผลงาน | ปรับ |
| `/news/` | บทความและรายงาน | ปรับเนื้อหา |
| `/about/` | เกี่ยวกับเรา | เขียนใหม่ |
| `/contact/` | ติดต่อ | อีเมล Messenger, LINE, โทรศัพท์ |

เมนูหลัก: บริการ, ผลงาน, เครื่องมือ, บทความ, เกี่ยวกับเรา และปุ่ม "คุยโปรเจกต์"

## ลำดับหน้าแรก

| ลำดับ | Component | หน้าที่ |
| --- | --- | --- |
| 1 | `SiteHeader` | นำทาง |
| 2 | `EyeHero` | ตำแหน่งบริษัทและลูกเล่นหลัก |
| 3 | `StatementFill` | เหตุผลที่ต้องเป็นทีมเดียว |
| 4 | `ThreeActs` | เล่า 3 เสา |
| 5 | `BrandLoop` | แสดงว่า 3 เสาต่อกันเป็นวงเดียว |
| 6 | `ServiceIndex` | เข้าสู่ 6 บริการ |
| 7 | `WorkEditorial` | ผลงานที่เปิดใช้งานจริง 3 ชิ้นในกรอบเท่ากัน |
| 8 | `LogoMarquee` กับ `StatRow` | ความน่าเชื่อถือ |
| 9 | `NewsList` | บทความและรายงาน |
| 10 | `ContactClose` | ปิดด้วยการชวนคุย |
| 11 | `SiteFooter` | ข้อมูลบริษัท |

## แม่แบบหน้าบริการ

1. หัวเรื่อง `h1` พร้อมภาพใหญ่
2. ปัญหาที่บริการนี้แก้ และสิ่งที่ส่งมอบ
3. `StatementFill` หรือตัวอย่างเล่นได้ เช่น `TouchDemo` หนึ่งช่วง
4. เครื่องมือที่ใช้ และ `CapabilityTag`
5. ผลงานที่เกี่ยวข้อง
6. `ContactClose`

## URL ที่ย้าย

เว็บ deploy ผ่าน FTP จึงตั้ง 301 ใน `infra/ftp-deploy/htaccess.example`

| จาก | ไป |
| --- | --- |
| `/talon/` | `/services/website-software/` |
| `/packages/` | `/services/` |

## ลำดับการทำ

| ระยะ | งาน | ขึ้นกับ |
| --- | --- | --- |
| 0 | commit งานที่ค้างอยู่ แล้วแตก branch | ไม่มี |
| 1 | เอา Talon และราคาออก ตาม "แผน 3" | ระยะ 0 |
| 2 | ปรับ token ฟอนต์ และโลโก้ใน `packages/brand` และ `packages/ui` | ยืนยัน DS |
| 3 | สร้างหน้าแรกและหน้าบริการ พร้อมลูกเล่นการเลื่อน | ระยะ 2, ข้อความที่อนุมัติ |
| 4 | SEO ใหม่: metadata, JSON-LD, sitemap, OG image | ระยะ 3 |
| 5 | ใส่เคสจริงของ Activate และ Grow แล้วเปิดเว็บ | ภาพและเคสจาก "แผน 4" |
