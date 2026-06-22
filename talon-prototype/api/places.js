// ============================================================
//  /api/places.js  — Vercel Serverless Function (Node 18+)
//  [1] หาธุรกิจจาก Google Places API (New) → กรองเฉพาะ "ยังไม่มีเว็บ"
//  ENV: GOOGLE_PLACES_KEY, (option) SUPABASE_URL, SUPABASE_SERVICE_KEY
//  เรียกใช้:  GET /api/places?niche=คาเฟ่&area=เอกมัย
// ============================================================
import { createClient } from "@supabase/supabase-js";

const FIELD_MASK = [
  "places.id",
  "places.displayName",
  "places.formattedAddress",
  "places.rating",
  "places.userRatingCount",
  "places.websiteUri",
  "places.nationalPhoneNumber",
  "places.primaryTypeDisplayName",
  "places.reviews",   // ★ ข้อความรีวิวจริง — วัตถุดิบให้ Claude เขียน copy
  "places.photos",    // ★ รูปร้าน — เอาไปทำ hero background
].join(",");

export default async function handler(req, res) {
  const { niche = "", area = "", save = "0" } = req.query;
  if (!niche || !area) return res.status(400).json({ error: "ต้องระบุ niche และ area" });

  const key = process.env.GOOGLE_PLACES_KEY;
  if (!key) return res.status(500).json({ error: "ยังไม่ได้ตั้ง GOOGLE_PLACES_KEY" });

  try {
    const r = await fetch("https://places.googleapis.com/v1/places:searchText", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": key,
        "X-Goog-FieldMask": FIELD_MASK,
      },
      body: JSON.stringify({
        textQuery: `${niche} ${area}`,
        languageCode: "th",
        regionCode: "TH",
        maxResultCount: 20, // หน้าละ 20 — ถ้าต้องการมากกว่านี้ใช้ nextPageToken
      }),
    });

    const data = await r.json();
    if (!r.ok) return res.status(r.status).json({ error: data.error?.message || "Places error" });

    const leads = (data.places || []).map((p) => ({
      place_id: p.id,
      name: p.displayName?.text || "",
      category: p.primaryTypeDisplayName?.text || niche,
      niche,
      area,
      rating: p.rating || 0,
      reviews: p.userRatingCount || 0,
      phone: p.nationalPhoneNumber || "",
      address: p.formattedAddress || "",
      website_uri: p.websiteUri || null,
      has_website: Boolean(p.websiteUri),
      status: "new",
      // ข้อความรีวิว (สูงสุด 5) → ส่งต่อให้ generate-content.js
      reviews_text: (p.reviews || []).map((rv) => rv.text?.text).filter(Boolean).slice(0, 5),
      // ชื่ออ้างอิงรูปแรก → worker เอาไป resolve เป็น URL จริงทีหลัง (ดูหมายเหตุท้ายไฟล์)
      photo_ref: p.photos?.[0]?.name || null,
    }));

    // ★ ลีดดี = ยังไม่มีเว็บ
    const fresh = leads.filter((l) => !l.has_website);

    // บันทึกลง DB เลย (กันซ้ำด้วย place_id unique) ถ้าส่ง ?save=1
    if (save === "1" && process.env.SUPABASE_URL) {
      const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
      // ตัด field ชั่วคราว (reviews_text, photo_ref) ออกก่อนเซฟ — ใช้ตอน gen เท่านั้น
      const rows = fresh.map(({ reviews_text, photo_ref, ...row }) => row);
      await sb.from("leads").upsert(rows, { onConflict: "place_id", ignoreDuplicates: true });
    }

    res.status(200).json({ scanned: leads.length, no_website: fresh.length, leads: fresh });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
}

// ── หมายเหตุเรื่องรูป (photo_ref) ──
// Places คืน "ชื่ออ้างอิงรูป" ไม่ใช่ URL ตรง ๆ ต้อง resolve เป็นรูปจริงผ่าน:
//   https://places.googleapis.com/v1/{photo_ref}/media?maxWidthPx=1200&key=KEY
// ⚠️ อย่าใส่ URL ที่มี key ลงในหน้าเว็บ — ให้ worker ฝั่ง server fetch รูปมา
//    แล้วเก็บใน Supabase Storage / CDN ของเราเอง ค่อยใช้ลิงก์นั้นเป็น lead.photo_url
