// Where a visitor came from, kept for the quote form.
//
// No cookie and nothing that outlives the tab: the first page of the visit
// writes the utm parameters, the external referrer and its own path into
// sessionStorage, and the form reads them back when it is sent. Someone who
// lands on /services/ from a Facebook ad and then opens /contact/ still
// arrives in the CRM as utm_source=facebook. Without the form, the values are
// never sent anywhere.

const KEY = "odh_attribution";

export interface Attribution {
  utm_source: string;
  utm_campaign: string;
  referrer: string;
  landing_path: string;
}

const empty: Attribution = { utm_source: "", utm_campaign: "", referrer: "", landing_path: "" };

function read(): Attribution | null {
  try {
    const raw = window.sessionStorage.getItem(KEY);
    return raw ? { ...empty, ...(JSON.parse(raw) as Partial<Attribution>) } : null;
  } catch {
    return null;
  }
}

/** Called once per page view. The first page of the visit wins, except that new utm values replace old ones. */
export function captureAttribution(): void {
  if (typeof window === "undefined") return;
  const params = new URLSearchParams(window.location.search);
  const utmSource = params.get("utm_source") ?? "";
  const utmCampaign = params.get("utm_campaign") ?? "";
  const existing = read();
  if (existing && !utmSource) return;

  let referrer = "";
  try {
    const ref = document.referrer ? new URL(document.referrer) : null;
    if (ref && ref.origin !== window.location.origin) referrer = ref.origin + ref.pathname;
  } catch {
    referrer = "";
  }

  const next: Attribution = {
    utm_source: utmSource || existing?.utm_source || "",
    utm_campaign: utmSource ? utmCampaign : existing?.utm_campaign || "",
    referrer: existing?.referrer || referrer,
    landing_path: existing?.landing_path || window.location.pathname,
  };
  try {
    window.sessionStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Private mode or storage blocked: the form falls back to this page.
  }
}

/** What the form sends. Falls back to the current page when nothing was stored. */
export function readAttribution(): Attribution {
  if (typeof window === "undefined") return empty;
  const stored = read();
  if (stored) return stored;
  const params = new URLSearchParams(window.location.search);
  return {
    utm_source: params.get("utm_source") ?? "",
    utm_campaign: params.get("utm_campaign") ?? "",
    referrer: "",
    landing_path: window.location.pathname,
  };
}
