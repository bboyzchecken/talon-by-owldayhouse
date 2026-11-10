// The hand-off message an admin copies and sends to a new account's owner.
//
// This system has no e-mail, so nothing is ever sent from here: the admin
// creates the account, copies this text, and pastes it into LINE or Messenger
// themselves. The wording carries no ครับ/ค่ะ so either admin can send it as is.
import { roleLabels } from "./labels";
import type { Role } from "./types";

/** Where the tools live when the page cannot tell us its own origin. */
export const FALLBACK_APP_ORIGIN = "https://crm.owldayhouse.com";

/** The sign-in page. trailingSlash: true, so the slash belongs there. */
export function loginUrl(origin?: string | null): string {
  const base = (origin && origin.trim() ? origin.trim() : FALLBACK_APP_ORIGIN).replace(/\/+$/, "");
  return `${base}/login/`;
}

export interface AccountMessageInput {
  name: string;
  username: string;
  password: string;
  role: Role;
  /** A brand-new account, or a password reset on an account that already exists. */
  kind: "new" | "reset";
  /** window.location.origin, when the browser has rendered. */
  origin?: string | null;
}

export function buildAccountMessage({
  name,
  username,
  password,
  role,
  kind,
  origin,
}: AccountMessageInput): string {
  const link = loginUrl(origin);
  const lines =
    kind === "new"
      ? [
          `สวัสดี คุณ${name}`,
          "",
          "Owl Day House เปิดบัญชีระบบภายใน (Lead Tracker) ให้เรียบร้อยแล้ว",
          "",
          `ลิงก์เข้าใช้งาน: ${link}`,
          `ชื่อผู้ใช้: ${username}`,
          `รหัสผ่าน: ${password}`,
          `สิทธิ์: ${roleLabels[role]}`,
          "",
          "เปิดลิงก์ในมือถือได้เลย ใช้งานได้ทั้งมือถือและคอม",
          "รหัสผ่านนี้แสดงครั้งเดียว เก็บไว้ในที่ปลอดภัย ถ้าลืมแจ้งแอดมินให้รีเซ็ตใหม่ได้",
          "บัญชีนี้ใช้คนเดียว ไม่ต้องส่งต่อให้คนอื่น",
        ]
      : [
          `สวัสดี คุณ${name}`,
          "",
          "รีเซ็ตรหัสผ่านบัญชีระบบภายใน (Lead Tracker) ให้ใหม่แล้ว",
          "",
          `ลิงก์เข้าใช้งาน: ${link}`,
          `ชื่อผู้ใช้: ${username}`,
          `รหัสผ่านใหม่: ${password}`,
          "",
          "รหัสผ่านเดิมใช้ไม่ได้แล้ว",
          "รหัสใหม่นี้แสดงครั้งเดียว เก็บไว้ในที่ปลอดภัย ถ้าลืมแจ้งแอดมินให้รีเซ็ตใหม่ได้",
        ];

  return lines.join("\n");
}
