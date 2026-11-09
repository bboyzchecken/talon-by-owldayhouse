// The six services under three pillars. Shared facts first, then copy per locale.

import type { Locale } from "@/lib/i18n";
import { keepThaiWordsDeep } from "@/lib/thai-wrap";

export type Pillar = "Build" | "Activate" | "Grow";
export type Capability = "open" | "partner";

interface ServiceBase {
  slug: string;
  pillar: Pillar;
  image: string;
  capability: Capability;
}

interface ServiceText {
  title: string;
  metaTitle: string;
  blurb: string;
  problem: string;
  deliverables: readonly string[];
  /** A tool we actually built for this kind of work. Leave out when there is none. */
  tool?: string;
}

export type Service = ServiceBase & ServiceText;

const base: readonly ServiceBase[] = [
  { slug: "website-software", pillar: "Build", image: "/imagery/build.webp", capability: "open" },
  { slug: "event-interactive", pillar: "Activate", image: "/imagery/kiosk.webp", capability: "open" },
  { slug: "kol-influencer", pillar: "Activate", image: "/imagery/event-hall.webp", capability: "open" },
  { slug: "event-content", pillar: "Activate", image: "/imagery/camera.webp", capability: "open" },
  { slug: "digital-marketing", pillar: "Grow", image: "/imagery/grow.webp", capability: "open" },
  { slug: "social-listening", pillar: "Grow", image: "/imagery/listening.webp", capability: "partner" },
];

