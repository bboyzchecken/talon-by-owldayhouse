import React, { useState, useMemo } from "react";

/**
 * ============================================================
 *  LEAD PIPELINE — Semi-automation console
 *  หา lead (Places API) → สร้างเว็บ (queue) → เสนอขาย → ติดตามสถานะ
 *  คน = คนปิดการขายเอง / ระบบ = หา + สร้าง + ติดตาม
 * ------------------------------------------------------------
 *  🔌 จุดเสียบ API จริง ถูกมาร์คด้วย  // 🔌 REAL ...
 *  ตอนนี้ใช้ mock data ทั้งหมดเพื่อให้ลองเล่นได้ทันที
 * ============================================================
 */

/* ---------- design tokens (Owl Day House brand) ---------- */
const C = {
  paper: "#FBF8F1",      // warm off-white
  surface: "#FFFFFF",
  ink: "#28254C",        // Owl Navy
  muted: "#6E6B86",
  faint: "#A6A3BA",
  line: "#EAE6DB",
  accent: "#28254C",     // Owl Navy = primary action
  accentSoft: "#ECEAF4",
  gold: "#E9A41B",       // Owl Gold = signature highlight
  goldSoft: "#FBEFD3",
};

/* ---------- status model ---------- */
const STATUS = {
  new:      { label: "ลีดใหม่",      color: "#64748B", dot: "#94A3B8", stage: 0 },
  queued:   { label: "รอสร้างเว็บ",  color: "#B97608", dot: "#F59E0B", stage: 1 },
  built:    { label: "สร้างเว็บแล้ว", color: "#2348C8", dot: "#3B6FF2", stage: 2 },
  pitched:  { label: "เสนอขายแล้ว",  color: "#7C3AED", dot: "#9B5DF5", stage: 3 },
  won:      { label: "ปิดการขาย",    color: "#15803D", dot: "#22C55E", stage: 4 },
  rejected: { label: "ไม่สนใจ",      color: "#DC2626", dot: "#EF4444", stage: 4 },
  noreply:  { label: "ไม่ตอบกลับ",   color: "#6B7280", dot: "#9CA3AF", stage: 4 },
};
const FUNNEL = ["new", "queued", "built", "pitched", "won"];

/* ---------- niche presets (mock generators) ---------- */
const NICHE_NAMES = {
  "ร้านอาหาร": ["ครัวคุณ", "ส้มตำ", "ก๋วยเตี๋ยวเรือ", "ข้าวมันไก่", "บ้านสเต็ก", "ครัวริมคลอง"],
  "คาเฟ่": ["บ้านกาแฟ", "Slow Bar", "เมล็ดดี", "มุมกาแฟ", "Café de", "ดริปเฮาส์"],
  "คลินิก": ["คลินิกหมอ", "เดอ บิวตี้", "สกินแคร์", "ทันตกรรม", "เวลเนส", "เดอร์มา"],
  "อู่รถ": ["อู่ช่าง", "คาร์แคร์", "ยางยนต์", "ออโต้เซอร์วิส", "ช่วงล่าง", "เซอร์วิสเซ็นเตอร์"],
};
const NICHE_CAT = {
  "ร้านอาหาร": "Restaurant",
  "คาเฟ่": "Café",
  "คลินิก": "Clinic / Beauty",
  "อู่รถ": "Auto service",
};

let _id = 100;
const uid = () => `L${++_id}`;

function mockSearch(niche, area) {
  const pool = NICHE_NAMES[niche] || NICHE_NAMES["ร้านอาหาร"];
  const n = 3 + Math.floor(Math.random() * 3);
  const picks = [...pool].sort(() => Math.random() - 0.5).slice(0, n);
  return picks.map((p) => {
    const rating = (3.8 + Math.random() * 1.1).toFixed(1);
    const reviews = 15 + Math.floor(Math.random() * 480);
    const hasWebsite = Math.random() < 0.25; // ส่วนใหญ่ "ไม่มีเว็บ" = ลีดดี
    return {
      id: uid(),
      name: `${p} ${area}`.trim(),
      category: NICHE_CAT[niche] || niche,
      niche,
      area,
      rating: Number(rating),
      reviews,
      phone: `0${8 + Math.floor(Math.random() * 2)}-${Math.floor(1000000 + Math.random() * 8999999)}`,
      address: `${10 + Math.floor(Math.random() * 200)} ถนน${area}`,
      hasWebsite,
      status: "new",
      flagged: false,
      note: "",
      previewBuilt: false,
    };
  });
}

