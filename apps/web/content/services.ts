// Services for the /services page. Illustrations are the brand's own assets
// (apps/web/public/illustrations) carried over from the existing site.

export interface Service {
  slug: string;
  title: string;
  blurb: string;
  points: readonly string[];
  illustration: string;
}

export const services: readonly Service[] = [
  {
    slug: "website",
    title: "เว็บไซต์",
    blurb: "เว็บบริษัท แลนดิ้งเพจ และร้านค้า ที่โหลดไว ดูโปรบนมือถือ และพร้อมให้ Google เจอ",
    points: ["เว็บบริษัท / องค์กร", "แลนดิ้งเพจแคมเปญ", "วาง SEO ตั้งแต่วันแรก"],
    illustration: "/illustrations/003-layout.svg",
  },
  {
    slug: "app",
    title: "เว็บแอป & โมบายแอป",
    blurb: "ระบบที่ลูกค้าหรือทีมใช้งานจริง ตั้งแต่ระบบจองคิวไปจนถึงแดชบอร์ดจัดการข้อมูล",
    points: ["ระบบสมาชิก / จองคิว", "แดชบอร์ดหลังบ้าน", "รองรับทุกขนาดหน้าจอ"],
    illustration: "/illustrations/004-responsive-design.svg",
  },
  {
    slug: "enterprise",
    title: "ระบบองค์กร",
    blurb: "ระบบขนาดใหญ่ที่ต้องการความเสถียรและปลอดภัย เช่น ระบบลงทะเบียนหรือระบบภายในองค์กร",
    points: ["ออกแบบเฉพาะองค์กร", "รองรับผู้ใช้จำนวนมาก", "ดูแลและพัฒนาต่อเนื่อง"],
    illustration: "/illustrations/office-building.svg",
  },
  {
    slug: "graphic",
    title: "งานกราฟิก",
    blurb: "โลโก้ แบรนด์ดิ้ง และงานออกแบบ ให้ภาพลักษณ์ธุรกิจดูน่าเชื่อถือและเป็นหนึ่งเดียว",
    points: ["โลโก้ & แบรนด์ดิ้ง", "กราฟิกโซเชียล", "สื่อสิ่งพิมพ์"],
    illustration: "/illustrations/graphic-design.svg",
  },
];
