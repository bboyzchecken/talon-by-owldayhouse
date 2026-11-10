// Thai labels for every API enum. The UI never shows a raw enum value.
import type {
  ActivityType,
  Industry,
  OwnerType,
  Interest,
  Role,
  Source,
  Stage,
} from "./types";

export const industryLabels: Record<Industry, string> = {
  education: "การศึกษา",
  property_auto: "อสังหา/ยานยนต์",
  healthcare: "สุขภาพ/ความงาม",
  other: "อื่น ๆ",
};

export const sourceLabels: Record<Source, string> = {
  trade_fair: "งานแสดงสินค้า",
  egp: "e-GP (จัดซื้อจัดจ้าง)",
  ad_library: "Ad Library",
  social_listening: "Social Listening",
  agency: "เอเจนซี",
  referral: "คนแนะนำ",
  website: "เว็บไซต์",
  linkedin: "LinkedIn",
  sales_existing: "ลูกค้าเดิมของเซลส์",
};

export const stageLabels: Record<Stage, string> = {
  new: "ใหม่",
  contacted: "ติดต่อแล้ว",
  meeting: "นัดคุย",
  proposal: "ยื่นข้อเสนอ",
  won: "ปิดการขาย",
  lost: "ไม่ได้งาน",
  nurture: "เก็บไว้ติดตาม",
  // We chose not to take it (too big, locked to an incumbent, not our work).
  declined: "ไม่รับงาน",
};

export const ownerTypeLabels: Record<OwnerType, string> = {
  company: "บริษัทหามา",
  sales_existing: "ลูกค้าเดิมของเซลส์",
};

export const activityTypeLabels: Record<ActivityType, string> = {
  call: "โทร",
  line: "LINE",
  meeting: "นัดคุย",
  proposal_sent: "ส่งใบเสนอราคา",
  note: "บันทึก",
};

export const interestLabels: Record<Interest, string> = {
  lead_kit: "Lead Kit",
  kol: "KOL / รีวิว",
  event: "อีเวนต์",
  system: "ทำระบบ/เว็บ",
  digital_marketing: "การตลาดดิจิทัล",
  social_listening: "Social Listening",
};

export const roleLabels: Record<Role, string> = {
  admin: "แอดมิน",
  sales: "เซลส์",
};

/** Look a label up without crashing on a value the API added after this build. */
export function labelOf<T extends string>(map: Record<string, string>, value: T | undefined): string {
  if (!value) return "—";
  return map[value] ?? value;
}
