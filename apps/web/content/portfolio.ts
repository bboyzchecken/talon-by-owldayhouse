// Real client work. Items with status "live" are still in use — a public site
// carries its link, an in-house system has none and shows no link; "closed"
// items were sizeable systems whose businesses have since shut down;
// "handed-over" items were built by us, then handed to another team that runs a
// later version (describe only the version we built, never link or name it);
// "unreleased" items we finished and handed over, but the client never put them
// in front of the public, so there is nothing to link and the client stays
// unnamed.

import type { Locale } from "@/lib/i18n";
import { keepThaiWordsDeep } from "@/lib/thai-wrap";
import type { Pillar } from "./services";

type Text = Record<Locale, string>;

export interface PortfolioItem {
  slug: string;
  title: Text;
  client: Text;
  category: Text;
  result: Text;
  image?: string;
  /** Shown under the picture when it is a mockup rather than a screenshot. */
  imageNote?: Text;
  url?: string;
  status: "live" | "closed" | "handed-over" | "unreleased";
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
    // The counter system staff use in the shop, so there is no public link.
    // The picture is a mockup of the weighing step, drawn with a made-up bill.
    slug: "postmailbox",
    title: { th: "ระบบหน้าร้านของ POST MAIL BOX", en: "POST MAIL BOX: the shop counter system" },
    client: { th: "POST MAIL BOX", en: "POST MAIL BOX" },
    category: { th: "ระบบหน้าร้าน / ขนส่งและพัสดุ", en: "Counter system / Shipping" },
    result: {
      th: "ระบบที่พนักงานหน้าร้านใช้รับงานทุกอย่างในจอเดียว ตั้งแต่ชั่งน้ำหนักพัสดุ เลือกบริการส่ง กล่องและการแพ็ก แสตมป์ งานเอกสาร ติดตามพัสดุ แลกเงิน ไปจนถึงปิดบิลและออกใบเสร็จ เดินเป็นขั้นตอนทีละหน้าจอ พนักงานใหม่จึงรับงานได้เร็วและคิดเงินไม่ตกหล่น และสลับไทย–อังกฤษได้ทั้งระบบ รับลูกค้าต่างชาติหน้าร้านได้",
      en: "One screen for everything at the counter: weighing the parcel, choosing the shipping service, boxes and packing, stamps, document jobs, tracking, currency exchange and closing the bill. It walks staff through one step at a time, so new people pick it up quickly and nothing is left off the bill, and the whole system switches between Thai and English for walk-in customers from abroad.",
    },
    image: "/portfolio/postmailbox-counter.webp",
    imageNote: { th: "ภาพจำลองหน้าจอชั่งน้ำหนักที่เคาน์เตอร์ ข้อมูลในบิลเป็นของสมมติ", en: "A mockup of the counter's weighing screen, with made-up bill data" },
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
    // Mockup redrawn from our old presentation board; made-up stores, people and data.
    image: "/portfolio/pezy-mockup.webp",
    imageNote: { th: "ภาพจำลองหน้าแรกของ PEZY ร้านค้าและสินค้าเป็นของสมมติ", en: "A mockup of PEZY's home page, with made-up stores and products" },
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
    // v1 built and maintained by us (2023, public launch post on our Facebook page
    // 30 Nov 2023), then handed over with signed documents; another team runs v2.
    // Keep it unnamed: no client name, logo, link or screenshots of v2, and no real card art.
    // The picture is a mockup of the v1 auction page with made-up cards and data.
    slug: "tcg-marketplace",
    title: { th: "แพลตฟอร์มซื้อขายและประมูลการ์ดเกม", en: "A trading card marketplace with live auctions" },
    client: { th: "ธุรกิจการ์ดเกมสะสมในไทย", en: "A Thai trading card business" },
    category: { th: "แพลตฟอร์ม / e-Marketplace", en: "Platform / e-Marketplace" },
    result: {
      th: "ทำเวอร์ชันแรก (ปี 2566) ครบทุกส่วน ตั้งแต่ UX/UI, หน้าเว็บ, API, ฐานข้อมูล ไปจนถึงระบบหลังบ้าน ได้แก่ ระบบซื้อขาย ประมูล ประวัติราคา ตั้งรับซื้อ และแจ้งเตือน ชำระเงินผ่าน GB Prime Pay ดูแลระบบช่วงปีแรก แล้วส่งมอบ source code ให้ทีมของลูกค้าพัฒนาต่อ",
      en: "We built the first version (2023) end to end: UX/UI, web front end, API, database and back office, covering buying and selling, live auctions, price history, buy requests and notifications, with payments through GB Prime Pay. We ran it through its first year, then handed the source code over for the client's next team to take forward.",
    },
    image: "/portfolio/tcg-marketplace-v1.webp",
    imageNote: { th: "ภาพจำลองหน้าประมูลของเวอร์ชันแรก ข้อมูลและการ์ดเป็นของสมมติ", en: "A mockup of the first version's auction page, with made-up cards and data" },
    status: "handed-over",
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
    // Mockup redrawn from our old presentation board; made-up stores, people and data.
    image: "/portfolio/speek-mockup.webp",
    imageNote: { th: "ภาพจำลองแดชบอร์ดผู้เรียนของ SPEEK ข้อมูลเป็นของสมมติ", en: "A mockup of SPEEK's learner dashboard, with made-up data" },
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
  {
    // Built for the client and handed over, but never launched: the project's
    // backer pulled out and the client dropped it. Keep it unnamed — no client
    // name, logo, link or screenshots — and never imply it is running.
    slug: "game-item-store",
    title: { th: "เว็บไซต์ขายไอเทมในเกม", en: "An in-game item store" },
    client: { th: "ธุรกิจเกมในไทย", en: "A Thai gaming business" },
    category: { th: "เว็บร้านค้า / เกม", en: "E-commerce / Gaming" },
    result: {
      th: "เว็บไซต์ขายไอเทมในเกมพร้อมระบบสั่งซื้อ งานเสร็จและส่งมอบครบ แต่ไม่ได้เปิดตัว เพราะผู้สนับสนุนของโปรเจกต์ถอนตัวไปก่อน",
      en: "A website for selling in-game items, with the ordering flow built in. The work was finished and handed over, but it never launched: the project's backer pulled out first.",
    },
    status: "unreleased",
  },
]);