const text: Record<Locale, Record<string, ServiceText>> = keepThaiWordsDeep({
  th: {
    "website-software": {
      title: "เว็บไซต์และซอฟต์แวร์",
      metaTitle: "รับทำเว็บไซต์ เว็บแอป และระบบองค์กร",
      blurb: "เว็บไซต์ เว็บแอป โมบายแอป และระบบองค์กรทุกรูปแบบ",
      problem:
        "ธุรกิจต้องการมากกว่าหน้าเว็บที่สวย เราออกแบบระบบให้ใช้งานจริง รองรับผู้ใช้จำนวนมาก และพัฒนาต่อได้เมื่อธุรกิจโตขึ้น",
      deliverables: ["เว็บบริษัทและแลนดิ้งเพจแคมเปญ", "เว็บแอปและโมบายแอป", "ระบบหลังบ้านและแดชบอร์ด", "ระบบองค์กรที่รองรับผู้ใช้จำนวนมาก"],
      tool: "ระบบที่เราสร้างทำให้เชื่อมต่อผ่าน MCP ได้ ทีมของคุณจึงนำ AI ที่ใช้อยู่เข้ามาดูข้อมูลและถามคำถามได้",
    },
    "event-interactive": {
      title: "Event Interactive",
      metaTitle: "ทำเกมบน Kiosk จอทัชสกรีนสำหรับงานอีเวนต์",
      blurb: "เกมและกิจกรรมบน Kiosk จอทัชสกรีนสำหรับงานอีเวนต์",
      problem:
        "บูธที่มีแค่ป้ายทำให้คนเดินผ่าน เราสร้างเกมและกิจกรรมบนจอทัชสกรีนที่ดึงคนให้หยุด เล่น และเก็บข้อมูลให้แบรนด์นำไปใช้ต่อ",
      deliverables: ["ออกแบบกิจกรรมให้ตรงกับแคมเปญ", "เกมบน Kiosk จอทัชสกรีน", "ระบบแจกรางวัลและเก็บข้อมูลผู้ร่วมงาน", "ทีมดูแลระบบหน้างาน"],
      tool: "นอกจากเกม เรามีระบบลงทะเบียน เช็กชื่อผู้เข้างาน และสุ่มรางวัล ที่ทีมของคุณใช้หน้างานได้เอง",
    },
    "kol-influencer": {
      title: "KOL และ Influencer",
      metaTitle: "หา KOL และ Influencer วางแผนและทำ Creative ให้แคมเปญ",
      blurb: "คัดคนให้ตรงแคมเปญ วางแผน และทำ creative ให้ครบ",
      problem:
        "คนดังที่สุดไม่ได้เหมาะกับทุกแบรนด์ เราคัด KOL และ Influencer ให้ตรงกับเป้าหมาย วางแผนการสื่อสาร และทำ creative ให้ครบทั้งแคมเปญ",
      deliverables: ["คัดเลือก KOL และ Influencer", "วางแผนแคมเปญและตารางเผยแพร่", "คิดและผลิต creative และคลิปรีวิว", "สรุปผลหลังจบแคมเปญ"],
      tool: "เครื่องมือของเราสร้างภาพประกอบและวิดีโอให้ KOL เลือกไปใช้ พร้อมใส่ซับไตเติล งานจึงผลิตได้ไวขึ้น",
    },
    "event-content": {
      title: "Event Production",
      metaTitle: "Event Production ถ่ายทำและตัดต่อวิดีโองานอีเวนต์",
      blurb: "ทีมโปรดักชันถ่ายทำและตัดต่อภาพและวิดีโองานอีเวนต์",
      problem:
        "งานที่จัดเพียงไม่กี่วันควรมีภาพและวิดีโอใช้ต่อได้อีกนาน ทีมโปรดักชันของเราวางแผนการถ่าย ลงพื้นที่ถ่ายทำ และตัดต่อ ให้แบรนด์ได้ไฟล์ที่นำไปใช้ต่อได้ทันที",
      deliverables: ["วางแผนและเตรียมงานถ่ายทำ", "ทีมถ่ายภาพและวิดีโอหน้างาน", "ตัดต่อคลิปสำหรับโซเชียล", "วิดีโอสรุปงานอีเวนต์"],
    },
    "digital-marketing": {
      title: "Digital Marketing",
      metaTitle: "วางแผน Digital Marketing ดูแลเพจ และยิงแอด",
      blurb: "วางแผน ดูแล Social และเพจ ยิงแอด และหาลูกค้าใหม่",
      problem:
        "โฆษณาที่ไม่มีแผนคืองบที่หายไป เราวางแผนการตลาดดิจิทัล ดูแลโซเชียลและเพจ ยิงแอด และหากลุ่มเป้าหมายใหม่ให้แบรนด์",
      deliverables: ["แผนการตลาดดิจิทัล", "ดูแล Social และเพจ", "ยิงแอดและปรับแคมเปญ", "หากลุ่มเป้าหมายและลูกค้าใหม่"],
      tool: "เราใช้ระบบดึงข้อมูลชุดเดียวกับงาน Social Listening ปรับให้ติดตามความเคลื่อนไหวของคู่แข่งเป็นรอบ ๆ และเชื่อมผ่าน MCP ทีมของคุณจึงใช้ AI เช็กข้อมูลคู่แข่งได้ตลอดเวลา",
    },
    "social-listening": {
      title: "Social Listening",
      metaTitle: "Social Listening และรายงานสำหรับแบรนด์",
      blurb: "ติดตามเสียงพูดถึงแบรนด์และออกรายงานร่วมกับพาร์ตเนอร์",
      problem:
        "แบรนด์ควรรู้ว่าคนพูดถึงตัวเองอย่างไรก่อนตัดสินใจ เราทำงานร่วมกับพาร์ตเนอร์ด้าน Social Listening เพื่อติดตามเสียงลูกค้าและออกรายงานให้ทีมใช้งานได้จริง",
      deliverables: ["ติดตามเสียงพูดถึงแบรนด์", "วิเคราะห์คู่แข่งและกระแส", "รายงานพร้อมข้อเสนอแนะ"],
      tool: "เราเชื่อมข้อมูลเข้ากับ MCP ทีมของคุณจึงใช้ AI ที่มีอยู่เช็กข้อมูลแต่ละรอบได้ตลอดเวลา และสั่งแปลงข้อมูลที่เคยต้องทำมือได้เอง",
    },
  },
  en: {
    "website-software": {
      title: "Websites & Software",
      metaTitle: "Website, Web App and Enterprise System Development in Thailand",
      blurb: "Websites, web and mobile apps, and enterprise systems of every kind.",
      problem:
        "A business needs more than a good-looking page. We design systems that work under real use, handle large audiences and keep growing with you.",
      deliverables: ["Corporate sites and campaign landing pages", "Web and mobile apps", "Back offices and dashboards", "Enterprise systems built for scale"],
      tool: "The systems we build can connect through MCP, so your team can bring the AI it already uses to explore the data and ask questions.",
    },
    "event-interactive": {
      title: "Event Interactive",
      metaTitle: "Touchscreen Kiosk Games for Events",
      blurb: "Games and activities on touchscreen kiosks for live events.",
      problem:
        "People walk past a booth that only has signage. We build touchscreen games and activities that make them stop, play and leave data your brand can use.",
      deliverables: ["Activity design tied to your campaign", "Touchscreen kiosk games", "Prize and attendee data systems", "On-site technical support"],
      tool: "Beyond the games, we run registration, attendee check-in and prize draws that your team can operate on the floor.",
    },
    "kol-influencer": {
      title: "KOL & Influencers",
      metaTitle: "KOL and Influencer Campaign Planning and Creative",
      blurb: "The right creators for the campaign, with planning and creative included.",
      problem:
        "The biggest name is not always the right one. We match KOLs and influencers to your goal, plan the communication and produce the creative for the whole campaign.",
      deliverables: ["KOL and influencer selection", "Campaign and publishing plans", "Creative and review content", "Post-campaign summary"],
      tool: "Our tools generate illustrations and video for KOLs to choose from, with subtitles added, so production moves faster.",
    },
    "event-content": {
      title: "Event Production",
      metaTitle: "Event Video Production: Filming and Editing",
      blurb: "A production team that films and edits your event.",
      problem:
        "An event that lasts a few days should leave photos and video that last much longer. Our production team plans the shoot, films on site and edits, so your brand gets files it can publish right away.",
      deliverables: ["Shoot planning and preparation", "On-site photo and video crew", "Edits for social platforms", "Event recap films"],
    },
    "digital-marketing": {
      title: "Digital Marketing",
      metaTitle: "Digital Marketing Planning, Social Management and Paid Ads",
      blurb: "Planning, social and page management, paid ads and new customers.",
      problem:
        "Ads without a plan are budget that disappears. We plan your digital marketing, manage social channels, run ads and find new audiences for your brand.",
      deliverables: ["Digital marketing plan", "Social and page management", "Paid ads and optimization", "New audiences and customers"],
      tool: "We run the same data pipeline as our social listening work, set up to track competitors batch by batch and connected through MCP, so your team can use its own AI to check on competitors at any time.",
    },
    "social-listening": {
      title: "Social Listening",
      metaTitle: "Social Listening and Brand Reports",
      blurb: "Brand conversation tracking and reports, delivered with our partner.",
      problem:
        "Brands should know how people talk about them before making a decision. With our social listening partner, we track the conversation and deliver reports your team can act on.",
      deliverables: ["Brand conversation tracking", "Competitor and trend analysis", "Reports with recommendations"],
      tool: "We connect the data to MCP, so your team can use its own AI to check each batch at any time and run conversions that used to be done by hand.",
    },
  },
});

export const serviceSlugs = base.map((service) => service.slug);

export function getServices(locale: Locale): Service[] {
  return base.map((service) => ({ ...service, ...(text[locale][service.slug] as ServiceText) }));
}

export function getService(locale: Locale, slug: string): Service | undefined {
  return getServices(locale).find((service) => service.slug === slug);
}
