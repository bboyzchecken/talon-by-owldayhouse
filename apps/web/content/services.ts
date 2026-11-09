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
        "เราทำตั้งแต่เว็บบริษัทหน้าเดียวไปจนถึงระบบที่มีคนใช้พร้อมกันหลายหมื่นคน อย่างระบบลงทะเบียนเรียนของธรรมศาสตร์ ทุกงานออกแบบให้เพิ่มฟีเจอร์ต่อได้เมื่อธุรกิจโตขึ้น",
      deliverables: ["เว็บบริษัทและแลนดิ้งเพจแคมเปญ", "เว็บแอปและโมบายแอป", "ระบบหลังบ้านและแดชบอร์ด", "ระบบองค์กรที่รองรับผู้ใช้จำนวนมาก"],
      tool: "ทีมของคุณถาม AI ที่ใช้อยู่ได้เลยว่าข้อมูลในระบบเป็นอย่างไร เพราะระบบที่เราสร้างเชื่อมกับ AI ได้ (ผ่าน MCP)",
    },
    "event-interactive": {
      title: "Event Interactive",
      metaTitle: "ทำเกมบน Kiosk จอทัชสกรีนสำหรับงานอีเวนต์",
      blurb: "เกมและกิจกรรมบน Kiosk จอทัชสกรีนสำหรับงานอีเวนต์",
      problem:
        "เราทำเกมและกิจกรรมบนจอทัชสกรีนให้คนในงานหยุดเล่นที่บูธ ระหว่างเล่นระบบเก็บข้อมูลผู้ร่วมงานไว้ให้แบรนด์ใช้ทำการตลาดต่อ",
      deliverables: ["ออกแบบกิจกรรมให้ตรงกับแคมเปญ", "เกมบน Kiosk จอทัชสกรีน", "ระบบแจกรางวัลและเก็บข้อมูลผู้ร่วมงาน", "ทีมดูแลระบบหน้างาน"],
      tool: "นอกจากเกม เรามีระบบลงทะเบียน เช็กชื่อผู้เข้างาน และสุ่มรางวัล ที่ทีมของคุณใช้หน้างานได้เอง",
    },
    "kol-influencer": {
      title: "KOL และ Influencer",
      metaTitle: "หา KOL และ Influencer วางแผนและทำ Creative ให้แคมเปญ",
      blurb: "คัดคนให้ตรงแคมเปญ วางแผน และทำ creative ให้ครบ",
      problem:
        "ก่อนเลือก KOL หรือ Influencer เราดูว่าคนที่ติดตามเขาตรงกับลูกค้าของแบรนด์แค่ไหน จากนั้นวางแผนการโพสต์และทำ creative ให้ครบทั้งแคมเปญ",
      deliverables: ["คัดเลือก KOL และ Influencer", "วางแผนแคมเปญและตารางเผยแพร่", "คิดและผลิต creative และคลิปรีวิว", "สรุปผลหลังจบแคมเปญ"],
      tool: "เครื่องมือของเราสร้างภาพประกอบและวิดีโอให้ KOL เลือกไปใช้ พร้อมใส่ซับไตเติล งานจึงผลิตได้ไวขึ้น",
    },
    "event-content": {
      title: "Event Production",
      metaTitle: "Event Production ถ่ายทำและตัดต่อวิดีโองานอีเวนต์",
      blurb: "ทีมโปรดักชันถ่ายทำและตัดต่อภาพและวิดีโองานอีเวนต์",
      problem:
        "ทีมโปรดักชันของเราวางแผนการถ่ายกับทีมของคุณก่อนวันงาน ลงพื้นที่ถ่ายภาพและวิดีโอ แล้วตัดต่อเป็นคลิปที่โพสต์ได้ทันทีหลังงานจบ",
      deliverables: ["Storyboard และ shot list ก่อนวันถ่าย", "ทีมถ่ายภาพและวิดีโอหน้างาน", "ตัดต่อคลิปสำหรับโซเชียล", "วิดีโอสรุปงานอีเวนต์"],
      tool: "ถาม AI ว่าต้องใช้ฟุตเทจไหน แล้วได้ไฟล์ทันที ทีมเราเชื่อมคลังฟุตเทจบน Google Drive เข้ากับ AI (ผ่าน MCP) ทุกไฟล์บอกได้ว่าถ่ายอะไร วันไหน แล้วเรียงลงไทม์ไลน์ใน CapCut ตาม storyboard ได้ทันที งานตัดต่อจึงส่งได้ไว และถ้าทีมของคุณอยากได้ระบบแบบนี้ เราก็สร้างให้ได้",
    },
    "digital-marketing": {
      title: "Digital Marketing",
      metaTitle: "วางแผน Digital Marketing ดูแลเพจ และยิงแอด",
      blurb: "วางแผน ดูแล Social และเพจ ยิงแอด และหาลูกค้าใหม่",
      problem:
        "เราวางแผนก่อนว่างบจะลงช่องทางไหน แล้วดูแลเพจ ยิงแอด และปรับแคมเปญตามตัวเลขที่เข้ามา พร้อมหากลุ่มลูกค้าใหม่ให้แบรนด์",
      deliverables: ["แผนการตลาดดิจิทัล", "ดูแล Social และเพจ", "ยิงแอดและปรับแคมเปญ", "หากลุ่มเป้าหมายและลูกค้าใหม่"],
      tool: "ทีมของคุณถาม AI ได้ตลอดว่าคู่แข่งเคลื่อนไหวอะไร เราใช้ระบบดึงข้อมูลชุดเดียวกับงาน Social Listening ติดตามคู่แข่งเป็นรอบ ๆ แล้วเชื่อมเข้ากับ AI ของทีมคุณ (ผ่าน MCP)",
    },
    "social-listening": {
      title: "Social Listening",
      metaTitle: "Social Listening และรายงานสำหรับแบรนด์",
      blurb: "ติดตามเสียงพูดถึงแบรนด์และออกรายงานร่วมกับพาร์ตเนอร์",
      problem:
        "เราทำงานร่วมกับพาร์ตเนอร์ด้าน Social Listening เก็บว่าคนพูดถึงแบรนด์และคู่แข่งว่าอย่างไร แล้วสรุปเป็นรายงานที่ทีมของคุณนำไปตัดสินใจได้",
      deliverables: ["ติดตามเสียงพูดถึงแบรนด์", "วิเคราะห์คู่แข่งและกระแส", "รายงานพร้อมข้อเสนอแนะ"],
      tool: "ถาม AI ที่ทีมคุณใช้อยู่ได้เลยว่ารอบนี้คนพูดถึงแบรนด์อย่างไร และสั่งแปลงข้อมูลที่เคยต้องทำมือได้เอง เพราะเราเชื่อมข้อมูลเข้ากับ AI (ผ่าน MCP)",
    },
  },
  en: {
    "website-software": {
      title: "Websites & Software",
      metaTitle: "Website, Web App and Enterprise System Development in Thailand",
      blurb: "Websites, web and mobile apps, and enterprise systems of every kind.",
      problem:
        "We build everything from a one-page company site to systems used by tens of thousands of people at once, like Thammasat University's course registration. Every build is designed so features can be added as the business grows.",
      deliverables: ["Corporate sites and campaign landing pages", "Web and mobile apps", "Back offices and dashboards", "Enterprise systems built for scale"],
      tool: "Your team can ask the AI it already uses about the data in your system, because what we build connects to AI (through MCP).",
    },
    "event-interactive": {
      title: "Event Interactive",
      metaTitle: "Touchscreen Kiosk Games for Events",
      blurb: "Games and activities on touchscreen kiosks for live events.",
      problem:
        "We build touchscreen games and activities that get people to stop and play at your booth. While they play, the system collects attendee data your brand can use for marketing afterwards.",
      deliverables: ["Activity design tied to your campaign", "Touchscreen kiosk games", "Prize and attendee data systems", "On-site technical support"],
      tool: "Beyond the games, we run registration, attendee check-in and prize draws that your team can operate on the floor.",
    },
    "kol-influencer": {
      title: "KOL & Influencers",
      metaTitle: "KOL and Influencer Campaign Planning and Creative",
      blurb: "The right creators for the campaign, with planning and creative included.",
      problem:
        "Before choosing a KOL or influencer, we check how closely their followers match your customers. Then we plan the posting schedule and produce the creative for the whole campaign.",
      deliverables: ["KOL and influencer selection", "Campaign and publishing plans", "Creative and review content", "Post-campaign summary"],
      tool: "Our tools generate illustrations and video for KOLs to choose from, with subtitles added, so production moves faster.",
    },
    "event-content": {
      title: "Event Production",
      metaTitle: "Event Video Production: Filming and Editing",
      blurb: "A production team that films and edits your event.",
      problem:
        "Our production team plans the shoot with your team before the event, films photo and video on site, and edits clips you can post as soon as the event ends.",
      deliverables: ["Storyboard and shot list before the shoot", "On-site photo and video crew", "Edits for social platforms", "Event recap films"],
      tool: "Ask AI which footage you need and get the files right away. Our team connects the footage library on Google Drive to AI (through MCP), so every file says what was shot and when, then lays them onto a CapCut timeline in storyboard order. Edits ship fast, and if your team wants a system like this, we can build one for you.",
    },
    "digital-marketing": {
      title: "Digital Marketing",
      metaTitle: "Digital Marketing Planning, Social Management and Paid Ads",
      blurb: "Planning, social and page management, paid ads and new customers.",
      problem:
        "We first plan which channels the budget goes to, then manage your pages, run ads and adjust campaigns as the numbers come in, while finding new customers for your brand.",
      deliverables: ["Digital marketing plan", "Social and page management", "Paid ads and optimization", "New audiences and customers"],
      tool: "Your team can ask its AI what competitors are doing at any time. We run the same data pipeline as our social listening work, tracking competitors batch by batch and connecting it to your AI (through MCP).",
    },
    "social-listening": {
      title: "Social Listening",
      metaTitle: "Social Listening and Brand Reports",
      blurb: "Brand conversation tracking and reports, delivered with our partner.",
      problem:
        "With our social listening partner, we track what people say about your brand and your competitors, then summarize it in reports your team can make decisions with.",
      deliverables: ["Brand conversation tracking", "Competitor and trend analysis", "Reports with recommendations"],
      tool: "Ask the AI your team already uses how people talked about the brand this round, and run conversions that used to be done by hand. We connect the data to AI (through MCP).",
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