export const liveWork = portfolio.filter((item) => item.status === "live");
/** The teaser grid on the home and service pages: one full row of three, in the order the live items are listed above. The work page shows every item. */
export const topWork = liveWork.slice(0, 3);
/** Work shown with a picture on the work page: live sites plus earlier work we have a picture for. */
export const featuredWork = [...liveWork, ...portfolio.filter((item) => item.status !== "live" && item.image)];
export const earlierWork = portfolio.filter((item) => item.status !== "live" && !item.image);

/**
 * Campaign and event work under NDA (mostly delivered for agencies). Never name
 * the brand: describe it by its category. Fill `metric` only with a number the
 * team has confirmed.
 */
export interface CaseStudy {
  slug: string;
  pillar: Pillar;
  /** Related service slugs, so service pages can show the right cases. */
  services: readonly string[];
  category: Text;
  client: Text;
  work: Text;
  metric?: Text;
  /** Keep the case in the data but off the site. */
  hidden?: boolean;
}

const allCases: readonly CaseStudy[] = keepThaiWordsDeep([
  {
    // Delivered as a subcontractor; the client knows the work as the main contractor's.
    // Keep it generic: no game title, tagline, mascot, scene or agency name, and no screenshots.
    slug: "safety-kiosk-game",
    pillar: "Activate",
    services: ["event-interactive"],
    category: { th: "เกม Kiosk / หน่วยงานรัฐ", en: "Kiosk game / Government" },
    client: { th: "หน่วยงานรัฐ", en: "A government agency" },
    work: {
      th: "เกมบนตู้ Kiosk สอนเด็กและเยาวชนเรื่องความปลอดภัยทางน้ำ เล่นได้ทั้งเสียง ท่าทางหน้ากล้อง และการแตะจอ ทำงานออฟไลน์ และไม่เก็บข้อมูลผู้เล่น",
      en: "A kiosk game teaching children and young people about water safety, played by voice, by moving in front of the camera and by touch. It runs offline and stores no player data.",
    },
    metric: { th: "3 วิธีเล่นในเกมเดียว", en: "3 ways to play" },
  },
  {
    slug: "printer-kol",
    pillar: "Activate",
    services: ["kol-influencer"],
    category: { th: "KOL และ Influencer", en: "KOL & Influencers" },
    client: { th: "แบรนด์เครื่องพิมพ์ระดับโลก", en: "A global printer brand" },
    work: { th: "คัดเลือกและประสานงาน KOL ให้แคมเปญของแบรนด์", en: "KOL selection and coordination for a brand campaign" },
    metric: { th: "KOL 55 คน", en: "55 KOLs" },
  },
  {
    slug: "restaurant-group",
    // Hidden until the end of this year. Remove `hidden` to show it again.
    hidden: true,
    pillar: "Activate",
    services: ["kol-influencer"],
    category: { th: "KOL และ Influencer", en: "KOL & Influencers" },
    client: { th: "ร้านปิ้งย่างเกาหลีในเครือกลุ่มร้านอาหารรายใหญ่", en: "A Korean BBQ chain from a major restaurant group" },
    work: { th: "คัดเลือกและประสานงาน KOL ให้แคมเปญของร้าน", en: "KOL selection and coordination for the chain's campaign" },
    metric: { th: "KOL 23 คน", en: "23 KOLs" },
  },
  {
    slug: "tourism-events",
    pillar: "Activate",
    services: ["event-interactive", "event-content"],
    category: { th: "งานอีเวนต์ / ราชการ", en: "Events / Government" },
    client: { th: "หน่วยงานรัฐด้านการท่องเที่ยว", en: "A national tourism agency" },
    work: { th: "ออกบูธและงานอีเวนต์ของหน่วยงาน", en: "Booths and events for the agency" },
  },
]);

export const cases: readonly CaseStudy[] = allCases.filter((item) => !item.hidden);

/** Industries we have worked in, shown instead of client names (most work is under NDA). */
export const industryNames: Record<Locale, readonly string[]> = keepThaiWordsDeep({
  th: ["การศึกษา", "หน่วยงานรัฐ", "การท่องเที่ยว", "เทคโนโลยี", "ร้านอาหาร", "อีคอมเมิร์ซ", "ขนส่งและพัสดุ", "วัสดุก่อสร้าง", "คอมมูนิตี้รถยนต์", "เกม"],
  en: ["Education", "Government", "Tourism", "Technology", "Restaurants", "E-commerce", "Shipping & parcels", "Building materials", "Car community", "Gaming"],
});