/* ---------- seed data ---------- */
const SEED = [
  { id: uid(), name: "ครัวริมคลอง ลาดพร้าว", category: "Restaurant", niche: "ร้านอาหาร", area: "ลาดพร้าว", rating: 4.6, reviews: 312, phone: "08-1234567", address: "88 ถนนลาดพร้าว", hasWebsite: false, status: "built", flagged: false, note: "เจ้าของน่าจะสนใจ รีวิวเยอะ", previewBuilt: true },
  { id: uid(), name: "บ้านกาแฟ อารีย์", category: "Café", niche: "คาเฟ่", area: "อารีย์", rating: 4.8, reviews: 540, phone: "09-8765432", address: "12 ซอยอารีย์", hasWebsite: false, status: "pitched", flagged: true, note: "ส่งเมลแล้ว 14/6 รอตอบ", previewBuilt: true },
  { id: uid(), name: "อู่ช่าง บางนา", category: "Auto service", niche: "อู่รถ", area: "บางนา", rating: 4.2, reviews: 67, phone: "08-5556677", address: "45 ถนนบางนา", hasWebsite: false, status: "won", flagged: false, note: "ปิดได้! 3,500/เดือน", previewBuilt: true },
  { id: uid(), name: "เดอ บิวตี้ ทองหล่อ", category: "Clinic / Beauty", niche: "คลินิก", area: "ทองหล่อ", rating: 4.9, reviews: 220, phone: "06-2223344", address: "9 ซอยทองหล่อ", hasWebsite: true, status: "rejected", flagged: false, note: "มีเว็บอยู่แล้ว", previewBuilt: false },
];

