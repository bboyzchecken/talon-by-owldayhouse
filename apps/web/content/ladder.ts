// Value ladder — 4 tiers customers can climb without switching vendors.
// NOTE: prices for tiers 02–04 are starting estimates — confirm before launch (Step 6).

export interface LadderStep {
  step: string;
  name: string;
  priceFrom: string;
  tagline: string;
  features: readonly string[];
  href: string;
}

export const ladder: readonly LadderStep[] = [
  {
    step: "01",
    name: "เว็บหน้าเดียว (Talon)",
    priceFrom: "฿3,900",
    tagline: "แพ็กเกจโปรโมชัน เว็บหน้าเดียวเสร็จไวใน 5 วัน",
    features: ["หน้าเดียวจบ ดูโปร", "ผูก Messenger / LINE", "ทีมคนไทยดูแลต่อ"],
    href: "/talon",
  },
  {
    step: "02",
    name: "เว็บธุรกิจ",
    priceFrom: "฿19,000",
    tagline: "เว็บบริษัทหลายหน้า + ระบบจัดการเนื้อหา",
    features: ["หลายหน้า + ข่าว/บล็อก", "วาง SEO ครบ", "แก้เองได้ผ่าน CMS"],
    href: "/packages",
  },
  {
    step: "03",
    name: "ระบบ / ร้านออนไลน์",
    priceFrom: "฿59,000",
    tagline: "เว็บแอป ระบบจอง หรือร้านค้าออนไลน์",
    features: ["ระบบสมาชิก / ตะกร้า", "เชื่อมต่อชำระเงิน", "แดชบอร์ดจัดการ"],
    href: "/services",
  },
  {
    step: "04",
    name: "ระบบองค์กร / ราชการ",
    priceFrom: "ประเมินตามงาน",
    tagline: "ระบบขนาดใหญ่ เช่น ระบบลงทะเบียน",
    features: ["รองรับผู้ใช้จำนวนมาก", "ออกแบบเฉพาะองค์กร", "ดูแลระยะยาว"],
    href: "/work",
  },
];
