// Real client work. Items with status "live" have a working link; "closed"
// items were sizeable systems whose businesses have since shut down.

import type { Locale } from "@/lib/i18n";
import { keepThaiWordsDeep } from "@/lib/thai-wrap";

type Text = Record<Locale, string>;

export interface PortfolioItem {
  slug: string;
  title: Text;
  client: Text;
  category: Text;
  result: Text;
  image?: string;
  url?: string;
  status: "live" | "closed";
}

export const portfolio: readonly PortfolioItem[] = keepThaiWordsDeep([
  {
    slug: "reg-tu",
    title: { th: "ระบบลงทะเบียนเรียนออนไลน์", en: "Online course registration" },
    client: { th: "มหาวิทยาลัยธรรมศาสตร์", en: "Thammasat University" },
    category: { th: "ราชการ / มหาวิทยาลัย", en: "Government / University" },
    result: {
      th: "ระบบลงทะเบียนเรียนที่รองรับนักศึกษาหลายหมื่นคนพร้อมกันในช่วงลงทะเบียน ยังเปิดใช้งานจริงถึงวันนี้ที่ reg.tu.ac.th",
      en: "A registration system built for tens of thousands of students at once during enrollment. Still running today at reg.tu.ac.th.",
    },
    image: "/portfolio/reg-tu-home.webp",
    url: "https://reg.tu.ac.th",
    status: "live",
  },
  {
    slug: "rodarea",
    title: { th: "RodArea แผนที่และปฏิทินงานรถทั่วไทย", en: "RodArea: Thailand's car event map" },
    client: { th: "RodArea", en: "RodArea" },
    category: { th: "แพลตฟอร์ม / เว็บแอป", en: "Platform / Web app" },
    result: {
      th: "รวมงานรถและคาร์มีทที่เคยกระจายอยู่ตามกลุ่ม Facebook และ Line มาไว้บนแผนที่เดียว พร้อมปฏิทินงาน การกดสนใจเข้าร่วม และรีวิวหลังงาน",
      en: "Car meets once scattered across Facebook and Line groups, now on one map with an event calendar, RSVPs and post-event reviews.",
    },
    image: "/portfolio/rodarea-home.webp",
    url: "https://rodarea.com/",
    status: "live",
  },
  {
    slug: "pezy",
    title: { th: "PEZY e-Marketplace สัญชาติไทย", en: "PEZY: a Thai e-marketplace" },
    client: { th: "PEZY Online", en: "PEZY Online" },
    category: { th: "แพลตฟอร์ม / e-Marketplace", en: "Platform / e-Marketplace" },
    result: {
      th: "แพลตฟอร์มซื้อขายออนไลน์ครบวงจร ทั้งเว็บและโมบายแอป พร้อมระบบร้านค้า สินค้า ตะกร้า และโปรโมชัน",
      en: "A full online marketplace on web and mobile, with stores, products, cart and promotions.",
    },
    status: "closed",
  },
  {
    slug: "youwantgpu",
    title: { th: "You want GPU? ร้านการ์ดจอมือสองออนไลน์", en: "You want GPU? A used graphics card store" },
    client: { th: "You want GPU?", en: "You want GPU?" },
    category: { th: "เว็บร้านค้า / E-commerce", en: "E-commerce" },
    result: {
      th: "เว็บร้านที่แสดงเฉพาะของจริงในร้าน กรองตามรุ่นและ VRAM แยกเงื่อนไขรับประกันรายใบ และมีระบบหลังบ้านสำหรับเจ้าของร้าน",
      en: "A store showing only real stock, with filters by model and VRAM, per-card warranty terms and a back office for the owner.",
    },
    image: "/portfolio/youwantgpu-home.webp",
    url: "https://youwantgpu.com/",
    status: "live",
  },
  {
    slug: "speek",
    title: { th: "SPEEK แพลตฟอร์มจับคู่ติวเตอร์สอนภาษา", en: "SPEEK: a language tutor marketplace" },
    client: { th: "SPEEK Academy", en: "SPEEK Academy" },
    category: { th: "แพลตฟอร์ม / เว็บแอป", en: "Platform / Web app" },
    result: {
      th: "จับคู่ผู้เรียนกับติวเตอร์ทั้งเรียนเดี่ยวและกลุ่ม พร้อมระบบจอง คะแนนสะสม และแดชบอร์ดผู้สอนและผู้เรียน",
      en: "Matches learners with tutors for private and group classes, with booking, loyalty points and dashboards for both sides.",
    },
    status: "closed",
  },
  {
    slug: "intersant",
    title: { th: "INTERSANT PLUS เว็บธุรกิจวัสดุก่อสร้าง", en: "INTERSANT PLUS: a building materials website" },
    client: { th: "Intersant Plus Material", en: "Intersant Plus Material" },
    category: { th: "เว็บธุรกิจ", en: "Business website" },
    result: {
      th: "เว็บไซต์บริษัทวัสดุก่อสร้าง uPVC วางโครงเนื้อหา ดีไซน์ และระบบจัดการให้ดูน่าเชื่อถือ",
      en: "A company website for a uPVC materials business, covering content structure, design and management.",
    },
    status: "closed",
  },
]);

export const liveWork = portfolio.filter((item) => item.status === "live");
export const earlierWork = portfolio.filter((item) => item.status === "closed");

export const clientNames: readonly string[] = [
  "Thammasat University",
  "RodArea",
  "You want GPU?",
  "PEZY",
  "SPEEK",
  "INTERSANT PLUS",
];