/* ============================================================ */
export default function LeadPipeline() {
  const [leads, setLeads] = useState(SEED);
  const [niche, setNiche] = useState("คาเฟ่");
  const [area, setArea] = useState("เอกมัย");
  const [filter, setFilter] = useState("all");
  const [hideHasWebsite, setHideHasWebsite] = useState(true);
  const [selected, setSelected] = useState(null);
  const [previewLead, setPreviewLead] = useState(null);
  const [emailLead, setEmailLead] = useState(null);
  const [searching, setSearching] = useState(false);

  /* ----- derived ----- */
  const counts = useMemo(() => {
    const c = {};
    Object.keys(STATUS).forEach((k) => (c[k] = 0));
    leads.forEach((l) => (c[l.status] = (c[l.status] || 0) + 1));
    return c;
  }, [leads]);

  const visible = useMemo(() => {
    return leads.filter((l) => {
      if (hideHasWebsite && l.hasWebsite && l.status === "new") return false;
      if (filter === "all") return true;
      return l.status === filter;
    });
  }, [leads, filter, hideHasWebsite]);

  const won = counts.won || 0;
  const pitched = (counts.pitched || 0) + won + (counts.rejected || 0) + (counts.noreply || 0);
  const convRate = pitched ? Math.round((won / pitched) * 100) : 0;

  /* ----- actions ----- */
  function patch(id, p) {
    setLeads((ls) => ls.map((l) => (l.id === id ? { ...l, ...p } : l)));
    setSelected((s) => (s && s.id === id ? { ...s, ...p } : s));
  }

  function runSearch() {
    // 🔌 REAL PLACES API: เรียก backend ของคุณ เช่น
    //   const r = await fetch(`/api/places?niche=${niche}&area=${area}`)
    //   const found = await r.json()  // map ให้ตรง schema ด้านบน
    setSearching(true);
    setTimeout(() => {
      const found = mockSearch(niche, area);
      setLeads((ls) => [...found, ...ls]);
      setSearching(false);
      setFilter("all");
    }, 650);
  }

  function buildSite(id) {
    // 🔌 REAL: ส่งเข้า build queue (เช่น insert job ลง DB / trigger worker)
    patch(id, { status: "built", previewBuilt: true });
  }

  return (
    <div style={S.root}>
      <style>{CSS}</style>

      {/* ---------- header ---------- */}
      <header style={S.header}>
        <div>
          <div style={S.brandRow}>
            <OwlMark />
            <div>
              <h1 style={S.brand}>TALON</h1>
              <span style={S.byline}>by Owl Day House</span>
            </div>
          </div>
          <p style={S.tagline}>หาธุรกิจที่ยังไม่มีเว็บ · สร้างเว็บ · เสนอขาย — ระบบทำให้, คนปิดการขาย</p>
        </div>
        <div style={S.kpiRow}>
          <Kpi label="ลีดทั้งหมด" value={leads.length} />
          <Kpi label="รอสร้าง" value={counts.queued || 0} tone="#B97608" />
          <Kpi label="ปิดได้" value={won} tone="#15803D" />
          <Kpi label="Conv." value={`${convRate}%`} tone={C.gold} />
        </div>
      </header>

      {/* ---------- funnel ---------- */}
      <section style={S.funnel}>
        {FUNNEL.map((k, i) => {
          const cfg = STATUS[k];
          const v = counts[k] || 0;
          return (
            <React.Fragment key={k}>
              <button
                className="stage"
                style={{ ...S.stage, borderColor: filter === k ? C.gold : C.line, background: filter === k ? C.goldSoft : C.surface }}
                onClick={() => setFilter(filter === k ? "all" : k)}
              >
                <span style={{ ...S.stageDot, background: cfg.dot }} />
                <span style={S.stageNum}>{v}</span>
                <span style={S.stageLabel}>{cfg.label}</span>
              </button>
              {i < FUNNEL.length - 1 && <span style={S.arrow}>›</span>}
            </React.Fragment>
          );
        })}
      </section>

      {/* ---------- search bar ---------- */}
      <section style={S.searchBar}>
        <div style={S.field}>
          <label style={S.fieldLabel}>niche</label>
          <select style={S.select} value={niche} onChange={(e) => setNiche(e.target.value)}>
            {Object.keys(NICHE_NAMES).map((n) => (
              <option key={n}>{n}</option>
            ))}
          </select>
        </div>
        <div style={{ ...S.field, flex: 1 }}>
          <label style={S.fieldLabel}>พื้นที่</label>
          <input style={S.input} value={area} onChange={(e) => setArea(e.target.value)} placeholder="เช่น เอกมัย, นิมมาน" />
        </div>
        <button style={S.searchBtn} onClick={runSearch} disabled={searching}>
          {searching ? "กำลังค้นหา…" : "ค้นหาลีด"}
        </button>
        <label style={S.checkWrap}>
          <input type="checkbox" checked={hideHasWebsite} onChange={(e) => setHideHasWebsite(e.target.checked)} />
          <span>ซ่อนร้านที่มีเว็บแล้ว</span>
        </label>
      </section>

      {/* ---------- table ---------- */}
      <section style={S.tableWrap}>
        <table style={S.table}>
          <thead>
            <tr>
              <th style={S.th}></th>
              <th style={S.th}>ธุรกิจ</th>
              <th style={S.th}>หมวด</th>
              <th style={{ ...S.th, textAlign: "right" }}>รีวิว</th>
              <th style={S.th}>เว็บเดิม</th>
              <th style={S.th}>สถานะ</th>
              <th style={{ ...S.th, textAlign: "right" }}>จัดการ</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((l) => {
              const cfg = STATUS[l.status];
              return (
                <tr key={l.id} className="row" onClick={() => setSelected(l)} style={S.tr}>
                  <td style={{ ...S.td, width: 6, padding: 0 }}>
                    <span style={{ display: "block", width: 4, height: 38, background: cfg.dot, borderRadius: 2 }} />
                  </td>
                  <td style={S.td}>
                    <div style={S.bizName}>
                      {l.flagged && <span style={S.flag}>⚑</span>}
                      {l.name}
                    </div>
                    <div style={S.bizSub}>★ {l.rating} · {l.area}</div>
                  </td>
                  <td style={{ ...S.td, color: C.muted }}>{l.category}</td>
                  <td style={{ ...S.td, textAlign: "right", fontFamily: "JetBrains Mono, monospace" }}>{l.reviews}</td>
                  <td style={S.td}>
                    {l.hasWebsite
                      ? <span style={S.tagGray}>มี</span>
                      : <span style={S.tagGood}>ไม่มี ✓</span>}
                  </td>
                  <td style={S.td}>
                    <span style={{ ...S.chip, color: cfg.color, background: cfg.color + "18" }}>{cfg.label}</span>
                  </td>
                  <td style={{ ...S.td, textAlign: "right" }} onClick={(e) => e.stopPropagation()}>
                    <RowActions
                      lead={l}
                      onBuild={() => buildSite(l.id)}
                      onQueue={() => patch(l.id, { status: "queued" })}
                      onPreview={() => setPreviewLead(l)}
                      onPitch={() => { patch(l.id, { status: "pitched" }); setEmailLead(l); }}
                    />
                  </td>
                </tr>
              );
            })}
            {visible.length === 0 && (
              <tr><td colSpan={7} style={S.empty}>ยังไม่มีลีดในสถานะนี้ — ลองค้นหา niche ใหม่ด้านบน</td></tr>
            )}
          </tbody>
        </table>
      </section>

      {/* ---------- detail drawer ---------- */}
      {selected && (
        <Drawer lead={selected} onClose={() => setSelected(null)}
          onPatch={(p) => patch(selected.id, p)}
          onPreview={() => setPreviewLead(selected)}
          onEmail={() => setEmailLead(selected)} />
      )}

      {/* ---------- website preview modal ---------- */}
      {previewLead && <PreviewModal lead={previewLead} onClose={() => setPreviewLead(null)} />}

      {/* ---------- email modal ---------- */}
      {emailLead && <EmailModal lead={emailLead} onClose={() => setEmailLead(null)} />}

      <footer style={S.footer}>
        <OwlMark />
        <span>Talon · ผลิตภัณฑ์ภายใต้ <strong style={{ color: C.ink }}>บริษัท อาวล์ เดย์ เฮ้าส์ จำกัด</strong> · owldayhouse.com</span>
      </footer>
    </div>
  );
}

