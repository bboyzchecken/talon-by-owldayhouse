// The quote-request form on /contact/, in both languages.
//
// The option values (interests, industries, timelines, budget bands) are the
// Go API's own enums — apps/api/pkg/models/lead.go and inbound.go — so an
// accepted request becomes a lead without translating anything. Add or rename
// one there first; the intake silently drops a value it does not know.
//
// The budget is the customer's own range for their work. It is not a price of
// ours: the site shows no prices.

import { keepThaiWordsDeep } from "@/lib/thai-wrap";
import type { Locale } from "@/lib/i18n";

export const interestValues = ["system", "event", "lead_kit", "kol", "digital_marketing", "social_listening"] as const;
export const industryValues = ["education", "property_auto", "healthcare", "other"] as const;
export const timelineValues = ["asap", "1_3_months", "3_6_months", "planning"] as const;
export const budgetValues = ["under_100k", "100k_300k", "300k_1m", "over_1m", "unsure"] as const;

export type InterestValue = (typeof interestValues)[number];
export type IndustryValue = (typeof industryValues)[number];
export type TimelineValue = (typeof timelineValues)[number];
export type BudgetValue = (typeof budgetValues)[number];

export interface QuoteFormCopy {
  label: string;
  title: string;
  lead: string;
  /** {days} is replaced with the reply time from content/site.ts, {s} with "s" unless it is 1. */
  promise: string;
  stepOf: string;
  steps: readonly [string, string, string];
  interestsLegend: string;
  interestsHint: string;
  interests: Record<InterestValue, string>;
  briefLabel: string;
  briefHint: string;
  timelineLabel: string;
  timelines: Record<TimelineValue, string>;
  budgetLabel: string;
  budgetHint: string;
  budgets: Record<BudgetValue, string>;
  nameLabel: string;
  companyLabel: string;
  industryLabel: string;
  industries: Record<IndustryValue, string>;
  choose: string;
  reachLegend: string;
  reachHint: string;
  phoneLabel: string;
  lineLabel: string;
  emailLabel: string;
  optional: string;
  consentBefore: string;
  consentLink: string;
  consentAfter: string;
  next: string;
  back: string;
  submit: string;
  sending: string;
  errors: {
    name: string;
    reach: string;
    email: string;
    consent: string;
    robot: string;
    tooMany: string;
    failed: string;
  };
  doneTitle: string;
  /** {days} as above. */
  doneBody: string;
  doneAgain: string;
}

