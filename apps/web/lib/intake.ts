// Where the quote form posts, and whether it is ready to show at all.
//
// The site stays a static export: the form is plain HTML and one fetch() to
// another origin, api.owldayhouse.com, which is a separate program on the CRM's
// server (apps/api/cmd/intake). The values baked into the bundle are public by
// design: the intake's URL, and the Turnstile site key if Turnstile is used.
//
// Both values are VALIDATED here, not just read. NEXT_PUBLIC_* is inlined at
// build time, so a placeholder left in a deploy .env ships to every visitor
// and there is no runtime to catch it. That is not hypothetical: a build once
// went out with the literal text "<Site Key จาก Cloudflare Turnstile>" in
// NEXT_PUBLIC_TURNSTILE_SITE_KEY. It is a non-empty string, so the form
// switched itself to Turnstile, asked Cloudflare to render a widget for a key
// that does not exist, never got a token, and answered every submission with
// "give the bot check a moment" — while the intake was on ALTCHA all along.
// A value that is not shaped like the real thing is now treated as unset.

import { contact } from "@/content/site";

/** An absolute http(s) origin, or "" — "https://api.example.com", not "TODO". */
function readUrl(raw: string | undefined): string {
  const value = (raw ?? "").trim().replace(/\/+$/, "");
  if (!/^https?:\/\/[^\s/<>"']+(\/[^\s<>"']*)?$/.test(value)) return "";
  return value;
}

/**
 * Cloudflare issues Turnstile site keys as "0x" followed by base62 — for
 * example 0x4AAAAAAABkMYinukE8nzYS. Anything else is a placeholder or a typo,
 * and must not switch the bot check away from ALTCHA.
 */
function readTurnstileKey(raw: string | undefined): string {
  const value = (raw ?? "").trim();
  return /^0x[A-Za-z0-9_-]{16,}$/.test(value) ? value : "";
}

export const intakeUrl = readUrl(process.env.NEXT_PUBLIC_INTAKE_URL);
export const turnstileSiteKey = readTurnstileKey(process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY);

/**
 * The bot check. ALTCHA by default: a proof-of-work puzzle from our own
 * intake, no account and no third party. With a real Turnstile site key in the
 * build, Cloudflare Turnstile instead (the intake must then have the secret).
 */
export const botCheck: "altcha" | "turnstile" = turnstileSiteKey ? "turnstile" : "altcha";

/**
 * The form shows only when everything it depends on exists: somewhere to
 * post and the reply-time promise the page has to state. Until then /contact/
 * is exactly the page it was — chat, LINE, phone and e-mail.
 */
export function quoteFormReady(): boolean {
  return Boolean(intakeUrl && contact.replyWithinBusinessDays);
}
