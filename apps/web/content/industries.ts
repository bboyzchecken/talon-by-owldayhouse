// Industry landing pages the sales team can link to directly. Shared facts first,
// then copy per locale. `proofWork` points at portfolio slugs, `proofCases` at
// NDA case slugs (content/portfolio.ts).

import type { Locale } from "@/lib/i18n";
import { keepThaiWordsDeep } from "@/lib/thai-wrap";
import type { Pillar } from "./services";

interface IndustryBase {
  slug: string;
  image: string;
  proofWork: readonly string[];
  proofCases: readonly string[];
}

interface IndustryText {
  /** Short name for links and menus. */
  name: string;
  title: string;
  metaTitle: string;
  metaDescription: string;
  lead: string;
  pains: readonly string[];
  moments: readonly string[];
  plan: Readonly<Record<Pillar, string>>;
  /** Optional line under the plan, e.g. a rule the industry must follow. */
  note?: string;
}

export type Industry = IndustryBase & IndustryText;

const base: readonly IndustryBase[] = [
  { slug: "education", image: "/imagery/event-hall.webp", proofWork: ["reg-tu"], proofCases: ["safety-kiosk-game", "tourism-events"] },
  { slug: "property-auto", image: "/imagery/kiosk.webp", proofWork: ["rodarea"], proofCases: ["printer-kol", "tourism-events"] },
  { slug: "healthcare", image: "/imagery/camera.webp", proofWork: [], proofCases: ["printer-kol", "restaurant-group"] },
];

