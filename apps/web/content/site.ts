// Single source of truth for company facts, contact channels and navigation.
// Reused by Nav, Footer, contact page — and later JSON-LD / SEO (Step 5).
// Marketing site is static: every "contact" action links out (Messenger/phone/LINE).

export const company = {
  legalName: "บริษัท อาวล์ เดย์ เฮ้าส์ จำกัด",
  brandName: "Owl Day House",
  brandNameEn: "OWL DAY HOUSE",
  tagline: "เสร็จไว ดูแลต่อ โดยทีมงานคนไทย",
  address: {
    line: "ห้อง B1 ชั้น 1 อาคาร TNC เลขที่ 172",
    district: "ต.ไชยสถาน อ.สารภี",
    city: "เชียงใหม่",
    postcode: "50140",
  },
} as const;

export const contact = {
  phoneDisplay: "092-455-2450",
  phoneTel: "tel:+66924552450",
  messenger: "https://m.me/owldayhouse",
  // TODO: ยืนยัน LINE official account id ที่ถูกต้องกับลูกค้า
  line: "https://line.me/R/ti/p/@owldayhouse",
} as const;

export const social = {
  facebook: "https://facebook.com/owldayhouse",
  instagram: "https://instagram.com/owldayhouse",
  linkedin: "https://linkedin.com/company/owldayhouse",
} as const;

export interface NavLink {
  href: string;
  label: string;
  /** Render as a plain <a> (full navigation) instead of next/link — e.g. the
   *  interactive Showcase sub-app served statically outside the Next routes. */
  external?: boolean;
}

export const navLinks: readonly NavLink[] = [
  { href: "/about", label: "เราคือใคร" },
  { href: "/services", label: "เราทำอะไร" },
  { href: "/work", label: "ผลงาน" },
  { href: "/showcase/reveal/", label: "โชว์เคส", external: true },
  { href: "/packages", label: "แพ็กเกจ" },
  { href: "/talon", label: "Talon" },
  { href: "/news", label: "บทความ" },
  { href: "/contact", label: "ติดต่อ" },
];
