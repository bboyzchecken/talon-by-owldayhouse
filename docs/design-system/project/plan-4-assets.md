# แผน 4: ภาพและ asset

## ภาพคอนเซปต์ที่เจนแล้ว

| ภาพ | ใช้ที่ |
| --- | --- |
| `eye` | `EyeHero` |
| `build` | `ThreeActs`, ภาพใน Hero |
| `kiosk` | `ThreeActs`, ภาพใน Hero, Event Interactive |
| `grow` | `ThreeActs`, Digital Marketing |
| `camera` | Event Content |
| `listening` | Social Listening |
| `event-hall` | KOL ชั่วคราว, หน้าเกี่ยวกับเรา |

## ยังเจนไม่ได้

เครดิต BFL ไม่พอ ภาพ `creator` สำหรับ KOL และภาพ `lens` สำหรับหน้าเครื่องมือยังไม่มี

## ของเดิม

| Asset | การใช้งานต่อไป |
| --- | --- |
| โลโก้ใหม่ไม่มีคำบรรยาย, `OwlMark` | ทุกหน้า |
| `reg-tu-ac-th.webp`, `rodarea.webp`, `youwantgpu.webp` | `WorkEditorial` ถ่ายใหม่ขนาดเท่ากัน |
| `pezy.jpg`, `speek.jpg`, `intersant.jpg` | เลิกใช้ เป็นบอร์ดนำเสนอที่มีโลโก้เก่า งานเหล่านี้แสดงเป็นข้อความ |
| `Illustrations`, `Showcase` | เอกสารและเครื่องมือภายในเท่านั้น |
| `og.png`, `ODH_Banding*.svg` | เลิกใช้ ต้องทำใหม่ด้วยโลโก้ใหม่และไม่มีราคา |

## สิ่งที่ต้องหาเพิ่มก่อนเปิดเว็บ

| ลำดับ | สิ่งที่ต้องมี | ใช้ที่ |
| --- | --- | --- |
| สำคัญมาก | ภาพจริงเกมบน Kiosk พร้อมคนเล่น | Event Interactive |
| สำคัญมาก | เคส KOL อย่างน้อย 1 เคสที่ได้รับอนุญาต | KOL |
| สำคัญมาก | ภาพและคลิปจากหน้างานอีเวนต์ | Event Content |
| สำคัญมาก | ผลลัพธ์แคมเปญโฆษณา 1 เคส พร้อมตัวเลขที่อนุญาต | Digital Marketing |
| สำคัญ | ชื่อพาร์ตเนอร์ Social Listening และสิทธิ์ใช้ชื่อ | Social Listening |
| สำคัญ | ตัวเลขบริษัทที่ตรวจสอบได้ | `StatRow` |
| เสริม | ยืนยัน LINE Official ID | ปุ่มติดต่อ |

# เครื่องมือที่ใช้สร้างเว็บจริง

| เครื่องมือ | ใช้ทำอะไร | สถานะ |
| --- | --- | --- |
| Framer Motion | สั่งงาน scroll ใน React | มีใน repo แล้ว |
| GSAP ScrollTrigger | ช่วงตรึงหน้าจอที่ต้องแม่นยำ | ต้องติดตั้ง |
| Lenis | การเลื่อนที่นุ่มลื่น | ต้องติดตั้ง |
| BFL FLUX | ภาพนิ่งคอนเซปต์ | ใช้ได้ เครดิตเหลือน้อย |
| Higgsfield และ skill scroll-world | ทำคลิปแล้วเลื่อนเล่นทีละเฟรม | ต้องอนุมัติ MCP และมีเครดิต |
| ffmpeg | ตัดคลิปเป็นเฟรมภาพ | ต้องติดตั้งเมื่อทำ frame sequence |

เครื่องมือทั้งหมดทำงานฝั่งเบราว์เซอร์ จึงใช้กับ static export ได้