const text: Record<Locale, Record<string, IndustryText>> = keepThaiWordsDeep({
  th: {
    education: {
      name: "สถาบันการศึกษา",
      title: "Open House และงานรับสมัคร ที่วัดผลเป็นจำนวนผู้สมัครได้",
      metaTitle: "งานอีเวนต์ Open House และแคมเปญรับสมัคร สำหรับสถาบันการศึกษา",
      metaDescription:
        "สำหรับมหาวิทยาลัย โรงเรียนนานาชาติ และคณะ ระบบลงทะเบียนผู้สนใจ เกม Kiosk ที่บูธ KOL ทีมถ่ายทำ และโฆษณาช่วงรับสมัคร พร้อมรายงานว่าได้ผู้สมัครเท่าไร",
      lead: "สำหรับมหาวิทยาลัย โรงเรียนนานาชาติ และคณะ ที่อยากให้ Open House และช่วงรับสมัครมีตัวเลขไปรายงานผู้บริหาร",
      pains: [
        "คนมางาน Open House เยอะ แต่ตามต่อไม่ได้ว่าใครสมัครจริง",
        "รายชื่อผู้สนใจกระจายอยู่ทั้งในกระดาษ ฟอร์ม และหลายแพลตฟอร์ม",
        "ต้องสรุปผลให้ผู้บริหารทุกปี แต่ไม่มีตัวเลขที่เชื่อถือได้",
      ],
      moments: ["Open House", "ช่วงรับสมัครนักศึกษา", "Job Fair และวันสหกิจศึกษา", "งานประชุมวิชาการ"],
      plan: {
        Build: "ระบบลงทะเบียนและติดตามผู้สนใจ ส่งรายชื่อต่อให้ฝ่ายรับสมัคร",
        Activate: "เกม Kiosk ที่บูธ KOL รุ่นพี่ และทีมถ่ายทำงาน",
        Grow: "ยิงแอดช่วงรับสมัคร ดูแลเพจ และรายงานว่าแต่ละช่องทางได้ผู้สมัครเท่าไร",
      },
      note: "ออกใบกำกับภาษีและเอกสารจัดซื้อจัดจ้างในนามบริษัทได้",
    },
    "property-auto": {
      name: "อสังหาและยานยนต์",
      title: "งานเปิดตัวและบูธ ที่ส่งรายชื่อลูกค้าถึงฝ่ายขายได้ทันที",
      metaTitle: "งานเปิดตัวโครงการ บูธ Motor Show และกิจกรรมโชว์รูม สำหรับอสังหาและยานยนต์",
      metaDescription:
        "สำหรับโครงการอสังหา ดีลเลอร์ และแบรนด์รถ เกมบูธ ระบบลงทะเบียนที่ส่งรายชื่อเข้าฝ่ายขาย KOL คลิปสรุปงาน และโฆษณาก่อนและหลังงาน",
      lead: "สำหรับโครงการอสังหา ดีลเลอร์ และแบรนด์รถ ที่วัดผลงานเป็นนัดชมโครงการหรือนัดทดลองขับ",
      pains: [
        "งานเปิดตัวคนเยอะ แต่รายชื่อส่งถึงเซลส์ช้าหรือไม่ครบ",
        "ไม่รู้ว่าลูกค้าที่มาจากงานปิดการขายได้กี่ราย",
        "ต้องจ้างคนทำบูธ ทีมถ่าย KOL และคนยิงแอด แยกกันหลายเจ้า",
      ],
      moments: ["งานเปิดตัวโครงการ", "วันเปิดบ้านตัวอย่าง", "Motor Show และงานแสดงรถ", "กิจกรรมในโชว์รูม"],
      plan: {
        Build: "ระบบลงทะเบียนหน้างาน ส่งรายชื่อเข้าระบบฝ่ายขายทันที",
        Activate: "เกมบูธ สุ่มรางวัล KOL รีวิวโครงการหรือรถ และคลิปสรุปงาน",
        Grow: "ยิงแอดก่อนและหลังงาน ยิงซ้ำให้คนที่มาร่วมงาน และติดตามเสียงพูดถึง",
      },
    },
    healthcare: {
      name: "โรงพยาบาลและคลินิก",
      title: "แคมเปญและกิจกรรม ที่วัดผลเป็นนัดหมายจริง",
      metaTitle: "แคมเปญ KOL งานกิจกรรม และระบบนัดหมาย สำหรับโรงพยาบาลและคลินิก",
      metaDescription:
        "สำหรับโรงพยาบาลเอกชนและคลินิก KOL ที่ตรงกลุ่มคนไข้ บูธและกิจกรรมนอกสถานที่ ระบบลงทะเบียนที่ขอความยินยอมตาม PDPA และรายงานว่าแคมเปญได้นัดหมายเท่าไร",
      lead: "สำหรับโรงพยาบาลเอกชนและคลินิก ที่อยากรู้ว่าแคมเปญและกิจกรรมพาคนไข้มาได้จริงกี่คน",
      pains: [
        "ใช้ KOL หลายคน แต่ไม่รู้ว่าคนไหนพาคนไข้มาได้จริง",
        "งานตรวจสุขภาพนอกสถานที่ยังเก็บรายชื่อด้วยกระดาษ",
        "ข้อมูลสุขภาพเป็นข้อมูลอ่อนไหว ต้องขอความยินยอมให้ถูกต้อง",
      ],
      moments: ["งานตรวจสุขภาพนอกสถานที่", "บูธในห้างและงานแสดงสินค้า", "แคมเปญแพ็กเกจตรวจสุขภาพ", "งานเปิดศูนย์หรือสาขาใหม่"],
      plan: {
        Build: "ระบบลงทะเบียนและนัดหมายที่ขอความยินยอมตาม PDPA",
        Activate: "KOL ที่คัดให้ตรงกลุ่มคนไข้ เกมบูธ และทีมถ่ายทำ",
        Grow: "ยิงแอด ดูแลเพจ และรายงานว่าแคมเปญได้นัดหมายเท่าไร",
      },
      note: "เราวางแผน creative ร่วมกับทีมของคุณ ให้ตรงตามเกณฑ์โฆษณาด้านสุขภาพ",
    },
  },
  en: {
    education: {
      name: "Education",
      title: "Open houses and admissions you can measure in applicants",
      metaTitle: "Open House Events and Admissions Campaigns for Education",
      metaDescription:
        "For universities, international schools and faculties: lead registration, booth kiosk games, KOLs, event filming and admissions ads, with a report on how many applicants each channel brought.",
      lead: "For universities, international schools and faculties that need numbers from open houses and admissions season to show leadership.",
      pains: [
        "Plenty of people come to the open house, but nobody can tell who actually applied.",
        "Prospect lists are scattered across paper, forms and several platforms.",
        "Leadership wants a summary every year, and there are no numbers to trust.",
      ],
      moments: ["Open houses", "Admissions season", "Job fairs and co-op days", "Academic conferences"],
      plan: {
        Build: "Registration and prospect tracking that hands names to the admissions team.",
        Activate: "Booth kiosk games, student KOLs and an event film crew.",
        Grow: "Admissions-season ads, page management and a report on applicants per channel.",
      },
      note: "We issue tax invoices and procurement documents as a registered company.",
    },
    "property-auto": {
      name: "Property & Automotive",
      title: "Launches and booths that get leads to sales right away",
      metaTitle: "Project Launches, Motor Show Booths and Showroom Events for Property and Automotive",
      metaDescription:
        "For property developers, dealers and car brands: booth games, registration that feeds your sales system, KOLs, recap videos and ads before and after the event.",
      lead: "For property developers, dealers and car brands that measure events in site visits and test drives.",
      pains: [
        "Launches draw a crowd, but the names reach sales late or incomplete.",
        "Nobody knows how many event leads turned into sales.",
        "The booth, film crew, KOLs and ads come from separate vendors.",
      ],
      moments: ["Project launches", "Show-unit open days", "Motor shows", "Showroom activities"],
      plan: {
        Build: "On-site registration that sends names into your sales system right away.",
        Activate: "Booth games, prize draws, KOL reviews of the project or car, and recap videos.",
        Grow: "Ads before and after the event, retargeting attendees and tracking conversation.",
      },
    },
    healthcare: {
      name: "Hospitals & Clinics",
      title: "Campaigns and activities measured in real appointments",
      metaTitle: "KOL Campaigns, Events and Appointment Systems for Hospitals and Clinics",
      metaDescription:
        "For private hospitals and clinics: KOLs matched to your patients, booths and off-site activities, registration with PDPA consent, and a report on appointments from each campaign.",
      lead: "For private hospitals and clinics that want to know how many patients a campaign or activity really brought in.",
      pains: [
        "Several KOLs are on the campaign, but nobody knows which ones bring patients.",
        "Off-site health checks still collect names on paper.",
        "Health data is sensitive, so consent has to be collected properly.",
      ],
      moments: ["Off-site health checks", "Mall booths and trade fairs", "Health package campaigns", "New center or branch openings"],
      plan: {
        Build: "Registration and appointment systems with PDPA consent.",
        Activate: "KOLs matched to your patients, booth games and a film crew.",
        Grow: "Ads, page management and a report on appointments from each campaign.",
      },
      note: "We plan creative with your team so it meets the rules for health advertising.",
    },
  },
});

export const industrySlugs = base.map((industry) => industry.slug);

export function getIndustries(locale: Locale): Industry[] {
  return base.map((industry) => ({ ...industry, ...(text[locale][industry.slug] as IndustryText) }));
}

export function getIndustry(locale: Locale, slug: string): Industry | undefined {
  return getIndustries(locale).find((industry) => industry.slug === slug);
}
