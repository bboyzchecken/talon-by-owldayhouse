// Where the quote form posts, and whether it is ready to show at all.
//
// The site stays a static export: the form is plain HTML and one fetch() to
// another origin, api.owldayhouse.com, which is a separate program on the CRM's
// server (apps/api/cmd/intake). Only two public values are baked into the
// bundle, both meant to be public: the intake's URL and the Turnstile site key.
// The Turnstile secret lives on the server and never here.

import { contact } from "@/content/site";

export const intakeUrl = (process.env.NEXT_PUBLIC_INTAKE_URL ?? "").replace(/\/+$/, "");
export const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "";

/**
 * The form shows only when everything it depends on exists: somewhere to
 * post, a bot check, and the reply-time promise the page has to state. Until
 * then /contact/ is exactly the page it was — chat, LINE, phone and e-mail.
 */
export function quoteFormReady(): boolean {
  return Boolean(intakeUrl && turnstileSiteKey && contact.replyWithinBusinessDays);
}
