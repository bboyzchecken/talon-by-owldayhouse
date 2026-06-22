# Owl Day House — โปรเจกต์รีแบรนด์ + Talon

ชุดไฟล์ทั้งหมดจากการวางแผน พร้อมเริ่ม build ได้เลย

## เริ่มยังไง

1. แตกโฟลเดอร์นี้เป็น **โฟลเดอร์ทำงานของคุณ** (จะเป็น root ของ monorepo)
2. เปิดด้วย **Claude Code**
3. มันจะอ่าน `CLAUDE.md` อัตโนมัติ (รู้ stack + แบรนด์ + กติกาแล้ว)
4. เปิด `BUILD_PLAN.md` → ทำ **Step 0** (copy prompt ไปวาง) → ติ๊ก checklist → commit → ต่อ Step 1, 2, …
5. **เว็บพร้อมปล่อยจบที่ Step 7** (FTP ขึ้นโฮส) · Step 8–10 ทำเมื่อพร้อมขยาย

> ตอนรัน Step 0 บอก Claude Code ให้ scaffold **ในโฟลเดอร์ปัจจุบัน** (ไม่งั้นมันอาจสร้าง subfolder ซ้อน)

## ไฟล์ในชุดนี้

| ไฟล์ | คืออะไร |
|---|---|
| **CLAUDE.md** | context ที่ Claude Code โหลดอัตโนมัติทุก session (stack, แบรนด์, กติกา) |
| **BUILD_PLAN.md** | แผนหลัก 11 step พร้อม checklist + prompt ต่อ step |
| **PROJECT_TEMPLATE.md** | Go API starter — ใช้ใน Step 8 (อย่าลบ Claude Code ต้องอ้างอิง) |
| **talon-prototype/** | โค้ดต้นแบบที่ใช้ได้จริง (อ้างอิง) |

## talon-prototype/ (ใช้ได้เลยตอนนี้)

โค้ดต้นแบบของระบบ Talon — รัน/ดูได้ทันที ไม่ต้องรอ build เว็บใหญ่:

| ไฟล์ | ใช้ทำอะไร |
|---|---|
| `Talon.jsx` | dashboard จัดการลีด (หา → สร้างเว็บ → เสนอขาย → ติดตามสถานะ) |
| `pricing.html` | หน้าแพ็กเกจ ODH (เปิดในเบราว์เซอร์โชว์ลูกค้าได้เลย) |
| `schema.sql` | ตาราง Supabase สำหรับ Talon |
| `api/places.js` | หาลีดจาก Google Places (กรองร้านไม่มีเว็บ) + ดึงรีวิว/รูป |
| `api/send-email.js` | ส่งเมลเสนอขาย (Resend) — *หมายเหตุ: ทิศทางใหม่ติดต่อผ่าน FB แล้ว ไฟล์นี้เป็นทางเลือก* |
| `lib/generate-content.js` | ให้ Claude เขียนเนื้อหาเว็บจากข้อมูลร้าน + รีวิว |
| `lib/generate-site.js` | ประกอบเป็นหน้าเว็บ landing จากเนื้อหา + รูป |

> โค้ดส่วน Go ใน Step 8 จะ build ใหม่จาก `PROJECT_TEMPLATE.md` โดยยกตรรกะ `lead` จากต้นแบบนี้ไป

## ภาพรวมแผน

```
รีแบรนด์ ODH → เว็บ static (Next.js) + SEO → เปิดตัว Talon (เว็บไว ฿3,900)
ติดต่อผ่าน Facebook → FTP ขึ้นโฮส → (ภายหลัง) Go API + dashboard เต็มระบบ
```

แบรนด์คงเดิม: **Owl Gold #E9A41B + Owl Navy #28254C** · ติดต่อ: m.me/owldayhouse · 092-455-2450