/* ---------- small components ---------- */
function OwlMark() {
  // stylized owl/spiral mark — Owl Navy on Owl Gold
  return (
    <span style={S.markWrap} aria-hidden>
      <svg width="26" height="26" viewBox="0 0 48 48" fill="none">
        <path d="M16 6l4 9-9-2 5-7zM33 8l-3 9 9 1-6-10z" fill="#28254C" />
        <circle cx="24" cy="28" r="13" fill="none" stroke="#28254C" strokeWidth="4.5" />
        <path d="M24 28a8 8 0 0 1 8-8" fill="none" stroke="#28254C" strokeWidth="4.5" strokeLinecap="round" />
        <circle cx="24" cy="28" r="4.5" fill="#28254C" />
      </svg>
    </span>
  );
}

function Kpi({ label, value, tone }) {
  return (
    <div style={S.kpi}>
      <div style={{ ...S.kpiVal, color: tone || C.ink }}>{value}</div>
      <div style={S.kpiLabel}>{label}</div>
    </div>
  );
}

function RowActions({ lead, onBuild, onQueue, onPreview, onPitch }) {
  if (lead.status === "new")
    return <button style={S.miniBtn} onClick={onQueue}>+ คิวสร้าง</button>;
  if (lead.status === "queued")
    return <button style={{ ...S.miniBtn, ...S.miniPrimary }} onClick={onBuild}>สร้างเว็บ</button>;
  if (lead.status === "built")
    return (
      <span style={{ display: "inline-flex", gap: 6 }}>
        <button style={S.miniBtn} onClick={onPreview}>ดูเว็บ</button>
        <button style={{ ...S.miniBtn, ...S.miniPrimary }} onClick={onPitch}>เสนอขาย</button>
      </span>
    );
  return <button style={S.miniBtn} onClick={onPreview}>ดูเว็บ</button>;
}

