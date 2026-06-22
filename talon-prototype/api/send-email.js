// ============================================================
//  /api/send-email.js  — Vercel Serverless Function
//  [3] ส่งเมลเสนอขายผ่าน Resend → mark สถานะ "pitched" ใน Supabase
//  ENV: RESEND_API_KEY, RESEND_FROM, SUPABASE_URL, SUPABASE_SERVICE_KEY
//  เรียกใช้:  POST /api/send-email  { lead_id, to, subject, html }
// ============================================================
import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST เท่านั้น" });

  const { lead_id, to, subject, html } = req.body || {};
  if (!to || !subject || !html) return res.status(400).json({ error: "ข้อมูลไม่ครบ (to, subject, html)" });

  const sb = process.env.SUPABASE_URL
    ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
    : null;

  // กันส่งซ้ำ: ถ้าลีดนี้ pitched แล้วใน 7 วัน ไม่ส่งอีก
  if (sb && lead_id) {
    const { data: lead } = await sb.from("leads").select("status, pitched_at").eq("id", lead_id).single();
    if (lead?.status === "pitched" && lead.pitched_at) {
      const days = (Date.now() - new Date(lead.pitched_at)) / 86400000;
      if (days < 7) return res.status(409).json({ error: "ลีดนี้เพิ่งเสนอไปแล้ว (กันสแปม)" });
    }
  }

  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from: process.env.RESEND_FROM, to, subject, html }),
    });
    const data = await r.json();
    if (!r.ok) return res.status(r.status).json({ error: data.message || "ส่งเมลไม่สำเร็จ" });

    if (sb && lead_id) {
      await sb.from("leads").update({ status: "pitched", pitched_at: new Date().toISOString() }).eq("id", lead_id);
      await sb.from("outreach_log").insert({ lead_id, to_addr: to, subject });
    }

    res.status(200).json({ ok: true, id: data.id });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
}
