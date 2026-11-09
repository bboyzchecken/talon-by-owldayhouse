// /news — static Thai blog for long-term local SEO (Chiang Mai + Bangkok keywords).
// Pure data: post metadata + ordering, used by the index page, [slug] metadata,
// sitemap and JSON-LD. Article bodies live in content/news/<slug>.tsx and are
// mapped in content/news/bodies.tsx (kept separate so this file has no JSX deps).

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
}

// Newest first — drives both the listing order and sitemap.
const published: readonly NewsPost[] = [
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

// Titles and excerpts are shown on pages, so keep Thai words whole when they wrap.
// Keywords go straight into meta tags and stay as written.
export const posts: readonly NewsPost[] = published.map((post) => ({
  ...post,
  title: keepThaiWords(post.title),
  description: keepThaiWords(post.description),
}));

export function getPost(slug: string): NewsPost | undefined {
  return posts.find((p) => p.slug === slug);
}
