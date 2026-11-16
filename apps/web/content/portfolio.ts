// Real client work. Items with status "live" are still in use — a public site
// carries its link, an in-house system has none and shows no link; "closed"
// items were sizeable systems whose businesses have since shut down;
// "handed-over" items were built by us, then handed to another team that runs a
// later version (describe only the version we built, never link or name it);
// "unreleased" items we finished and handed over, but the client never put them
// in front of the public, so there is nothing to link and nothing to screenshot.

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
    // Three years of work (2021–2024), built end to end including the servers it
    // ran on. The service has since closed, so there is no link and no live app
    // to point at.
    slug: "fan-delivery",
    title: { th: "FAN Delivery แอปเดลิเวอรีหลายบริการ", en: "FAN Delivery: a multi-service delivery app" },
    client: { th: "FAN Delivery", en: "FAN Delivery" },
    category: { th: "แพลตฟอร์ม / เดลิเวอรี", en: "Platform / Delivery" },
    result: {
      th: "แพลตฟอร์มเดลิเวอรีที่รวมสั่งอาหาร รับส่งคนและของ ซักรีด และบริการจัดโมเมนต์พิเศษไว้ที่เดียว ทำครบตั้งแต่ UX/UI หน้าเว็บ API หลังบ้าน ไปจนถึงวาง infrastructure และหาเครื่องเซิร์ฟเวอร์เอง หลังบ้านดูแลไรเดอร์ ร้านค้า ค่า GP แยกรายจังหวัด โบนัสไรเดอร์ เครดิตและส่วนลด รอบตัดบิลและโอนเงินให้ร้านและไรเดอร์ และรับชำระผ่านสิทธิ์รัฐทั้งคนละครึ่ง เราชนะ และ ม33เรารักกัน ดูแลระบบต่อเนื่องสามปี",
      en: "A delivery platform with food, rides and parcels, laundry and special-occasion bookings in one place. We built all of it: UX/UI, the web front ends, the API, the back office, and the infrastructure and servers it ran on. The back office covered riders, merchants, commission rates set per province, rider bonuses, credit and discounts, billing cycles and payouts to shops and riders, and payment through the Thai government co-pay schemes. We ran it for three years.",
    },
    image: "/portfolio/fan-delivery-admin.webp",
    imageNote: {
      th: "ภาพจำลองหลังบ้านและแอปฝั่งลูกค้าของ FAN Delivery ออเดอร์ ร้านอาหาร และโปรโมชันเป็นของสมมติ",
      en: "A mockup of FAN Delivery's back office and customer app, with made-up orders, restaurants and promotions",
    },
    status: "closed",
  },
  {
    // Delivered as a subcontractor for a government agency; the client knows the
    // work as the main contractor's. Keep it unnamed: no agency, no main
    // contractor, no link, and no screenshots of the real board — the picture is
    // a mockup. Describe the risk keywords as a queue for the team: never quote
    // the phrases themselves, and keep the sample posts gentle.
    slug: "encourage-board",
    title: { th: "กระดานระบายและให้กำลังใจออนไลน์", en: "An online board for venting and encouragement" },
    client: { th: "หน่วยงานรัฐ", en: "A government agency" },
    category: { th: "เว็บแอป / สุขภาพใจ", en: "Web app / Mental health" },
    result: {
      th: "พื้นที่ให้คนเข้ามาระบายเรื่องที่แบกอยู่ แล้วให้คนอื่นเข้ามาให้กำลังใจกัน หลังบ้านมีตัวกรองคำหยาบ ตั้งคีย์เวิร์ดกลุ่มเสี่ยงเพื่อดันโพสต์ที่ควรได้รับการดูแลก่อนขึ้นมาให้ทีมงานเห็น ระงับผู้ใช้ที่ก่อกวน คัดโพสต์ขึ้นหน้าฟีด และแดชบอร์ดสถิติว่าคนเข้ามาช่วงเวลาไหนและกลับมาใช้ซ้ำแค่ไหน ทำงานนี้ในฐานะผู้รับเหมาช่วง",
      en: "A place to put down what you are carrying, and for other people to leave encouragement. Behind it: a profanity filter, risk keywords that push the posts needing attention to the top of the team's queue, suspension for users who disrupt the board, a way to feature posts, and dashboards showing when people come and how many come back. We delivered it as a subcontractor.",
    },
    image: "/portfolio/encourage-board.webp",
    imageNote: {
      th: "ภาพจำลองหน้าดูแลกระดาน ข้อความและตัวเลขทั้งหมดเป็นของสมมติ",
      en: "A mockup of the moderation screen, with made-up posts and figures",
    },
    status: "closed",
  },
  {
    slug: "e-saraban",
    title: { th: "E-Saraban ระบบบริหารงานเอกสาร", en: "E-Saraban: a document management system" },
    client: { th: "สถาบันการศึกษา", en: "An educational institution" },
    category: { th: "ระบบภายใน / การศึกษา", en: "Internal system / Education" },
    result: {
      th: "ระบบสารบรรณที่ส่งเอกสารถึงอาจารย์และเจ้าหน้าที่ตามลำดับความสำคัญ กดรับเอกสาร เห็นวันที่ต้องเซ็น แล้วจัดเก็บเข้าคลังเอกสารเมื่อจบเรื่อง แยกบัญชีและสิทธิ์ของอาจารย์กับเจ้าหน้าที่ออกจากกัน",
      en: "A correspondence system that routes documents to teaching staff and officers by priority. They accept a document, see the date it has to be signed by, then file it into the document store once the matter is closed, with separate accounts and rights for teaching staff and officers.",
    },
    image: "/portfolio/e-saraban.webp",
    imageNote: {
      th: "ภาพจำลองตารางเอกสาร เลขที่หนังสือ เรื่อง และชื่อเป็นของสมมติ",
      en: "A mockup of the document table, with made-up reference numbers, subjects and names",
    },
    status: "closed",
  },
  {
    // Finished and handed over (the work is on the repository's `develop`
    // branch, not `master`), but the backer pulled out and the client never
    // launched it, so there is nothing to link and the picture is a mockup.
    slug: "gameconnext",
    title: { th: "GameConnext ตลาดซื้อขายไอเทมในเกม", en: "GameConnext: a marketplace for in-game items" },
    client: { th: "GameConnext", en: "GameConnext" },
    category: { th: "แพลตฟอร์ม / e-Marketplace", en: "Platform / e-Marketplace" },
    result: {
      th: "ตลาดกลางที่ให้ผู้ขายเปิดร้านขายไอเทมในเกมของตัวเอง ตั้งแต่สมัครและอนุมัติร้านค้า ลงขายสินค้าแยกตามเกม จัดการคำสั่งซื้อ ชำระเงิน รอบตัดบิลและถอนเงินเข้าบัญชีผู้ขาย ข้อความระหว่างร้านกับลูกค้า ไปจนถึงคิวรับเรื่องร้องเรียน ทำครบทั้งหน้าเว็บ หลังบ้าน และ infrastructure งานเสร็จและส่งมอบแล้ว แต่ไม่ได้เปิดตัว เพราะผู้สนับสนุนของโปรเจกต์ถอนตัวไปก่อน",
      en: "A marketplace where sellers open their own shop for in-game items: seller sign-up and approval, listings grouped by game, order management, payments, billing cycles and withdrawals to sellers' accounts, messaging between shops and buyers, and a queue for customer complaints. We built the front end, the back office and the infrastructure. The work was finished and handed over, but it never launched: the project's backer pulled out first.",
    },
    image: "/portfolio/gameconnext-seller.webp",
    imageNote: {
      th: "ภาพจำลองแดชบอร์ดผู้ขาย ร้านค้า เกม และสินค้าเป็นของสมมติ",
      en: "A mockup of the seller dashboard, with made-up shops, games and items",
    },
    status: "unreleased",
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
