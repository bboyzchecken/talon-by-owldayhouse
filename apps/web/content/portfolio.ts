// Portfolio — government / university work pushed to the top as proof.
// NOTE: non-TU entries are placeholders; swap in real client cases in Step 6/10.

export interface PortfolioItem {
  title: string;
  client: string;
  category: string;
  result: string;
  url?: string;
  featured?: boolean;
}

export const portfolio: readonly PortfolioItem[] = [
  {
    title: "ระบบลงทะเบียนเรียนออนไลน์",
    client: "มหาวิทยาลัยธรรมศาสตร์",
    category: "ราชการ / มหาวิทยาลัย",
    result: "รองรับนักศึกษาหลายหมื่นคนพร้อมกันในช่วงลงทะเบียน",
    url: "https://reg.tu.ac.th",
    featured: true,
  },
  {
    title: "เว็บไซต์องค์กร + ระบบหลังบ้าน",
    client: "ลูกค้าองค์กร",
    category: "องค์กร",
    result: "รวมข้อมูลและงานเอกสารไว้ที่เดียว ลดงานซ้ำซ้อน",
    featured: true,
  },
  {
    title: "ร้านค้าออนไลน์ + ระบบสั่งซื้อ",
    client: "ธุรกิจ SME เชียงใหม่",
    category: "เว็บธุรกิจ",
    result: "เพิ่มยอดสั่งซื้อผ่านเว็บและแชท",
    featured: true,
  },
];

export const trustedBy: readonly string[] = [
  "มหาวิทยาลัยธรรมศาสตร์",
  "reg.tu.ac.th",
  "หน่วยงานราชการ",
  "ธุรกิจ SME เชียงใหม่",
];
