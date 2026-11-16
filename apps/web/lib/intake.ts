// Where the quote form posts, and whether it is ready to show at all.
//
// The site stays a static export: the form is plain HTML and one fetch() to
// another origin, api.owldayhouse.com, which is a separate program on the CRM's
// server (apps/api/cmd/intake). The values baked into the bundle are public by
// design: the intake's URL, and the Turnstile site key if Turnstile is used.

import { contact } from "@/content/site";

export const intakeUrl = (process.env.NEXT_PUBLIC_INTAKE_URL ?? "").replace(/\/+$/, "");
export const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "";

/**
 * The bot check. ALTCHA by default: a proof-of-work puzzle from our own
 * intake, no account and no third party. With a Turnstile site key in the
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
