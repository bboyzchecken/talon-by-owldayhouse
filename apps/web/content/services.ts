// The six services under three pillars. Shared facts first, then copy per locale.

import type { Locale } from "@/lib/i18n";

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
  metaDescription: string;
  blurb: string;
  problem: string;
  deliverables: readonly string[];
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

const text: Record<Locale, Record<string, ServiceText>> = {
  th: {
    "website-software": {
      title: "เว็บไซต์และซอฟต์แวร์",
      metaTitle: "รับทำเว็บไซต์ เว็บแอป และระบบองค์กร",
      metaDescription: "รับทำเว็บไซต์ เว็บแอป โมบายแอป และระบบองค์กรที่ใช้งานจริง รองรับผู้ใช้จำนวนมาก และพัฒนาต่อได้เมื่อธุรกิจโตขึ้น",
      blurb: "เว็บไซต์ เว็บแอป โมบายแอป และระบบองค์กรทุกรูปแบบ",
      problem:
        "ธุรกิจต้องการมากกว่าหน้าเว็บที่สวย เราออกแบบระบบให้ใช้งานจริง รองรับผู้ใช้จำนวนมาก และพัฒนาต่อได้เมื่อธุรกิจโตขึ้น",
      deliverables: ["เว็บบริษัทและแลนดิ้งเพจแคมเปญ", "เว็บแอปและโมบายแอป", "ระบบหลังบ้านและแดชบอร์ด", "ระบบองค์กรที่รองรับผู้ใช้จำนวนมาก"],
    },
    "event-interactive": {
      title: "Event Interactive",
      metaTitle: "ทำเกมบน Kiosk จอทัชสกรีนสำหรับงานอีเวนต์",
      metaDescription: "เกมและกิจกรรมบน Kiosk จอทัชสกรีนสำหรับงานอีเวนต์และบูธ ที่ดึงคนให้หยุดเล่นและเก็บข้อมูลให้แบรนด์นำไปใช้ต่อได้",
      blurb: "เกมและกิจกรรมบน Kiosk จอทัชสกรีนสำหรับงานอีเวนต์",
      problem:
        "บูธที่มีแค่ป้ายทำให้คนเดินผ่าน เราสร้างเกมและกิจกรรมบนจอทัชสกรีนที่ดึงคนให้หยุด เล่น และเก็บข้อมูลให้แบรนด์นำไปใช้ต่อ",
      deliverables: ["ออกแบบกิจกรรมให้ตรงกับแคมเปญ", "เกมบน Kiosk จอทัชสกรีน", "ระบบแจกรางวัลและเก็บข้อมูลผู้ร่วมงาน", "ทีมดูแลระบบหน้างาน"],
    },
    "kol-influencer": {
      title: "KOL และ Influencer",
      metaTitle: "หา KOL และ Influencer วางแผนและทำ Creative ให้แคมเปญ",
      metaDescription: "คัด KOL และ Influencer ให้ตรงกับเป้าหมายแบรนด์ วางแผนการสื่อสาร ผลิต creative และสรุปผลแคมเปญครบในทีมเดียว",
      blurb: "คัดคนให้ตรงแคมเปญ วางแผน และทำ creative ให้ครบ",
      problem:
        "คนดังที่สุดไม่ได้เหมาะกับทุกแบรนด์ เราคัด KOL และ Influencer ให้ตรงกับเป้าหมาย วางแผนการสื่อสาร และทำ creative ให้ครบทั้งแคมเปญ",
      deliverables: ["คัดเลือก KOL และ Influencer", "วางแผนแคมเปญและตารางเผยแพร่", "คิดและผลิต creative", "สรุปผลหลังจบแคมเปญ"],
    },
    "event-content": {
      title: "Event Content และรีวิว",
      metaTitle: "ถ่ายทำ ตัดต่อ และรีวิวงานอีเวนต์โดยทีมงาน",
      metaDescription: "ทีมถ่ายภาพ วิดีโอ และตัดต่องานอีเวนต์ พร้อมรีวิวโดยทีมงาน ได้คอนเทนต์ที่แบรนด์นำไปใช้ต่อได้ทันที",
      blurb: "ไปถ่ายทำและตัดต่อที่งาน หรือรีวิวโดยทีมงานของเรา",
      problem:
        "งานที่จัดเพียงไม่กี่วันควรมีคอนเทนต์ใช้ต่อได้อีกนาน ทีมเราลงพื้นที่ถ่ายทำ ตัดต่อ และรีวิวให้แบรนด์นำไปใช้ต่อได้ทันที",
      deliverables: ["ทีมถ่ายภาพและวิดีโอหน้างาน", "ตัดต่อคลิปสำหรับโซเชียล", "รีวิวโดยทีมงาน", "คลิปสรุปงานอีเวนต์"],
    },
    "digital-marketing": {
      title: "Digital Marketing",
      metaTitle: "วางแผน Digital Marketing ดูแลเพจ และยิงแอด",
      metaDescription: "วางแผน Digital Marketing ดูแล Social และเพจ ยิงแอด และหากลุ่มเป้าหมายใหม่เพื่อเพิ่มลูกค้าให้แบรนด์",
      blurb: "วางแผน ดูแล Social และเพจ ยิงแอด และหาลูกค้าใหม่",
      problem:
        "โฆษณาที่ไม่มีแผนคืองบที่หายไป เราวางแผนการตลาดดิจิทัล ดูแลโซเชียลและเพจ ยิงแอด และหากลุ่มเป้าหมายใหม่ให้แบรนด์",
      deliverables: ["แผนการตลาดดิจิทัล", "ดูแล Social และเพจ", "ยิงแอดและปรับแคมเปญ", "หากลุ่มเป้าหมายและลูกค้าใหม่"],
    },
    "social-listening": {
      title: "Social Listening",
      metaTitle: "Social Listening และรายงานสำหรับแบรนด์",
      metaDescription: "ติดตามเสียงพูดถึงแบรนด์ วิเคราะห์คู่แข่งและกระแส พร้อมรายงานและข้อเสนอแนะ ดำเนินงานร่วมกับพาร์ตเนอร์",
      blurb: "ติดตามเสียงพูดถึงแบรนด์และออกรายงานร่วมกับพาร์ตเนอร์",
      problem:
        "แบรนด์ควรรู้ว่าคนพูดถึงตัวเองอย่างไรก่อนตัดสินใจ เราทำงานร่วมกับพาร์ตเนอร์ด้าน Social Listening เพื่อติดตามเสียงลูกค้าและออกรายงานให้ทีมใช้งานได้จริง",
      deliverables: ["ติดตามเสียงพูดถึงแบรนด์", "วิเคราะห์คู่แข่งและกระแส", "รายงานพร้อมข้อเสนอแนะ"],
    },
  },
  en: {
    "website-software": {
      title: "Websites & Software",
      metaTitle: "Website, Web App and Enterprise System Development in Thailand",
      metaDescription: "Websites, web and mobile apps, and enterprise systems built for real use, large audiences and long-term growth.",
      blurb: "Websites, web and mobile apps, and enterprise systems of every kind.",
      problem:
        "A business needs more than a good-looking page. We design systems that work under real use, handle large audiences and keep growing with you.",
      deliverables: ["Corporate sites and campaign landing pages", "Web and mobile apps", "Back offices and dashboards", "Enterprise systems built for scale"],
    },
    "event-interactive": {
      title: "Event Interactive",
      metaTitle: "Touchscreen Kiosk Games for Events",
      metaDescription: "Touchscreen kiosk games and activities for events and booths that make people stop, play and share useful data.",
      blurb: "Games and activities on touchscreen kiosks for live events.",
      problem:
        "People walk past a booth that only has signage. We build touchscreen games and activities that make them stop, play and leave data your brand can use.",
      deliverables: ["Activity design tied to your campaign", "Touchscreen kiosk games", "Prize and attendee data systems", "On-site technical support"],
    },
    "kol-influencer": {
      title: "KOL & Influencers",
      metaTitle: "KOL and Influencer Campaign Planning and Creative",
      metaDescription: "KOL and influencer selection, campaign planning, creative production and post-campaign reporting from one team.",
      blurb: "The right creators for the campaign, with planning and creative included.",
      problem:
        "The biggest name is not always the right one. We match KOLs and influencers to your goal, plan the communication and produce the creative for the whole campaign.",
      deliverables: ["KOL and influencer selection", "Campaign and publishing plans", "Creative concept and production", "Post-campaign summary"],
    },
    "event-content": {
      title: "Event Content & Reviews",
      metaTitle: "Event Filming, Editing and Reviews",
      metaDescription: "On-site event photography, video, editing and team reviews that give your brand content ready to publish.",
      blurb: "On-site filming and editing, or reviews by our own team.",
      problem:
        "An event that lasts a few days should leave content that lasts much longer. Our team films on site, edits, and reviews so your brand can publish right away.",
      deliverables: ["On-site photo and video crew", "Edits for social platforms", "Reviews by our team", "Event recap films"],
    },
    "digital-marketing": {
      title: "Digital Marketing",
      metaTitle: "Digital Marketing Planning, Social Management and Paid Ads",
      metaDescription: "Digital marketing planning, social and page management, paid ads and new audiences that bring your brand customers.",
      blurb: "Planning, social and page management, paid ads and new customers.",
      problem:
        "Ads without a plan are budget that disappears. We plan your digital marketing, manage social channels, run ads and find new audiences for your brand.",
      deliverables: ["Digital marketing plan", "Social and page management", "Paid ads and optimization", "New audiences and customers"],
    },
    "social-listening": {
      title: "Social Listening",
      metaTitle: "Social Listening and Brand Reports",
      metaDescription: "Track brand conversation, analyze competitors and trends, and get reports with recommendations, with our partner.",
      blurb: "Brand conversation tracking and reports, delivered with our partner.",
      problem:
        "Brands should know how people talk about them before making a decision. With our social listening partner, we track the conversation and deliver reports your team can act on.",
      deliverables: ["Brand conversation tracking", "Competitor and trend analysis", "Reports with recommendations"],
    },
  },
};

export const serviceSlugs = base.map((service) => service.slug);

export function getServices(locale: Locale): Service[] {
  return base.map((service) => ({ ...service, ...(text[locale][service.slug] as ServiceText) }));
}

export function getService(locale: Locale, slug: string): Service | undefined {
  return getServices(locale).find((service) => service.slug === slug);
}
