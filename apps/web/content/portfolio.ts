// Real client work. Items with status "live" have a working link; "closed"
// items were sizeable systems whose businesses have since shut down.

export interface PortfolioItem {
  title: string;
  client: string;
  category: string;
  result: string;
  image?: string;
  url?: string;
  status?: "live" | "closed";
  featured?: boolean;
  /** Override the card's link label (defaults to "ดูระบบจริง"). */
  linkLabel?: string;
}

export const portfolio: readonly PortfolioItem[] = [
  {
    title: "ระบบลงทะเบียนเรียนออนไลน์",
    client: "มหาวิทยาลัยธรรมศาสตร์",
    category: "ราชการ / มหาวิทยาลัย",
    result:
      "ระบบลงทะเบียนเรียนที่รองรับนักศึกษาหลายหมื่นคนพร้อมกันในช่วงลงทะเบียน — ยังเปิดใช้งานจริงถึงวันนี้ที่ reg.tu.ac.th",
    image: "/portfolio/reg-tu-ac-th.webp",
    url: "https://reg.tu.ac.th",
    status: "live",
    featured: true,
  },
  {
    title: "RodArea — แผนที่และปฏิทินงานรถทั่วไทย",
    client: "RodArea",
    category: "แพลตฟอร์ม / เว็บแอป",
    result:
      "รวมงานรถและคาร์มีทที่เคยกระจายอยู่ตามกลุ่ม Facebook / Line มาไว้บนแผนที่เดียว — โพสต์งานด้วยลิงก์ Google Maps ปักหมุดให้อัตโนมัติ พร้อมปฏิทินงาน กดสนใจเข้าร่วม และรีวิวหลังงาน",
    image: "/portfolio/rodarea.webp",
    url: "https://rodarea.com/",
    status: "live",
  },
  {
    title: "You want GPU? — ร้านการ์ดจอมือสองออนไลน์",
    client: "You want GPU?",
    category: "เว็บร้านค้า / E-commerce",
    result:
      "เว็บร้านการ์ดจอมือสองที่แสดงเฉพาะของจริงในร้าน — กรองตามรุ่น VRAM และช่วงราคา แยกเงื่อนไขรับประกันรายใบ มีเมนูตามหารุ่น และระบบหลังบ้านสำหรับเจ้าของร้าน",
    image: "/portfolio/youwantgpu.webp",
    url: "https://youwantgpu.com/",
    status: "live",
  },
  {
    title: "PEZY — e-Marketplace สัญชาติไทย",
    client: "PEZY Online",
    category: "แพลตฟอร์ม / e-Marketplace",
    result:
      "แพลตฟอร์มซื้อขายออนไลน์ครบวงจร ทั้งเว็บและโมบายแอป — ระบบร้านค้า สินค้า ตะกร้า และโปรโมชัน",
    image: "/portfolio/pezy.jpg",
    status: "closed",
    featured: true,
  },
  {
    title: "SPEEK — แพลตฟอร์มจับคู่ติวเตอร์สอนภาษา",
    client: "SPEEK Academy",
    category: "แพลตฟอร์ม / เว็บแอป",
    result:
      "จับคู่ผู้เรียนกับติวเตอร์ ทั้งเรียนเดี่ยวและกลุ่ม พร้อมระบบจอง คะแนนสะสม (SPEEK Points) และแดชบอร์ดผู้สอน/ผู้เรียน",
    image: "/portfolio/speek.jpg",
    status: "closed",
    featured: true,
  },
  {
    title: "INTERSANT PLUS — เว็บธุรกิจวัสดุก่อสร้าง",
    client: "Intersant Plus Material",
    category: "เว็บธุรกิจ",
    result: "เว็บไซต์บริษัทวัสดุก่อสร้าง uPVC — วางโครงเนื้อหา ดีไซน์ และระบบจัดการให้ดูน่าเชื่อถือ",
    image: "/portfolio/intersant.jpg",
    status: "closed",
  },
  {
    title: "Interactive Showcase — เอฟเฟกต์ Spotlight Reveal",
    client: "Owl Day House",
    category: "โชว์เคส / Interactive",
    result:
      "เดโมงานหน้าเว็บเชิงโต้ตอบ — เลื่อนเคอร์เซอร์ส่องสปอตไลต์ทะลุดีไซน์ที่เสร็จสวย ลงไปเห็นโครงสร้างระบบเบื้องหลัง สื่อแนวคิด “จากเว็บแรก ฿3,900 สู่ระบบระดับองค์กร” ทำด้วยเทคนิคที่เน้นความเร็ว (CSS mask + LCP) ไม่ใช้ canvas",
    image: "/showcase/surface.svg",
    url: "/showcase/reveal/",
    status: "live",
    linkLabel: "เปิดดูโชว์เคส",
  },
];

export const trustedBy: readonly string[] = [
  "มหาวิทยาลัยธรรมศาสตร์",
  "PEZY",
  "SPEEK",
  "INTERSANT PLUS",
];
