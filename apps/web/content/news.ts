// /news — static blog for SEO around the industries we sell to (events, lead capture,
// education, property and automotive). Bilingual guides live in content/articles.ts;
// Thai posts live here. Archived posts from the old web-only offer stay reachable at
// their URLs but are noindex and left out of listings, the feed and the sitemap.
// Pure data: post metadata + ordering, used by the index page, [slug] metadata,
// sitemap and JSON-LD. Article bodies live in content/news/<slug>.tsx and are
// mapped in content/news/bodies.tsx (kept separate so this file has no JSX deps).

import { articles, type Faq } from "./articles";
import type { Locale } from "@/lib/i18n";
import { keepThaiWords } from "@/lib/thai-wrap";

export interface NewsPost {
  slug: string;
  title: string;
  /** Meta description + card excerpt. ~120–160 chars for SEO. */
  description: string;
  /** ISO date (YYYY-MM-DD). */
  datePublished: string;
  dateModified?: string;
  /** Target search keywords (local intent first). */
  keywords: readonly string[];
  /** Rough read time in minutes, shown on the card. */
  readingMinutes: number;
  /** Old offer: keep the URL alive, but noindex it and hide it from listings and the sitemap. */
  archived?: boolean;
}

// Newest first — drives both the listing order and sitemap.
const published: readonly NewsPost[] = [
  {
    slug: "ngan-poet-tua-khrongkan-song-lead-sales",
    title: "งานเปิดตัวโครงการและบูธรถ: ส่งรายชื่อลูกค้าถึงเซลส์ภายในวันงาน",
    description:
      "รายชื่อจากงานเปิดตัวที่ถึงมือเซลส์ช้าไปหนึ่งสัปดาห์ ลูกค้าอาจตัดสินใจไปแล้ว บทความนี้สรุปวิธีวางงานเปิดตัวและบูธ Motor Show ให้รายชื่อถึงเซลส์ทันที และวัดผลเป็นยอดขายได้",
    datePublished: "2026-11-09",
    keywords: ["งานเปิดตัวโครงการ", "บูธ Motor Show", "อีเวนต์อสังหาริมทรัพย์", "เก็บ lead งานเปิดตัว", "กิจกรรมโชว์รูมรถยนต์"],
    readingMinutes: 5,
  },
  {
    slug: "open-house-wat-phon-phu-samak",
    title: "Open House ที่วัดผลเป็นจำนวนผู้สมัครได้ ต้องเตรียมอะไรบ้าง",
    description:
      "คนมางาน Open House เยอะ ไม่ได้แปลว่าได้ผู้สมัครเยอะ บทความนี้เล่าวิธีวางงานตั้งแต่ลงทะเบียน กิจกรรมที่บูธ ไปจนถึงรายงานที่ผู้บริหารใช้ตัดสินใจได้",
    datePublished: "2026-11-09",
    keywords: ["Open House มหาวิทยาลัย", "จัดงาน Open House", "แคมเปญรับสมัครนักศึกษา", "ระบบลงทะเบียน Open House", "การตลาดมหาวิทยาลัย"],
    readingMinutes: 5,
  },
  {
    slug: "kep-raichue-lukkha-na-booth-pdpa",
    title: "เก็บรายชื่อลูกค้าหน้าบูธอย่างไร ให้ฝ่ายขายใช้ต่อได้และถูก PDPA",
    description:
      "รายชื่อจากงานอีเวนต์มักหายระหว่างทาง หรือเก็บมาแบบที่นำไปทำการตลาดต่อไม่ได้ บทความนี้สรุปวิธีออกแบบการลงทะเบียนหน้าบูธ ตั้งแต่ขอความยินยอมตาม PDPA จนถึงส่งรายชื่อถึงฝ่ายขาย",
    datePublished: "2026-11-09",
    keywords: ["เก็บ lead งานอีเวนต์", "ระบบลงทะเบียนงานอีเวนต์", "PDPA งานอีเวนต์", "เก็บข้อมูลลูกค้าหน้าบูธ", "เกม Kiosk เก็บข้อมูล"],
    readingMinutes: 5,
  },
  {
    slug: "thurakit-prap-tua-yuk-ai",
    title: "ยุค AI มาแล้ว ทำไมธุรกิจยังต้องการซอฟต์แวร์เฮาส์ และเราช่วยคุณปรับตัวยังไง",
    description:
      "AI ช่วยให้งานเร็วขึ้น แต่ยังต้องมีคนตัดสินว่างานไหนได้ผล บทความนี้เล่าว่าทีม Owl Day House ใช้ AI ยังไง และ 3 เรื่องที่ธุรกิจควรเริ่มทำ",
    datePublished: "2026-06-23",
    dateModified: "2026-11-09",
    keywords: [
      "ปรับตัวยุค AI",
      "AI กับธุรกิจ",
      "ทำเว็บไซต์ยุค AI",
      "ธุรกิจปรับตัว AI",
      "ซอฟต์แวร์เฮาส์ AI",
    ],
    readingMinutes: 6,
  },
  {
    slug: "rab-tham-website-krungthep",
    archived: true,
    title: "รับทำเว็บไซต์ กรุงเทพ กับทีมที่ยังดูแลต่อหลังส่งงาน",
    description:
      "หาคนรับทำเว็บไซต์ในกรุงเทพที่ดูแลต่อหลังส่งงาน ทีม Owl Day House คุยงานออนไลน์ได้ทั้งหมด และนัดเจอได้เมื่อจำเป็น",
    datePublished: "2026-06-21",
    dateModified: "2026-11-09",
    keywords: [
      "รับทำเว็บไซต์ กรุงเทพ",
      "รับทำเว็บไซต์ กทม",
      "บริษัทรับทำเว็บไซต์ กรุงเทพ",
    ],
    readingMinutes: 5,
  },
  {
    slug: "rab-tham-website-chiang-mai-rakha",
    archived: true,
    title: "รับทำเว็บไซต์ เชียงใหม่ เลือกทีมอย่างไร? คู่มือก่อนจ้าง ไม่โดนทิ้งกลางทาง",
    description:
      "วิธีเลือกทีมรับทำเว็บไซต์ในเชียงใหม่ เว็บแต่ละแบบเหมาะกับธุรกิจแบบไหน และเช็กลิสต์ก่อนจ้างเพื่อให้ได้ทีมที่ดูแลต่อจริง",
    datePublished: "2026-06-20",
    dateModified: "2026-11-09",
    keywords: [
      "รับทำเว็บไซต์ เชียงใหม่",
      "เลือกบริษัททำเว็บไซต์",
      "บริษัทรับทำเว็บไซต์ เชียงใหม่",
    ],
    readingMinutes: 6,
  },
  {
    slug: "thurakit-chiang-mai-tong-mi-website",
    archived: true,
    title: "เปิดร้าน/ธุรกิจในเชียงใหม่ ทำไมต้องมีเว็บไซต์เป็นของตัวเอง (ไม่ใช่แค่เพจ)",
    description:
      "เพจ Facebook อย่างเดียวไม่พอสำหรับธุรกิจเชียงใหม่ที่เริ่มโต เว็บไซต์ของตัวเองช่วยให้ลูกค้าหาเจอบน Google ดูน่าเชื่อถือ และไม่ต้องพึ่งอัลกอริทึมของแพลตฟอร์ม",
    datePublished: "2026-06-14",
    dateModified: "2026-11-09",
    keywords: [
      "ธุรกิจเชียงใหม่ ทำเว็บไซต์",
      "ร้านค้าออนไลน์ เชียงใหม่",
      "SME เชียงใหม่ เว็บไซต์",
      "ทำเว็บไซต์ร้านค้า",
    ],
    readingMinutes: 5,
  },
];

