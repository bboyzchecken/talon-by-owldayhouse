// Formatting helpers. Everything is Thai locale, Asia/Bangkok, Buddhist-free
// Gregorian years (that is what the team uses day to day).

const BANGKOK = "Asia/Bangkok";

const dateFormatter = new Intl.DateTimeFormat("th-TH", {
  timeZone: BANGKOK,
  day: "numeric",
  month: "short",
  year: "numeric",
  numberingSystem: "latn",
  calendar: "gregory",
});

const dateTimeFormatter = new Intl.DateTimeFormat("th-TH", {
  timeZone: BANGKOK,
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  numberingSystem: "latn",
  calendar: "gregory",
});

const bahtFormatter = new Intl.NumberFormat("th-TH", {
  style: "currency",
  currency: "THB",
  maximumFractionDigits: 0,
});

const numberFormatter = new Intl.NumberFormat("th-TH");

export function formatDate(value?: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : dateFormatter.format(date);
}

export function formatDateTime(value?: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : dateTimeFormatter.format(date);
}

const bangkokClock = new Intl.DateTimeFormat("en-GB", {
  timeZone: BANGKOK,
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

/**
 * An activity's moment: date and time, or the date alone when the time is
 * exactly midnight — entries logged before the form had a time field.
 */
export function formatWhen(value?: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return bangkokClock.format(date) === "00:00" ? dateFormatter.format(date) : dateTimeFormatter.format(date);
}

/** "YYYY-MM-DDTHH:MM" in Asia/Bangkok, for <input type="datetime-local">. */
export function toISODateTime(date: Date = new Date()): string {
  return `${toISODate(date)}T${bangkokClock.format(date)}`;
}

export function formatBaht(value: number): string {
  return bahtFormatter.format(value ?? 0);
}

export function formatNumber(value: number): string {
  return numberFormatter.format(value ?? 0);
}

export function formatPercent(value: number): string {
  return `${numberFormatter.format(Math.round(value ?? 0))}%`;
}

export function formatBytes(bytes: number): string {
  if (!bytes) return "0 KB";
  const mb = bytes / (1024 * 1024);
  if (mb >= 1) return `${mb.toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

/** "YYYY-MM-DD" in Asia/Bangkok, for <input type="date"> and API dates. */
export function toISODate(date: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: BANGKOK,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

/** How overdue a follow-up is, in whole days (negative = still ahead). */
export function daysOverdue(nextActionDate?: string | null): number {
  if (!nextActionDate) return 0;
  const target = new Date(`${nextActionDate.slice(0, 10)}T00:00:00+07:00`).getTime();
  const today = new Date(`${toISODate()}T00:00:00+07:00`).getTime();
  return Math.round((today - target) / 86_400_000);
}

/** A phone number as a tel: link target (digits and a leading + only). */
export function telHref(phone: string): string {
  return `tel:${phone.replace(/[^\d+]/g, "")}`;
}

/** A LINE id as a link that opens the LINE app. */
export function lineHref(lineId: string): string {
  const id = lineId.trim().replace(/^@/, "");
  return `https://line.me/R/ti/p/~${encodeURIComponent(id)}`;
}
