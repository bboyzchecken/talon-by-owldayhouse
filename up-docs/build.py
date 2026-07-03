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
import pathlib

ROOT = pathlib.Path(__file__).parent

template = (ROOT / "template.html").read_text(encoding="utf-8")
reference = json.loads((ROOT / "files/reference.json").read_text(encoding="utf-8"))
templates = json.loads((ROOT / "files/templates.json").read_text(encoding="utf-8"))

# ฟอนต์ TH Sarabun New (subset ไทย+ละติน) — TODO(ask): สลับเป็น TH Sarabun ๙ เมื่อได้ไฟล์
font_regular = base64.b64encode((ROOT / "assets/fonts/THSarabunNew.woff2").read_bytes()).decode()
font_bold = base64.b64encode((ROOT / "assets/fonts/THSarabunNew-Bold.woff2").read_bytes()).decode()

out = (
    template
    .replace("__REF_JSON__", json.dumps(reference, ensure_ascii=False))
    .replace("__TPL_JSON__", json.dumps(templates, ensure_ascii=False))
    .replace("__FONT_R__", font_regular)
    .replace("__FONT_B__", font_bold)
)

dest = ROOT.parent / "apps/web/lib/up-docs/template.html"
dest.parent.mkdir(parents=True, exist_ok=True)
dest.write_text(out, encoding="utf-8")
print(f"เขียน {dest} ({len(out)/1024:.0f} KB)")
