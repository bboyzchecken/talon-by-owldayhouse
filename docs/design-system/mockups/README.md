# ภาพจำลองหน้าจอของผลงานเก่า

ไฟล์ในโฟลเดอร์นี้คือ "ต้นฉบับ" ของภาพจำลองที่ใช้ในหน้า `/work/` สำหรับระบบที่ปิดไปแล้ว
หรือไม่ได้เปิดตัว ซึ่งไม่มีหน้าจอจริงให้ถ่าย

**ข้อมูลในภาพทุกอย่างเป็นของสมมติ** ทั้งชื่อคน ร้านค้า ออเดอร์ ตัวเลข และเลขที่หนังสือ
ห้ามใส่ข้อมูลจริงของลูกค้า และห้ามนำภาพประกอบของแบรนด์อื่นจากรีโปเดิมมาใช้ซ้ำ
(รีโปของ FAN มีภาพโฆษณาของแบรนด์อื่นติดมาด้วย จึงวาดหน้าแอปขึ้นใหม่แทน)

สีในแต่ละไฟล์ลอกมาจาก `tailwind.config.js` ของโปรเจกต์นั้นจริง ๆ เพื่อให้หน้าตาใกล้ของเดิม
ไม่ใช่สีแบรนด์ของ ODH จึง hardcode hex ไว้ในไฟล์เหล่านี้ได้ (กฎห้าม hardcode ใช้กับ
คอมโพเนนต์ของเว็บ ไม่ใช่ภาพจำลอง)

| ไฟล์ | ใช้เป็น | ผลงาน |
| --- | --- | --- |
| `fan-delivery-admin.html` | `/portfolio/fan-delivery-admin.webp` | FAN Delivery (หลังบ้าน + แอปลูกค้า) |
| `encourage-board.html` | `/portfolio/encourage-board.webp` | กระดานระบายและให้กำลังใจ |
| `e-saraban.html` | `/portfolio/e-saraban.webp` | E-Saraban |
| `gameconnext-seller.html` | `/portfolio/gameconnext-seller.webp` | GameConnext |

## วิธีสร้างภาพใหม่

แต่ละไฟล์ตั้งขนาดไว้ที่ 1280×640 เท่ากับภาพอื่นในหน้าผลงาน เสิร์ฟโฟลเดอร์นี้ แล้วถ่ายด้วย
headless Chrome ที่ 2 เท่า ก่อนย่อและแปลงเป็น webp

```bash
python3 -m http.server 8977 --directory docs/design-system/mockups &
CH="$HOME/Library/Caches/ms-playwright/chromium-1234/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing"
"$CH" --headless --disable-gpu --no-sandbox --hide-scrollbars --force-device-scale-factor=2 \
  --window-size=1280,640 --screenshot=/tmp/shot.png http://localhost:8977/fan-delivery-admin.html
python3 -c "from PIL import Image; Image.open('/tmp/shot.png').convert('RGB').resize((1280,640), Image.LANCZOS).save('/tmp/shot-1280.png')"
cwebp -q 86 /tmp/shot-1280.png -o apps/web/public/portfolio/fan-delivery-admin.webp
```

อย่าใช้ `--headless=new` คู่กับ `--user-data-dir` เพราะมันค้างไม่ยอมถ่าย

ฟอนต์ไทยโหลดจาก Google Fonts ตอนถ่าย ถ้าเครื่องออกเน็ตไม่ได้ ตัวอักษรจะตกไปใช้ฟอนต์ระบบ
และภาพจะหน้าตาไม่เหมือนเดิม