const quoteForm = {
  th: {
    label: "Quote request",
    title: "ส่งรายละเอียดงานให้เรา",
    lead: "ไม่สะดวกแชต กรอกตรงนี้ได้เลย 3 ขั้นสั้น ๆ ช่องที่ต้องกรอกมีแค่ชื่อกับช่องทางติดต่อ 1 ช่อง",
    promise: "เราไม่ส่งอีเมลยืนยัน ทีมงานจะติดต่อกลับภายใน {days} วันทำการ ทางช่องทางที่คุณให้ไว้",
    stepOf: "ขั้นที่",
    steps: ["สนใจเรื่องไหน", "เล่างานให้ฟัง", "ติดต่อคุณทางไหน"],
    interestsLegend: "สนใจบริการไหน",
    interestsHint: "เลือกได้หลายข้อ หรือข้ามไปก่อนก็ได้",
    interests: {
      system: "เว็บไซต์และซอฟต์แวร์",
      event: "อีเวนต์และเกมหน้างาน",
      lead_kit: "ชุดงานบูธเก็บรายชื่อลูกค้า",
      kol: "KOL และคลิปรีวิว",
      digital_marketing: "Digital Marketing",
      social_listening: "Social Listening",
    },
    briefLabel: "เล่างานคร่าว ๆ",
    briefHint: "เป้าหมาย งานจัดที่ไหน กลุ่มลูกค้าเป็นใคร หรือมีตัวอย่างที่ชอบ เขียนเท่าที่สะดวก",
    timelineLabel: "อยากได้งานเมื่อไร",
    timelines: {
      asap: "เร็วที่สุด",
      "1_3_months": "ภายใน 1–3 เดือน",
      "3_6_months": "ภายใน 3–6 เดือน",
      planning: "ยังวางแผนอยู่",
    },
    budgetLabel: "งบที่ตั้งไว้",
    budgetHint: "ช่วยให้เราเสนอแนวทางที่พอดีกับงบ ไม่แน่ใจก็เลือกได้",
    budgets: {
      under_100k: "ต่ำกว่า 100,000 บาท",
      "100k_300k": "100,000–300,000 บาท",
      "300k_1m": "300,000–1,000,000 บาท",
      over_1m: "มากกว่า 1,000,000 บาท",
      unsure: "ยังไม่แน่ใจ",
    },
    nameLabel: "ชื่อของคุณ",
    companyLabel: "บริษัทหรือองค์กร",
    industryLabel: "กลุ่มธุรกิจ",
    industries: {
      education: "การศึกษา",
      property_auto: "อสังหาริมทรัพย์และยานยนต์",
      healthcare: "สุขภาพและความงาม",
      other: "อื่น ๆ",
    },
    choose: "เลือก",
    reachLegend: "ให้เราติดต่อกลับทางไหน",
    reachHint: "อย่างน้อย 1 ช่อง",
    phoneLabel: "เบอร์โทร",
    lineLabel: "LINE ID",
    emailLabel: "อีเมล",
    optional: "ไม่บังคับ",
    consentBefore: "ฉันยินยอมให้ Owl Day House เก็บและใช้ข้อมูลนี้เพื่อติดต่อกลับเรื่องงาน ตาม",
    consentLink: "นโยบายความเป็นส่วนตัว",
    consentAfter: "",
    next: "ถัดไป",
    back: "ย้อนกลับ",
    submit: "ส่งรายละเอียด",
    sending: "กำลังส่ง…",
    errors: {
      name: "กรุณากรอกชื่อ",
      reach: "กรุณาให้ช่องทางติดต่อกลับอย่างน้อย 1 ช่อง",
      email: "อีเมลไม่ถูกต้อง",
      consent: "กรุณาติ๊กยอมรับนโยบายความเป็นส่วนตัวก่อนส่ง",
      robot: "รอให้ระบบยืนยันว่าไม่ใช่บอตสักครู่ แล้วกดส่งอีกครั้ง",
      tooMany: "ส่งบ่อยเกินไป กรุณารอสักครู่ แล้วลองใหม่",
      failed: "ส่งไม่สำเร็จ ลองใหม่อีกครั้ง หรือทักเราทาง LINE หรือ Messenger ด้านบน",
    },
    doneTitle: "ได้รับรายละเอียดแล้ว ขอบคุณที่ติดต่อเรา",
    doneBody: "ทีมงานจะติดต่อกลับภายใน {days} วันทำการ ทางช่องทางที่คุณให้ไว้ ถ้ารีบ ทักเราทาง LINE หรือโทรได้เลย",
    doneAgain: "ส่งอีกเรื่อง",
  },
  en: {
    label: "Quote request",
    title: "Send us your brief",
    lead: "Rather not chat? Fill this in: three short steps. Only your name and one way to reach you are required.",
    promise: "We don't send a confirmation email. Our team will get back to you within {days} business day{s}, on the channel you give us.",
    stepOf: "Step",
    steps: ["What you need", "About the work", "How to reach you"],
    interestsLegend: "Which services are you interested in?",
    interestsHint: "Pick any, or skip for now",
    interests: {
      system: "Websites & software",
      event: "Events & on-site games",
      lead_kit: "Lead Event Kit for booths",
      kol: "KOL & review clips",
      digital_marketing: "Digital marketing",
      social_listening: "Social listening",
    },
    briefLabel: "Tell us about the work",
    briefHint: "Goals, venue, audience, references you like — as much as is handy.",
    timelineLabel: "When do you need it?",
    timelines: {
      asap: "As soon as possible",
      "1_3_months": "Within 1–3 months",
      "3_6_months": "Within 3–6 months",
      planning: "Still planning",
    },
    budgetLabel: "Your budget",
    budgetHint: "Helps us propose an approach that fits. Not sure is fine.",
    budgets: {
      under_100k: "Under THB 100,000",
      "100k_300k": "THB 100,000–300,000",
      "300k_1m": "THB 300,000–1,000,000",
      over_1m: "Over THB 1,000,000",
      unsure: "Not sure yet",
    },
    nameLabel: "Your name",
    companyLabel: "Company or organisation",
    industryLabel: "Industry",
    industries: {
      education: "Education",
      property_auto: "Property & automotive",
      healthcare: "Health & beauty",
      other: "Other",
    },
    choose: "Choose",
    reachLegend: "How should we reach you?",
    reachHint: "At least one",
    phoneLabel: "Phone",
    lineLabel: "LINE ID",
    emailLabel: "Email",
    optional: "optional",
    consentBefore: "I agree that Owl Day House may keep and use these details to contact me about this work, under the ",
    consentLink: "privacy policy",
    consentAfter: ".",
    next: "Next",
    back: "Back",
    submit: "Send brief",
    sending: "Sending…",
    errors: {
      name: "Please enter your name.",
      reach: "Please give us at least one way to reach you.",
      email: "That email address doesn't look right.",
      consent: "Please tick the privacy consent box before sending.",
      robot: "Give the bot check a moment to finish, then send again.",
      tooMany: "Too many attempts. Please wait a moment and try again.",
      failed: "That didn't go through. Please try again, or message us on LINE or Messenger above.",
    },
    doneTitle: "Got it — thank you",
    doneBody: "Our team will get back to you within {days} business day{s}, on the channel you gave us. In a hurry? Message us on LINE or call.",
    doneAgain: "Send another",
  },
} as const satisfies Record<Locale, QuoteFormCopy>;

export function getQuoteFormCopy(locale: Locale): QuoteFormCopy {
  return locale === "th" ? keepThaiWordsDeep<QuoteFormCopy>(quoteForm.th) : quoteForm.en;
}
