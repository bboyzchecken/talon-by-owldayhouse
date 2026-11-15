// The privacy policy, in both languages.
//
// Company facts (legal name, registered office, phone, e-mail) are NOT repeated
// here — the view renders them from content/site.ts, which stays the single
// source of truth. Keep this file to the policy itself.
//
// Two things in here are promises, not descriptions, so they have to stay true
// of the system: unaccepted form submissions are deleted within 180 days, and a
// request to exercise a right gets an answer within 30 days (the period the
// PDPA sets). Change the wording only together with the behaviour.

import { keepThaiWordsDeep } from "@/lib/thai-wrap";
import type { Locale } from "@/lib/i18n";

export interface PolicySection {
  heading: string;
  paragraphs?: readonly string[];
  bullets?: readonly string[];
  /** Paragraphs that follow the bullet list. */
  after?: readonly string[];
}

export interface PolicyCopy {
  label: string;
  title: string;
  lead: string;
  updatedLabel: string;
  updated: string;
  metaTitle: string;
  metaDescription: string;
  /** Rendered from content/site.ts so the company facts live in one place. */
  controller: {
    heading: string;
    intro: string;
    officeLabel: string;
    contactLabel: string;
  };
  sections: readonly PolicySection[];
}

const privacy = {
  th: {
    label: "Privacy",
    title: "นโยบายความเป็นส่วนตัว",
    lead: "เราเก็บข้อมูลส่วนบุคคลเท่าที่ต้องใช้คุยงานกับคุณ หน้านี้บอกว่าเก็บอะไร เก็บนานแค่ไหน และคุณสั่งให้เราลบได้อย่างไร",
    updatedLabel: "มีผลตั้งแต่",
    updated: "15 พฤศจิกายน 2026",
    metaTitle: "นโยบายความเป็นส่วนตัว | Owl Day House",
    metaDescription:
      "Owl Day House เก็บข้อมูลส่วนบุคคลอะไรบ้าง เก็บนานแค่ไหน เปิดเผยให้ใคร และวิธีใช้สิทธิขอดู ขอแก้ไข หรือขอให้ลบข้อมูลของคุณ",
    controller: {
      heading: "ใครเป็นผู้เก็บข้อมูลของคุณ",
      intro:
        "ผู้ควบคุมข้อมูลส่วนบุคคลตามพระราชบัญญัติคุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562 คือ",
      officeLabel: "สำนักงานจดทะเบียน",
      contactLabel: "ติดต่อเรื่องข้อมูลส่วนบุคคล",
    },
    sections: [
      {
        heading: "ข้อมูลที่เราเก็บ",
        paragraphs: ["เราเก็บเท่าที่คุณให้มาเอง กับข้อมูลพื้นฐานที่เกิดขึ้นเมื่อมีคนเข้าชมเว็บไซต์"],
        bullets: [
          "เมื่อคุณติดต่อเราทางอีเมล LINE Messenger หรือโทรศัพท์ เราเก็บชื่อ ชื่อบริษัท ช่องทางติดต่อที่คุณให้ไว้ และรายละเอียดงานที่คุยกัน",
          "เมื่อคุณส่งรายละเอียดงานผ่านแบบฟอร์มบนเว็บไซต์ เราเก็บสิ่งที่คุณกรอกทั้งหมด พร้อมหน้าที่คุณกรอกเข้ามา ที่มาของลิงก์ และพารามิเตอร์แคมเปญ (utm) ถ้ามี",
          "เพื่อกันสแปม เราเก็บค่าที่คำนวณจากหมายเลขไอพีของคุณแบบย้อนกลับไม่ได้ และชนิดของเบราว์เซอร์ เราไม่เก็บหมายเลขไอพีตรง ๆ",
          "เมื่อคุณเข้าชมเว็บไซต์ Google Analytics 4 เก็บข้อมูลการใช้งานผ่านคุกกี้ เช่น หน้าที่เปิด ประเทศโดยประมาณ และชนิดอุปกรณ์",
        ],
        after: [
          "เราไม่เก็บเลขบัตรประชาชน ข้อมูลสุขภาพ ข้อมูลทางการเงิน หรือข้อมูลอ่อนไหวอื่น และเว็บไซต์นี้ไม่รับชำระเงิน",
        ],
      },
      {
        heading: "เราใช้ข้อมูลทำอะไร",
        bullets: [
          "ติดต่อกลับ และเสนอแนวทางกับใบเสนอราคาตามที่คุณขอ",
          "เก็บประวัติการคุยงานไว้ในระบบลูกค้าภายใน เพื่อให้ทีมที่ดูแลคุณรู้เรื่องเดียวกัน",
          "ดูว่าหน้าไหนบนเว็บไซต์มีประโยชน์ เพื่อปรับปรุงเนื้อหา",
          "ป้องกันสแปมและการใช้แบบฟอร์มในทางที่ผิด",
        ],
        after: [
          "ฐานทางกฎหมายที่เราใช้คือความยินยอมของคุณเมื่อส่งแบบฟอร์ม และประโยชน์โดยชอบด้วยกฎหมายในการติดต่อธุรกิจและรักษาความปลอดภัยของระบบ ถ้าเราได้ทำงานร่วมกันแล้ว จะมีฐานการปฏิบัติตามสัญญาเพิ่มเข้ามา",
        ],
      },
      {
        heading: "เราเก็บไว้นานแค่ไหน",
        bullets: [
          "คำขอจากแบบฟอร์มที่เราไม่ได้รับเข้าระบบลูกค้า จะถูกลบภายใน 180 วันนับจากวันที่ส่ง",
          "ข้อมูลของลูกค้าและผู้ที่เราคุยงานด้วย เก็บไว้ตลอดเวลาที่ยังติดต่อกัน และหลังจากนั้นเท่าที่กฎหมายบัญชีและภาษีกำหนดให้เก็บเอกสาร",
          "ข้อมูลการเข้าชมเว็บไซต์ เก็บตามระยะเวลาที่ตั้งไว้ในบริการ Google Analytics",
        ],
      },
      {
        heading: "เราเปิดเผยให้ใครบ้าง",
        paragraphs: [
          "เราไม่ขายข้อมูลของคุณ และไม่ส่งให้ใครเพื่อการตลาดของคนอื่น ข้อมูลอยู่กับทีมของเรา และกับผู้ให้บริการเท่าที่จำเป็นต่อการทำให้ระบบทำงาน",
        ],
        bullets: [
          "ผู้ให้บริการเซิร์ฟเวอร์และฐานข้อมูลที่ระบบลูกค้าภายในของเราทำงานอยู่",
          "ผู้ให้บริการพื้นที่เก็บไฟล์ ซึ่งเก็บเอกสารที่เกี่ยวกับงานของคุณ",
          "บริการตรวจจับบอตของ Cloudflare (Turnstile) เมื่อคุณส่งแบบฟอร์ม",
          "Google Analytics สำหรับสถิติการเข้าชมเว็บไซต์",
        ],
        after: [
          "ผู้ให้บริการบางรายประมวลผลข้อมูลนอกประเทศไทย เราเลือกรายที่มีมาตรการคุ้มครองข้อมูลตามมาตรฐานสากล",
          "เราอาจเปิดเผยข้อมูลเมื่อกฎหมายกำหนด หรือเมื่อจำเป็นต่อการใช้สิทธิเรียกร้องตามกฎหมาย",
        ],
      },
      {
        heading: "สิทธิของคุณ",
        paragraphs: ["ตามพระราชบัญญัติคุ้มครองข้อมูลส่วนบุคคล คุณมีสิทธิเหล่านี้กับข้อมูลของคุณเอง"],
        bullets: [
          "ขอดูและขอสำเนาข้อมูลที่เรามี",
          "ขอให้แก้ไขข้อมูลที่ไม่ถูกต้องหรือไม่เป็นปัจจุบัน",
          "ขอให้ลบ หรือทำให้ข้อมูลไม่ระบุตัวตน",
          "ขอให้ระงับการใช้ข้อมูลไว้ก่อน",
          "คัดค้านการเก็บและการใช้ข้อมูล",
          "ขอให้ส่งข้อมูลของคุณในรูปแบบที่อ่านได้ด้วยเครื่อง",
          "ถอนความยินยอมเมื่อใดก็ได้",
        ],
        after: ["การถอนความยินยอมไม่กระทบสิ่งที่ทำไปแล้วก่อนหน้านั้น"],
      },
      {
        heading: "วิธีใช้สิทธิ",
        paragraphs: [
          "ส่งคำขอมาที่อีเมลหรือเบอร์โทรด้านบน หรือทักมาทาง LINE หรือ Messenger บอกว่าคุณต้องการใช้สิทธิข้อไหน เราจะตอบกลับภายใน 30 วัน",
          "เราอาจขอข้อมูลเพิ่มเพื่อยืนยันว่าเป็นคุณจริง ก่อนดำเนินการกับข้อมูลที่ร้องขอ",
          "ถ้าคุณไม่พอใจกับการดำเนินการของเรา คุณร้องเรียนต่อสำนักงานคณะกรรมการคุ้มครองข้อมูลส่วนบุคคลได้",
        ],
      },
      {
        heading: "คุกกี้",
        paragraphs: [
          "เว็บไซต์นี้ใช้คุกกี้ของ Google Analytics 4 เพื่อดูสถิติการเข้าชม เราไม่ใช้คุกกี้เพื่อโฆษณาแบบติดตามตัว",
          "ปิดหรือลบคุกกี้ได้จากการตั้งค่าเบราว์เซอร์ของคุณ หรือใช้ส่วนขยาย Google Analytics Opt-out เว็บไซต์ยังใช้งานได้ตามปกติ",
        ],
      },
      {
        heading: "เมื่อเราแก้ไขนโยบายนี้",
        paragraphs: [
          "ถ้ามีการเปลี่ยนแปลงที่สำคัญ เราจะแก้วันที่ด้านบนของหน้านี้และขึ้นเนื้อหาใหม่ให้อ่านได้ทันที",
        ],
      },
    ],
  },
  en: {
    label: "Privacy",
    title: "Privacy policy",
    lead: "We keep only the personal data we need to talk about your project. This page says what we keep, how long we keep it, and how to tell us to delete it.",
    updatedLabel: "In effect from",
    updated: "15 November 2026",
    metaTitle: "Privacy policy | Owl Day House",
    metaDescription:
      "What personal data Owl Day House collects, how long we keep it, who we share it with, and how to ask to see, correct or delete your data.",
    controller: {
      heading: "Who holds your data",
      intro:
        "The data controller under Thailand's Personal Data Protection Act B.E. 2562 (2019) is",
      officeLabel: "Registered office",
      contactLabel: "Data protection contact",
    },
    sections: [
      {
        heading: "What we collect",
        paragraphs: ["We keep what you give us, plus the basics that come with any visit to the site."],
        bullets: [
          "When you contact us by email, LINE, Messenger or phone, we keep your name, company, the contact details you give us, and what we discuss about the work.",
          "When you send a brief through a form on the site, we keep everything you fill in, along with the page you sent it from, where the link came from, and campaign parameters (utm) if there are any.",
          "To stop spam, we keep a value derived from your IP address that cannot be reversed, and your browser type. We do not store the IP address itself.",
          "When you visit the site, Google Analytics 4 records usage through cookies — pages opened, approximate country, device type.",
        ],
        after: [
          "We do not collect national ID numbers, health data, financial data or other sensitive data, and this site takes no payments.",
        ],
      },
      {
        heading: "What we use it for",
        bullets: [
          "Getting back to you with an approach and a quotation.",
          "Keeping the history of the conversation in our internal customer system, so the team looking after you works from the same picture.",
          "Seeing which pages on the site are useful, so we can improve them.",
          "Stopping spam and misuse of the form.",
        ],
        after: [
          "Our legal bases are your consent when you submit a form, and legitimate interest in business contact and in keeping our systems secure. Once we are working together, performance of a contract applies as well.",
        ],
      },
      {
        heading: "How long we keep it",
        bullets: [
          "A form submission we do not accept into the customer system is deleted within 180 days of the day it was sent.",
          "Data about customers and people we are in discussion with is kept for as long as we are in contact, and after that for as long as accounting and tax law requires the records to be held.",
          "Site usage data is kept for the retention period set in Google Analytics.",
        ],
      },
      {
        heading: "Who we share it with",
        paragraphs: [
          "We do not sell your data, and we do not pass it to anyone for their own marketing. It stays with our team and with the providers our systems need to run.",
        ],
        bullets: [
          "The server and database provider our internal customer system runs on.",
          "The file storage provider that holds documents relating to your work.",
          "Cloudflare's bot detection (Turnstile) when you submit a form.",
          "Google Analytics, for site statistics.",
        ],
        after: [
          "Some of these providers process data outside Thailand. We pick providers with data protection measures that meet international standards.",
          "We may disclose data where the law requires it, or where it is necessary to establish or defend a legal claim.",
        ],
      },
      {
        heading: "Your rights",
        paragraphs: ["Under the Personal Data Protection Act, you have these rights over your own data."],
        bullets: [
          "Ask to see and get a copy of the data we hold.",
          "Ask us to correct data that is wrong or out of date.",
          "Ask us to delete it, or make it anonymous.",
          "Ask us to suspend its use.",
          "Object to us collecting and using it.",
          "Ask us to send it to you in a machine-readable form.",
          "Withdraw your consent at any time.",
        ],
        after: ["Withdrawing consent does not undo what was done while it was in place."],
      },
      {
        heading: "How to exercise a right",
        paragraphs: [
          "Send your request to the email address or phone number above, or message us on LINE or Messenger, saying which right you want to use. We will answer within 30 days.",
          "We may ask for more information to confirm it is really you before we act on the data in question.",
          "If you are not satisfied with how we handle it, you can complain to Thailand's Personal Data Protection Committee.",
        ],
      },
      {
        heading: "Cookies",
        paragraphs: [
          "This site uses Google Analytics 4 cookies to measure visits. We do not use cookies for tracking advertising.",
          "You can block or delete cookies in your browser settings, or use the Google Analytics Opt-out add-on. The site keeps working either way.",
        ],
      },
      {
        heading: "When we change this policy",
        paragraphs: [
          "If something material changes, we update the date at the top of this page and publish the new wording here straight away.",
        ],
      },
    ],
  },
} as const satisfies Record<Locale, PolicyCopy>;

const displayPrivacy = { th: keepThaiWordsDeep(privacy.th), en: privacy.en };

export function getPrivacy(locale: Locale): PolicyCopy {
  return displayPrivacy[locale];
}