function Drawer({ lead, onClose, onPatch, onPreview, onEmail }) {
  return (
    <div style={S.scrim} onClick={onClose}>
      <aside style={S.drawer} onClick={(e) => e.stopPropagation()}>
        <button style={S.closeX} onClick={onClose}>✕</button>
        <div style={S.dHead}>
          <h2 style={S.dName}>{lead.name}</h2>
          <p style={S.dMeta}>{lead.category} · ★ {lead.rating} ({lead.reviews}) · {lead.area}</p>
        </div>

        <div style={S.dGrid}>
          <Info label="โทร" value={lead.phone} />
          <Info label="ที่อยู่" value={lead.address} />
          <Info label="เว็บเดิม" value={lead.hasWebsite ? "มี" : "ไม่มี"} />
          <Info label="สถานะ" value={STATUS[lead.status].label} />
        </div>

        <div style={S.dSection}>
          <label style={S.fieldLabel}>เปลี่ยนสถานะ</label>
          <div style={S.statusPicker}>
            {Object.entries(STATUS).map(([k, cfg]) => (
              <button key={k}
                onClick={() => onPatch({ status: k })}
                style={{
                  ...S.statusOpt,
                  color: lead.status === k ? "#fff" : cfg.color,
                  background: lead.status === k ? cfg.color : cfg.color + "14",
                  borderColor: cfg.color + "44",
                }}>
                {cfg.label}
              </button>
            ))}
          </div>
        </div>

        <div style={S.dSection}>
          <label style={S.fieldLabel}>โน้ต</label>
          <textarea style={S.textarea} value={lead.note}
            onChange={(e) => onPatch({ note: e.target.value })}
            placeholder="บันทึกการคุย / นัดหมาย / ราคา…" />
        </div>

        <label style={{ ...S.checkWrap, marginBottom: 18 }}>
          <input type="checkbox" checked={lead.flagged} onChange={(e) => onPatch({ flagged: e.target.checked })} />
          <span>⚑ ปักธง (ตามด่วน)</span>
        </label>

        <div style={S.dActions}>
          {lead.previewBuilt && <button style={S.dBtn} onClick={onPreview}>ดูตัวอย่างเว็บ</button>}
          <button style={{ ...S.dBtn, ...S.dBtnPrimary }} onClick={onEmail}>ร่างเมลเสนอขาย</button>
        </div>
      </aside>
    </div>
  );
}

function Info({ label, value }) {
  return (
    <div>
      <div style={S.infoLabel}>{label}</div>
      <div style={S.infoVal}>{value}</div>
    </div>
  );
}

/* ---------- website preview (mock generated site) ---------- */
function PreviewModal({ lead, onClose }) {
  return (
    <div style={S.scrim} onClick={onClose}>
      <div style={S.modal} onClick={(e) => e.stopPropagation()}>
        <div style={S.modalBar}>
          <span style={S.dots}><i /><i /><i /></span>
          <span style={S.urlBar}>{`https://${slug(lead.name)}.demo.site`}</span>
          <button style={S.closeX2} onClick={onClose}>✕</button>
        </div>
        <div style={S.siteScroll}>
          <MiniSite lead={lead} />
        </div>
        <p style={S.previewNote}>
          🔌 ของจริง: เว็บนี้ generate เป็น React/HTML แล้ว deploy ขึ้น subdomain (เช่น Vercel) เพื่อแนบลิงก์ใน demo
        </p>
      </div>
    </div>
  );
}

function MiniSite({ lead }) {
  const accent = { Restaurant: "#C2410C", "Café": "#7C5E3C", "Clinic / Beauty": "#9D2C6B", "Auto service": "#1F4E79" }[lead.category] || "#2348C8";
  return (
    <div style={{ fontFamily: "IBM Plex Sans Thai, sans-serif" }}>
      <div style={{ background: accent, color: "#fff", padding: "60px 28px 50px" }}>
        <div style={{ fontSize: 12, letterSpacing: 2, opacity: 0.8 }}>{lead.category.toUpperCase()}</div>
        <h1 style={{ fontSize: 34, margin: "10px 0 8px", lineHeight: 1.1 }}>{lead.name}</h1>
        <p style={{ opacity: 0.9, fontSize: 15 }}>★ {lead.rating} · {lead.reviews} รีวิว · {lead.area}</p>
        <button style={{ marginTop: 18, background: "#fff", color: accent, border: 0, padding: "11px 22px", borderRadius: 8, fontWeight: 700 }}>โทรหาเรา {lead.phone}</button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 1, background: "#eee" }}>
        {["คุณภาพดี", "รีวิวจริง", "บริการใส่ใจ"].map((t) => (
          <div key={t} style={{ background: "#fff", padding: "26px 14px", textAlign: "center" }}>
            <div style={{ fontSize: 22 }}>✦</div>
            <div style={{ fontSize: 13, color: "#444", marginTop: 6 }}>{t}</div>
          </div>
        ))}
      </div>
      <div style={{ padding: "34px 28px", background: "#FAFAF8" }}>
        <h2 style={{ fontSize: 20, color: "#222" }}>เกี่ยวกับเรา</h2>
        <p style={{ color: "#555", fontSize: 14, lineHeight: 1.7, marginTop: 8 }}>
          {lead.name} เปิดให้บริการในย่าน{lead.area} ด้วยรีวิวกว่า {lead.reviews} รายการที่ระดับ {lead.rating} ดาว
          เราพร้อมดูแลคุณด้วยมาตรฐานที่ลูกค้าไว้วางใจ
        </p>
        <div style={{ marginTop: 18, padding: 16, background: "#fff", borderRadius: 10, fontSize: 13, color: "#333" }}>
          📍 {lead.address} &nbsp;·&nbsp; ☎ {lead.phone}
        </div>
      </div>
    </div>
  );
}

