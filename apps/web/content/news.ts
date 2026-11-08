// /news — static Thai blog for long-term local SEO (Chiang Mai + Bangkok keywords).
// Pure data: Thai post metadata + ordering, used by the index page, [slug] metadata,
// sitemap and JSON-LD. Article bodies live in content/news/<slug>.tsx and are
// mapped in content/news/bodies.tsx (kept separate so this file has no JSX deps).

import { articles, type Faq } from "./articles";
import type { Locale } from "@/lib/i18n";

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
}

// Newest first — drives both the listing order and sitemap.
export const posts: readonly NewsPost[] = [
  {
    slug: "thurakit-prap-tua-yuk-ai",
    title: "ยุค AI มาแล้ว ทำไมธุรกิจยังต้องการซอฟต์แวร์เฮาส์ — และเราช่วยคุณปรับตัวยังไง",
    description:
      "AI ไม่ได้มาแทนคน แต่มาเป็นผู้ช่วย — บทความนี้อธิบายว่าทำไมทีมงานคนไทยอย่าง Owl Day House ยังจำเป็น และ 3 กุญแจที่ช่วยให้ธุรกิจคุณปรับตัวในยุค AI ได้จริง",
    datePublished: "2026-06-23",
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
    title: "รับทำเว็บไซต์ กรุงเทพ — ทีมที่ดูแลต่อจริง ไม่หายตัวหลังส่งงาน",
    description:
      "หาคนรับทำเว็บไซต์ในกรุงเทพที่คุณภาพดีและดูแลต่อจริง? ทีมมากประสบการณ์ของ Owl Day House ทำงานออนไลน์เต็มรูปแบบ และนัดเจอได้",
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
    title: "เปิดร้าน/ธุรกิจในเชียงใหม่ ทำไมต้องมีเว็บไซต์เป็นของตัวเอง (ไม่ใช่แค่เพจ)",
    description:
      "เพจ Facebook อย่างเดียวไม่พอสำหรับธุรกิจเชียงใหม่ยุคนี้ — เว็บไซต์เป็นของตัวเองช่วยให้ลูกค้าหาเจอบน Google ดูน่าเชื่อถือ และไม่ฝากชีวิตไว้กับอัลกอริทึม",
    datePublished: "2026-06-14",
    keywords: [
      "ธุรกิจเชียงใหม่ ทำเว็บไซต์",
      "ร้านค้าออนไลน์ เชียงใหม่",
      "SME เชียงใหม่ เว็บไซต์",
      "ทำเว็บไซต์ร้านค้า",
    ],
    readingMinutes: 5,
  },
];

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
  "thurakit-prap-tua-yuk-ai": { image: "/imagery/listening.webp", imageAlt: "แผ่นกระดาษสีขาวเรียงเป็นคลื่น", category: "AI" },
  "rab-tham-website-krungthep": { image: "/imagery/event-hall.webp", imageAlt: "งานเปิดตัวแบรนด์ในห้องโถงสีขาว", category: "เว็บไซต์" },
  "rab-tham-website-chiang-mai-rakha": { image: "/imagery/build.webp", imageAlt: "แผ่นกระจกซ้อนกันเป็นชั้นเหมือนโครงสร้างซอฟต์แวร์", category: "เว็บไซต์" },
  "thurakit-chiang-mai-tong-mi-website": { image: "/imagery/grow.webp", imageAlt: "แท่งสีขาวไล่ระดับสูงขึ้น มีแท่งสูงสุดสีทอง", category: "เว็บไซต์" },
};

function minutesToRead(locale: Locale, text: string): number {
  return Math.max(3, Math.round(text.length / (locale === "th" ? 700 : 1100)));
}

/** All articles available in a language, newest first. */
export function getPosts(locale: Locale): LocalPost[] {
  const guides = articles.map((article): LocalPost => {
    const copy = article[locale];
    return {
      slug: article.slug,
      title: copy.title,
      description: copy.description,
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
  return [...guides, ...legacy];
}

export function getPost(locale: Locale, slug: string): LocalPost | undefined {
  return getPosts(locale).find((post) => post.slug === slug);
}

/** The guide that supports a service page. */
export function getGuide(locale: Locale, service: string): LocalPost | undefined {
  return getPosts(locale).find((post) => post.service === service);
}
