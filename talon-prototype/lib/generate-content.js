// ============================================================
//  /lib/generate-content.js
//  เปลี่ยนข้อมูลดิบจาก Google → เนื้อหาเว็บที่ "เหมือนเขียนเอง"
//  ใช้ Claude API อ่านรีวิวจริง แล้วเขียน copy ให้ตรงร้านนั้น
//  ENV: ANTHROPIC_API_KEY
// ============================================================

// Haiku = เร็ว + ถูก เหมาะ gen ทีละหลายร้าน
// อยากได้คุณภาพสูงขึ้น เปลี่ยนเป็น "claude-sonnet-4-6"
const MODEL = "claude-haiku-4-5-20251001";

export async function generateContent(lead) {
  // รีวิวจริงจาก Places (ถ้ามี) = วัตถุดิบให้ Claude จับจุดขาย
  const reviewNotes = (lead.reviews_text || []).slice(0, 5);
  const reviewBlock = reviewNotes.length
    ? `\nสิ่งที่ลูกค้าพูดถึงในรีวิว (ใช้สรุปจุดเด่น อย่าก็อปคำตรงๆ):\n- ${reviewNotes.join("\n- ")}`
    : "";

  const prompt =
`คุณเป็นนักเขียนคอนเทนต์การตลาดเว็บไซต์ธุรกิจไทย น้ำเสียงน่าเชื่อถือ เป็นธรรมชาติ ไม่เว่อร์

ข้อมูลร้าน:
- ชื่อ: ${lead.name}
- ประเภท: ${lead.category}
- ย่าน: ${lead.area}
- คะแนน: ${lead.rating} ดาว (${lead.reviews} รีวิว)${reviewBlock}

เขียนเนื้อหาเว็บให้ร้านนี้ ตอบเป็น JSON เท่านั้น ห้ามมีข้อความอื่นนอก JSON:
{
  "tagline": "พาดหัวสั้น 1 ประโยค ดึงดูด ไม่เกิน 12 คำ",
  "about": "ย่อหน้าแนะนำร้าน 2-3 ประโยค อิงจุดเด่นจากรีวิว (สรุปใจความเอง)",
  "features": ["จุดเด่น 1", "จุดเด่น 2", "จุดเด่น 3"],
  "services": ["เมนู/บริการเด่น 1", "...2", "...3"],
  "seo_description": "meta description 1 ประโยค มี keyword ชื่อร้าน+ย่าน"
}`;

  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 700,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    const data = await r.json();
    if (!r.ok) throw new Error(data.error?.message || "Claude API error");

    const text = (data.content || [])
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("");
    const clean = text.replace(/```json|```/g, "").trim();
    return JSON.parse(clean);
  } catch (e) {
    // fallback: ถ้า Claude ล่ม/parse ไม่ได้ ยังสร้างเว็บได้ด้วยเนื้อหาพื้นฐาน
    console.error("generateContent fallback:", e.message);
    return {
      tagline: lead.name,
      about: `${lead.name} ให้บริการในย่าน${lead.area} ด้วยรีวิวระดับ ${lead.rating} ดาวจากลูกค้าจริง`,
      features: ["คุณภาพที่ไว้วางใจ", "รีวิวจริงจากลูกค้า", "บริการใส่ใจ"],
      services: [],
      seo_description: `${lead.name} ${lead.area} — ${lead.category}`,
    };
  }
}