/* ---------- email draft ---------- */
function EmailModal({ lead, onClose }) {
  const subject = `เว็บไซต์ตัวอย่างสำหรับ ${lead.name} (ฟรี ดูได้เลย)`;
  const body =
`เรียน เจ้าของ${lead.name}

สวัสดีครับ ผมเห็นว่าร้าน${lead.name}ได้รับรีวิวดีมาก — ${lead.rating}★ จาก ${lead.reviews} รีวิว
แต่สังเกตว่ายังไม่มีเว็บไซต์เป็นของตัวเอง ลูกค้าที่ค้นหาใน Google เลยอาจหาข้อมูลร้านยากครับ

ผมเลยลองทำ "เว็บไซต์ตัวอย่าง" ที่ใส่ชื่อ รีวิว และข้อมูลร้านของคุณไว้แล้ว ดูได้เลยที่:
👉 https://${slug(lead.name)}.demo.site

ถ้าสนใจ ผมดูแลให้ครบตั้งแต่ทำเว็บ จดโดเมน ไปจนถึงดูแลรายเดือน
ลองดูตัวอย่างก่อนได้ครับ ไม่มีค่าใช้จ่าย

ขอบคุณครับ
[ชื่อคุณ] · [เบอร์/LINE]`;

  const [copied, setCopied] = useState(false);
  function copy() {
    // ไม่ใช้ clipboard API (อาจถูกบล็อกใน sandbox) — เลือกข้อความให้แทน
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div style={S.scrim} onClick={onClose}>
      <div style={{ ...S.modal, maxWidth: 560 }} onClick={(e) => e.stopPropagation()}>
        <div style={S.modalBar}>
          <span style={{ fontWeight: 700, fontSize: 13 }}>ร่างเมลเสนอขาย</span>
          <button style={S.closeX2} onClick={onClose}>✕</button>
        </div>
        <div style={{ padding: 20 }}>
          <div style={S.emailLabel}>หัวข้อ</div>
          <div style={S.emailSubject}>{subject}</div>
          <div style={{ ...S.emailLabel, marginTop: 14 }}>เนื้อหา</div>
          <textarea readOnly style={S.emailBody} value={body} onFocus={(e) => e.target.select()} />
          <div style={{ display: "flex", gap: 10, marginTop: 14, alignItems: "center" }}>
            <button style={{ ...S.dBtn, ...S.dBtnPrimary }} onClick={copy}>{copied ? "เลือกข้อความแล้ว ✓" : "เลือกทั้งหมด"}</button>
            <span style={{ fontSize: 12, color: C.muted }}>
              🔌 ของจริง: ยิงผ่าน Resend / SendGrid แล้ว auto mark “เสนอขายแล้ว”
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- utils ---------- */
function slug(s) {
  return s.toLowerCase().replace(/[^a-z0-9ก-๙]+/gi, "-").replace(/^-|-$/g, "").slice(0, 24) || "site";
}

/* ============================================================ */
/* styles                                                       */
/* ============================================================ */
const S = {
  root: { minHeight: "100vh", background: C.paper, color: C.ink, fontFamily: "IBM Plex Sans Thai, Inter, sans-serif", padding: "22px clamp(14px,4vw,40px) 60px" },
  header: { display: "flex", flexWrap: "wrap", gap: 20, justifyContent: "space-between", alignItems: "flex-start", marginBottom: 22 },
  brandRow: { display: "flex", alignItems: "center", gap: 11 },
  markWrap: { width: 38, height: 38, background: C.gold, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 0 #00000010" },
  brand: { fontFamily: "Space Grotesk, sans-serif", fontSize: 23, fontWeight: 700, letterSpacing: 1.5, margin: 0, lineHeight: 1, color: C.ink },
  byline: { fontSize: 11, color: C.gold, fontWeight: 600, letterSpacing: 0.3 },
  tagline: { color: C.muted, fontSize: 13, margin: "8px 0 0" },
  kpiRow: { display: "flex", gap: 10, flexWrap: "wrap" },
  kpi: { background: C.surface, border: `1px solid ${C.line}`, borderRadius: 12, padding: "10px 16px", minWidth: 78 },
  kpiVal: { fontFamily: "Space Grotesk, monospace", fontSize: 22, fontWeight: 700, lineHeight: 1 },
  kpiLabel: { fontSize: 11, color: C.faint, marginTop: 4, letterSpacing: 0.3 },

  funnel: { display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap", marginBottom: 18 },
  stage: { display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 2, background: C.surface, border: `1.5px solid ${C.line}`, borderRadius: 12, padding: "10px 16px", cursor: "pointer", minWidth: 92 },
  stageDot: { width: 8, height: 8, borderRadius: "50%" },
  stageNum: { fontFamily: "Space Grotesk, monospace", fontSize: 21, fontWeight: 700, lineHeight: 1, marginTop: 2 },
  stageLabel: { fontSize: 11.5, color: C.muted },
  arrow: { color: C.faint, fontSize: 20 },

  searchBar: { display: "flex", gap: 12, alignItems: "flex-end", flexWrap: "wrap", background: C.surface, border: `1px solid ${C.line}`, borderRadius: 14, padding: 14, marginBottom: 16 },
  field: { display: "flex", flexDirection: "column", gap: 5 },
  fieldLabel: { fontSize: 11, color: C.faint, letterSpacing: 0.5, textTransform: "uppercase", fontFamily: "JetBrains Mono, monospace" },
  select: { padding: "9px 12px", border: `1px solid ${C.line}`, borderRadius: 9, background: "#fff", fontSize: 14, fontFamily: "inherit", color: C.ink },
  input: { padding: "9px 12px", border: `1px solid ${C.line}`, borderRadius: 9, fontSize: 14, fontFamily: "inherit", color: C.ink, minWidth: 160 },
  searchBtn: { padding: "10px 22px", background: C.accent, color: "#fff", border: 0, borderRadius: 9, fontWeight: 700, fontSize: 14, cursor: "pointer", fontFamily: "inherit" },
  checkWrap: { display: "flex", alignItems: "center", gap: 7, fontSize: 13, color: C.muted, cursor: "pointer", marginLeft: "auto" },

  tableWrap: { background: C.surface, border: `1px solid ${C.line}`, borderRadius: 14, overflow: "hidden" },
  table: { width: "100%", borderCollapse: "collapse" },
  th: { textAlign: "left", fontSize: 11, color: C.faint, fontWeight: 600, padding: "12px 14px", borderBottom: `1px solid ${C.line}`, letterSpacing: 0.4, textTransform: "uppercase", fontFamily: "JetBrains Mono, monospace" },
  tr: { borderBottom: `1px solid ${C.line}`, cursor: "pointer" },
  td: { padding: "9px 14px", fontSize: 14, verticalAlign: "middle" },
  bizName: { fontWeight: 600, display: "flex", alignItems: "center", gap: 6 },
  bizSub: { fontSize: 12, color: C.faint, marginTop: 1 },
  flag: { color: "#DC2626" },
  tagGood: { fontSize: 12, color: "#15803D", background: "#15803D18", padding: "3px 9px", borderRadius: 20, fontWeight: 600 },
  tagGray: { fontSize: 12, color: C.faint, background: "#0001", padding: "3px 9px", borderRadius: 20 },
  chip: { fontSize: 12, fontWeight: 600, padding: "4px 11px", borderRadius: 20, whiteSpace: "nowrap" },
  empty: { padding: "40px 14px", textAlign: "center", color: C.faint, fontSize: 14 },
  footer: { display: "flex", alignItems: "center", gap: 12, marginTop: 28, paddingTop: 18, borderTop: `1px solid ${C.line}`, fontSize: 12.5, color: C.muted },

  miniBtn: { fontSize: 12.5, padding: "6px 12px", border: `1px solid ${C.line}`, borderRadius: 8, background: "#fff", cursor: "pointer", fontFamily: "inherit", color: C.ink, fontWeight: 600 },
  miniPrimary: { background: C.accent, color: "#fff", border: `1px solid ${C.accent}` },

  scrim: { position: "fixed", inset: 0, background: "#14181D55", display: "flex", justifyContent: "flex-end", zIndex: 50, backdropFilter: "blur(2px)" },
  drawer: { width: "min(440px, 92vw)", background: C.surface, height: "100%", overflowY: "auto", padding: "26px 24px", boxShadow: "-10px 0 40px #0002", position: "relative" },
  closeX: { position: "absolute", top: 18, right: 18, border: 0, background: "transparent", fontSize: 18, cursor: "pointer", color: C.muted },
  dHead: { marginBottom: 18, paddingRight: 30 },
  dName: { fontSize: 21, margin: 0, fontWeight: 700 },
  dMeta: { fontSize: 13, color: C.muted, marginTop: 5 },
  dGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 22 },
  infoLabel: { fontSize: 11, color: C.faint, fontFamily: "JetBrains Mono, monospace" },
  infoVal: { fontSize: 14, marginTop: 2 },
  dSection: { marginBottom: 18 },
  statusPicker: { display: "flex", flexWrap: "wrap", gap: 7, marginTop: 8 },
  statusOpt: { fontSize: 12.5, padding: "6px 12px", borderRadius: 20, border: "1px solid", cursor: "pointer", fontFamily: "inherit", fontWeight: 600 },
  textarea: { width: "100%", minHeight: 70, marginTop: 8, padding: 11, border: `1px solid ${C.line}`, borderRadius: 9, fontSize: 13.5, fontFamily: "inherit", resize: "vertical", boxSizing: "border-box" },
  dActions: { display: "flex", gap: 10, flexWrap: "wrap" },
  dBtn: { padding: "11px 18px", border: `1px solid ${C.line}`, borderRadius: 10, background: "#fff", cursor: "pointer", fontWeight: 600, fontSize: 14, fontFamily: "inherit", color: C.ink },
  dBtnPrimary: { background: C.accent, color: "#fff", border: `1px solid ${C.accent}` },

  modal: { margin: "auto", background: "#fff", width: "min(420px, 94vw)", maxHeight: "90vh", borderRadius: 16, overflow: "hidden", display: "flex", flexDirection: "column", boxShadow: "0 20px 60px #0003" },
  modalBar: { display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderBottom: `1px solid ${C.line}`, background: "#FAFAF8" },
  dots: { display: "flex", gap: 5 },
  urlBar: { flex: 1, fontSize: 12, color: C.muted, fontFamily: "JetBrains Mono, monospace", background: "#fff", border: `1px solid ${C.line}`, borderRadius: 6, padding: "4px 10px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  closeX2: { border: 0, background: "transparent", fontSize: 16, cursor: "pointer", color: C.muted },
  siteScroll: { overflowY: "auto", flex: 1 },
  previewNote: { fontSize: 12, color: C.muted, padding: "12px 16px", background: "#FAFAF8", borderTop: `1px solid ${C.line}`, margin: 0 },

  emailLabel: { fontSize: 11, color: C.faint, fontFamily: "JetBrains Mono, monospace", letterSpacing: 0.4 },
  emailSubject: { fontSize: 14.5, fontWeight: 600, marginTop: 5, padding: "8px 12px", background: "#FAFAF8", borderRadius: 8, border: `1px solid ${C.line}` },
  emailBody: { width: "100%", minHeight: 230, marginTop: 6, padding: 12, border: `1px solid ${C.line}`, borderRadius: 9, fontSize: 13, lineHeight: 1.6, fontFamily: "inherit", boxSizing: "border-box", resize: "vertical" },
};

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;700&family=IBM+Plex+Sans+Thai:wght@400;500;600;700&family=JetBrains+Mono:wght@400;600&display=swap');
* { box-sizing: border-box; }
.row:hover { background: #F8F9F6; }
.stage:hover { border-color: #c9cdc5 !important; }
.modalBar i, .dots i { width: 10px; height: 10px; border-radius: 50%; display:inline-block; }
.dots i:nth-child(1){ background:#FF5F57 } .dots i:nth-child(2){ background:#FEBC2E } .dots i:nth-child(3){ background:#28C840 }
button:focus-visible, input:focus-visible, select:focus-visible, textarea:focus-visible { outline: 2px solid ${C.accent}; outline-offset: 1px; }
@media (max-width: 640px){ table { font-size: 13px } }
`;
