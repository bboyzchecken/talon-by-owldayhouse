// ============================================================
//  /lib/generate-site.js
//  [2] รับข้อมูลลีด → สร้างเว็บไซต์ landing page (HTML 1 ไฟล์)
//  worker เรียกฟังก์ชันนี้ตอน status = 'queued' แล้ว deploy ผลลัพธ์
//  ขึ้น subdomain (Vercel/Netlify/หรือ Supabase Storage)
// ============================================================

const THEME = {
  cafe:       { accent: "#7C5E3C", bg: "#FBF6EE", tag: "คาเฟ่" },
  restaurant: { accent: "#C2410C", bg: "#FFF7F2", tag: "ร้านอาหาร" },
  clinic:     { accent: "#9D2C6B", bg: "#FCF4F8", tag: "คลินิก & ความงาม" },
  auto:       { accent: "#1F4E79", bg: "#F2F6FB", tag: "ศูนย์บริการรถยนต์" },
  default:    { accent: "#28254C", bg: "#FBF8F1", tag: "ธุรกิจ" }, // Owl Navy
};

function pickTheme(niche = "") {
  const n = niche.toLowerCase();
  if (/คาเฟ่|coffee|cafe/.test(n)) return THEME.cafe;
  if (/อาหาร|restaurant|food/.test(n)) return THEME.restaurant;
  if (/คลินิก|clinic|beauty|สปา/.test(n)) return THEME.clinic;
  if (/อู่|รถ|auto|car/.test(n)) return THEME.auto;
  return THEME.default;
}

const esc = (s = "") => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

export function generateSiteHTML(lead, content = null) {
  const t = pickTheme(lead.niche || lead.category);
  const name = esc(lead.name);
  const phone = esc(lead.phone || "");
  const tel = phone.replace(/[^0-9+]/g, "");

  // เนื้อหาจาก Claude (generate-content.js) — ถ้าไม่มีใช้ค่าพื้นฐาน
  const c = content || {};
  const tagline = esc(c.tagline || name);
  const about = esc(c.about || `${lead.name} ให้บริการในย่าน${lead.area || ""} ด้วยรีวิวระดับ ${lead.rating || "-"} ดาว`);
  const features = (c.features && c.features.length ? c.features : ["คุณภาพที่ไว้วางใจ", "รีวิวจริงจากลูกค้า", "บริการใส่ใจ"]).slice(0, 3);
  const services = (c.services || []).slice(0, 6);
  const seo = esc(c.seo_description || `${lead.name} — ${lead.area || ""}`);

  // hero background = รูปจริงจาก Places (ถ้าดึงมา) ไม่งั้นใช้สีธีม
  const heroBg = lead.photo_url
    ? `linear-gradient(${t.accent}cc, ${t.accent}ee), url('${esc(lead.photo_url)}') center/cover`
    : t.accent;

  const featIcons = ["✦", "★", "♥"];

  return `<!doctype html>
<html lang="th">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${name}</title>
<meta name="description" content="${seo}" />
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Thai:wght@400;500;600;700&display=swap" rel="stylesheet" />
<style>
  *{box-sizing:border-box;margin:0} body{font-family:'IBM Plex Sans Thai',sans-serif;color:#222;background:${t.bg}}
  .hero{background:${heroBg};color:#fff;padding:84px 22px 68px;text-align:center}
  .eyebrow{font-size:12px;letter-spacing:3px;opacity:.85}
  .hero h1{font-size:clamp(30px,7vw,52px);margin:12px 0 6px;line-height:1.05}
  .hero .tag{opacity:.95;font-size:18px;margin-bottom:8px}
  .hero p{opacity:.9;font-size:15px}
  .cta{display:inline-block;margin-top:22px;background:#fff;color:${t.accent};text-decoration:none;padding:13px 28px;border-radius:10px;font-weight:700}
  .feats{display:grid;grid-template-columns:repeat(3,1fr);gap:1px;background:#0001}
  .feat{background:#fff;padding:30px 14px;text-align:center}
  .feat .i{font-size:26px;color:${t.accent}}
  .feat span{display:block;margin-top:8px;font-size:14px;color:#444}
  .about{max-width:720px;margin:0 auto;padding:46px 22px}
  .about h2{color:${t.accent};font-size:24px}
  .about p{margin-top:12px;line-height:1.8;color:#555}
  .svc{display:flex;flex-wrap:wrap;gap:8px;margin-top:18px}
  .svc span{background:#fff;border:1px solid #0001;border-radius:20px;padding:7px 15px;font-size:14px;color:#444}
  .card{margin-top:22px;background:#fff;border-radius:12px;padding:18px;font-size:15px;color:#333;box-shadow:0 4px 20px #0000000d}
  footer{text-align:center;padding:28px;font-size:12px;color:#999}
  footer a{color:#999}
</style>
</head>
<body>
  <section class="hero">
    <div class="eyebrow">${esc(t.tag).toUpperCase()}</div>
    <h1>${name}</h1>
    <div class="tag">${tagline}</div>
    <p>★ ${lead.rating || "-"} · ${lead.reviews || 0} รีวิว · ${esc(lead.area || "")}</p>
    ${phone ? `<a class="cta" href="tel:${tel}">โทรหาเรา ${phone}</a>` : ""}
  </section>

  <section class="feats">
    ${features.map((f, i) => `<div class="feat"><div class="i">${featIcons[i] || "✦"}</div><span>${esc(f)}</span></div>`).join("")}
  </section>

  <section class="about">
    <h2>เกี่ยวกับเรา</h2>
    <p>${about}</p>
    ${services.length ? `<div class="svc">${services.map((s) => `<span>${esc(s)}</span>`).join("")}</div>` : ""}
    <div class="card">📍 ${esc(lead.address || "")}${phone ? ` &nbsp;·&nbsp; ☎ ${phone}` : ""}</div>
  </section>

  <footer>เว็บไซต์ตัวอย่างโดย <a href="https://owldayhouse.com">Owl Day House</a></footer>
</body>
</html>`;
}

// ---- ตัวอย่าง worker (pseudo) ----
// import { generateContent } from "./generate-content.js";
// const content = await generateContent(lead);        // Claude เขียน copy
// const html    = generateSiteHTML(lead, content);     // เสียบลง template
// const url     = await deployToVercel(slug(lead.name), html);
// await sb.from('leads').update({ status:'built', preview_url:url }).eq('id', lead.id);
