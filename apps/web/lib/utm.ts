// UTM capture for campaign landing pages. FB/Google ads append ?utm_source=…
// to the landing URL; we read those params client-side, forward them to GA4
// events, and encode the source into the Messenger deep-link `ref` so the chat
// team can see which campaign a lead came from (Messenger surfaces `ref` in the
// webhook / "referral" of the conversation).

export interface Utm {
  source?: string;
  medium?: string;
  campaign?: string;
  content?: string;
  term?: string;
}

const UTM_KEYS: Array<[param: string, key: keyof Utm]> = [
  ["utm_source", "source"],
  ["utm_medium", "medium"],
  ["utm_campaign", "campaign"],
  ["utm_content", "content"],
  ["utm_term", "term"],
];

/** Read utm_* params from the current URL. Returns {} on the server or when none. */
export function readUtm(): Utm {
  if (typeof window === "undefined") return {};
  const sp = new URLSearchParams(window.location.search);
  const utm: Utm = {};
  for (const [param, key] of UTM_KEYS) {
    const v = sp.get(param);
    if (v) utm[key] = v;
  }
  return utm;
}

/** Flatten Utm into utm_* params for GA event payloads. */
export function utmEventParams(utm: Utm): Record<string, string> {
  const out: Record<string, string> = {};
  if (utm.source) out.utm_source = utm.source;
  if (utm.medium) out.utm_medium = utm.medium;
  if (utm.campaign) out.utm_campaign = utm.campaign;
  if (utm.content) out.utm_content = utm.content;
  if (utm.term) out.utm_term = utm.term;
  return out;
}

// Messenger ref allows a-z A-Z 0-9 + =-_. (max 255). Keep it readable: src=…,cmp=…
const REF_SAFE = /[^a-zA-Z0-9_=.-]/g;
function refToken(label: string, value: string): string {
  return `${label}=${value.replace(REF_SAFE, "-")}`;
}

/**
 * Build a Messenger link, appending a `ref` that encodes campaign + on-page CTA
 * location. `base` is the plain m.me URL from content/site.ts.
 */
export function messengerHref(base: string, utm: Utm, location: string): string {
  const parts = [refToken("loc", location)];
  if (utm.source) parts.push(refToken("src", utm.source));
  if (utm.campaign) parts.push(refToken("cmp", utm.campaign));
  const ref = parts.join("_").slice(0, 255);
  const sep = base.includes("?") ? "&" : "?";
  return `${base}${sep}ref=${encodeURIComponent(ref)}`;
}
