// /news — static blog for long-term local SEO (Chiang Mai + Bangkok keywords → /talon).
// Pure data: post metadata + ordering, used by the index page, [slug] metadata,
// sitemap and JSON-LD. Article bodies live in content/news/<slug>.tsx and are
// mapped in content/news/bodies.tsx (kept separate so this file has no JSX deps).

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
      "หาคนรับทำเว็บไซต์ในกรุงเทพที่ราคาคุ้มและดูแลต่อจริง? Owl Day House ขยายมาดูแลลูกค้า กทม. แล้ว — ทำงานออนไลน์เต็มรูปแบบ นัดเจอได้ เริ่ม ฿3,900",
    datePublished: "2026-06-21",
    keywords: [
      "รับทำเว็บไซต์ กรุงเทพ",
      "รับทำเว็บไซต์ กทม",
      "บริษัทรับทำเว็บไซต์ กรุงเทพ",
      "ทำเว็บไซต์ กรุงเทพ ราคา",
    ],
    readingMinutes: 5,
  },
  {
    slug: "rab-tham-website-chiang-mai-rakha",
    title: "รับทำเว็บไซต์ เชียงใหม่ ราคาเท่าไหร่ ปี 2026? คู่มือเลือกให้คุ้มไม่โดนทิ้งกลางทาง",
    description:
      "เทียบราคารับทำเว็บไซต์ในเชียงใหม่ปี 2026 ตั้งแต่หลักพันถึงหลักแสน พร้อมวิธีเลือกเจ้าที่ดูแลต่อจริง ไม่หายตัวหลังส่งงาน",
    datePublished: "2026-06-20",
    keywords: [
      "รับทำเว็บไซต์ เชียงใหม่",
      "รับทำเว็บไซต์ เชียงใหม่ ราคา",
      "ทำเว็บไซต์ราคาถูก เชียงใหม่",
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

export function getPost(slug: string): NewsPost | undefined {
  return posts.find((p) => p.slug === slug);
}
