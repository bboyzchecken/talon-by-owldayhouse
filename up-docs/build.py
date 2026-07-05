#!/usr/bin/env python3
"""build.py — ประกอบ UP Docs เป็น HTML ไฟล์เดียว

อ่าน template.html + สเปก (files/templates.json, files/reference.json) + ฟอนต์ woff2
แล้วเขียนผลลัพธ์ไปที่ apps/web/lib/up-docs/template.html
(ถูก import เป็น raw string เข้า /up-docs ซึ่ง gate ด้วยรหัสผ่าน — ห้ามวางใน public/
เพราะไฟล์ใน public เข้าถึงตรงได้โดยไม่ผ่าน gate)

วิธีใช้:  python3 up-docs/build.py
"""
import base64
import json
import os
import pathlib

ROOT = pathlib.Path(__file__).parent

# Google Analytics 4 Measurement ID (แยก property ใต้บัญชี owldayhouse) — วัดการใช้งานเพื่อสรุป ROI
# ตั้งค่าผ่าน env UP_DOCS_GA_ID หรือไฟล์ up-docs/assets/ga_id.txt · ไม่ตั้ง = ไม่โหลด GA ไม่ส่งข้อมูล
ga_id = os.environ.get("UP_DOCS_GA_ID", "").strip()
ga_file = ROOT / "assets/ga_id.txt"
if not ga_id and ga_file.exists():
    ga_id = ga_file.read_text(encoding="utf-8").strip()

template = (ROOT / "template.html").read_text(encoding="utf-8")
reference = json.loads((ROOT / "files/reference.json").read_text(encoding="utf-8"))
templates = json.loads((ROOT / "files/templates.json").read_text(encoding="utf-8"))

# ฟอนต์ TH Sarabun New (subset ไทย+ละติน) — TODO(ask): สลับเป็น TH Sarabun ๙ เมื่อได้ไฟล์
font_regular = base64.b64encode((ROOT / "assets/fonts/THSarabunNew.woff2").read_bytes()).decode()
font_bold = base64.b64encode((ROOT / "assets/fonts/THSarabunNew-Bold.woff2").read_bytes()).decode()


# ── TTF (subset) สำหรับ "ฝังลงในไฟล์ .docx" — Word/LibreOffice เรนเดอร์ TH Sarabun ได้แม้เครื่องไม่มีฟอนต์
def subset_ttf_b64(src):
    from fontTools.subset import Subsetter, Options
    from fontTools.ttLib import TTFont
    import io

    unis = (
        set(range(0x20, 0x7F))
        | {0xA0, 0xAB, 0xBB, 0x2026}
        | set(range(0x0E00, 0x0E80))          # ไทย
        | set(range(0x2013, 0x2015))          # – —
        | set(range(0x2018, 0x201E))          # ' ' " "
    )
    font = TTFont(src)
    opts = Options()
    opts.name_IDs = ["*"]                     # เก็บชื่อฟอนต์ไว้ (Word ต้อง match ชื่อ)
    opts.layout_features = ["*"]
    opts.notdef_outline = True
    ss = Subsetter(options=opts)
    ss.populate(unicodes=unis)
    ss.subset(font)
    buf = io.BytesIO()
    font.save(buf)
    return base64.b64encode(buf.getvalue()).decode()


try:
    ttf_regular = subset_ttf_b64(ROOT / "assets/fonts/THSarabunNew.ttf")
    ttf_bold = subset_ttf_b64(ROOT / "assets/fonts/THSarabunNew-Bold.ttf")
    print("ฝังฟอนต์ .docx: TH Sarabun New (subset TTF, obfuscated ในเบราว์เซอร์)")
except Exception as e:
    # ไม่มี fontTools → ข้ามการฝังฟอนต์ (docx ยังใช้ได้ อ้างชื่อฟอนต์เฉย ๆ)
    # ต้องใช้ python ที่มี fontTools เช่น /Library/Frameworks/Python.framework/Versions/3.11/bin/python3
    ttf_regular = ttf_bold = ""
    print(f"⚠️  ข้ามการฝังฟอนต์ .docx (ไม่มี fontTools?): {e}")

# ตรามหาวิทยาลัยพะเยา — วางไฟล์ชื่อ up-crest.svg หรือ up-crest.png ใน assets/logo/
# มีไฟล์ = ฝังเป็น data URI บนหัวจดหมาย · ไม่มี = หัวจดหมายไม่มีตรา (ไม่ error)
crest = ""
for name, mime in (("up-crest.svg", "image/svg+xml"), ("up-crest.png", "image/png")):
    p = ROOT / "assets/logo" / name
    if p.exists():
        crest = f"data:{mime};base64," + base64.b64encode(p.read_bytes()).decode()
        print(f"ฝังตรา: {name} ({p.stat().st_size/1024:.0f} KB)")
        break
if not crest:
    print("ไม่พบไฟล์ตราใน assets/logo/ (up-crest.svg|png) — หัวจดหมายจะไม่มีตรา")

out = (
    template
    .replace("__REF_JSON__", json.dumps(reference, ensure_ascii=False))
    .replace("__TPL_JSON__", json.dumps(templates, ensure_ascii=False))
    .replace("__FONT_R__", font_regular)
    .replace("__FONT_B__", font_bold)
    .replace("__TTF_R__", ttf_regular)
    .replace("__TTF_B__", ttf_bold)
    .replace("__CREST__", crest)
    .replace("__GA_ID__", ga_id)
)
print(f"GA4: {'เปิด (' + ga_id + ')' if ga_id else 'ปิด (ไม่ตั้งค่า — ไม่ส่งข้อมูล)'}")

dest = ROOT.parent / "apps/web/lib/up-docs/template.html"
dest.parent.mkdir(parents=True, exist_ok=True)
dest.write_text(out, encoding="utf-8")
print(f"เขียน {dest} ({len(out)/1024:.0f} KB)")

# ── Proposal (เอกสารเสนอราคา) — เผยแพร่เป็นหน้า static เปิดได้ที่ /up-docs/proposal/
# ไม่มี gate, ไม่ลิงก์จากที่ไหน, noindex — ใช้เป็นลิงก์คุยกับคณะตอนประชุม
# ไม่มี GA (คนละเรื่องกับ usage/ROI) — แนบรูป analytics-report.png เองภายหลังได้
prop_src = ROOT / "proposal"
prop_dest = ROOT.parent / "apps/web/public/up-docs/proposal"
prop_dest.mkdir(parents=True, exist_ok=True)
(prop_dest / "index.html").write_text(
    (prop_src / "proposal.html").read_text(encoding="utf-8"), encoding="utf-8"
)
copied = ["index.html"]
for extra in ("analytics-report.png", "analytics-report.jpg"):
    if (prop_src / extra).exists():
        (prop_dest / extra).write_bytes((prop_src / extra).read_bytes())
        copied.append(extra)
print(f"เผยแพร่ proposal → {prop_dest} ({', '.join(copied)})")