// Titles and excerpts are shown on pages, so keep Thai words whole when they wrap.
// Keywords go straight into meta tags and stay as written.
const posts: readonly NewsPost[] = published.map((post) => ({
  ...post,
  title: keepThaiWords(post.title),
  description: keepThaiWords(post.description),
}));

export interface LocalPost extends NewsPost {
  image: string;
  imageAlt: string;
  category: string;
  /** Present on guides written in content/articles.ts. */
  markdown?: string;
  faq?: readonly Faq[];
  service?: string;
  /** The article exists in both languages. */
  paired: boolean;
}

const legacyVisual: Record<string, { image: string; imageAlt: string; category: string }> = {
  "ngan-poet-tua-khrongkan-song-lead-sales": { image: "/imagery/event-hall.webp", imageAlt: "งานเปิดตัวแบรนด์ในห้องโถงสีขาว", category: "งานอีเวนต์" },
  "open-house-wat-phon-phu-samak": { image: "/imagery/kiosk.webp", imageAlt: "ผู้ร่วมงานแตะจอทัชสกรีนในโถงงานอีเวนต์", category: "งานอีเวนต์" },
  "kep-raichue-lukkha-na-booth-pdpa": { image: "/imagery/articles/kiosk-event.webp", imageAlt: "ผู้ร่วมงานยืนล้อมตู้ Kiosk จอทัชสกรีนในงานเปิดตัวแบรนด์", category: "งานอีเวนต์" },
  "thurakit-prap-tua-yuk-ai": { image: "/imagery/listening.webp", imageAlt: "แผ่นกระดาษสีขาวเรียงเป็นคลื่น", category: "AI" },
  "rab-tham-website-krungthep": { image: "/imagery/event-hall.webp", imageAlt: "งานเปิดตัวแบรนด์ในห้องโถงสีขาว", category: "เว็บไซต์" },
  "rab-tham-website-chiang-mai-rakha": { image: "/imagery/build.webp", imageAlt: "แผ่นกระจกซ้อนกันเป็นชั้นเหมือนโครงสร้างซอฟต์แวร์", category: "เว็บไซต์" },
  "thurakit-chiang-mai-tong-mi-website": { image: "/imagery/grow.webp", imageAlt: "แท่งสีขาวไล่ระดับสูงขึ้น มีแท่งสูงสุดสีทอง", category: "เว็บไซต์" },
};

function minutesToRead(locale: Locale, text: string): number {
  return Math.max(3, Math.round(text.length / (locale === "th" ? 700 : 1100)));
}

/** Every article in a language, archived ones included, newest first. */
export function getAllPosts(locale: Locale): LocalPost[] {
  const guides = articles.map((article): LocalPost => {
    const copy = article[locale];
    return {
      slug: article.slug,
      title: keepThaiWords(copy.title),
      description: keepThaiWords(copy.description),
      datePublished: article.datePublished,
      keywords: copy.keywords,
      readingMinutes: minutesToRead(locale, copy.body),
      image: article.image,
      imageAlt: copy.imageAlt,
      category: copy.category,
      markdown: copy.body,
      faq: copy.faq,
      service: article.service,
      paired: true,
    };
  });
  if (locale === "en") return guides;
  const legacy = posts.map((post): LocalPost => ({ ...post, ...(legacyVisual[post.slug] as (typeof legacyVisual)[string]), paired: false }));
  return [...legacy, ...guides].sort((a, b) => b.datePublished.localeCompare(a.datePublished));
}

/** Articles shown in listings, the home page, the blog schema, the feed and the sitemap. */
export function getPosts(locale: Locale): LocalPost[] {
  return getAllPosts(locale).filter((post) => !post.archived);
}

export function getPost(locale: Locale, slug: string): LocalPost | undefined {
  return getAllPosts(locale).find((post) => post.slug === slug);
}

/** The guide that supports a service page. */
export function getGuide(locale: Locale, service: string): LocalPost | undefined {
  return getPosts(locale).find((post) => post.service === service);
}
