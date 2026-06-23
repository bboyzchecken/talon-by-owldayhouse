// Thin GA4 wrapper. window.gtag is installed by components/Analytics.tsx only
// when NEXT_PUBLIC_GA_ID is set, so every call here is a safe no-op otherwise
// (dev/preview builds, or before the gtag script loads).

export type EventParams = Record<string, string | number | boolean | undefined>;

/** Fire a GA4 event. Silently does nothing when analytics is disabled. */
export function trackEvent(name: string, params: EventParams = {}): void {
  if (typeof window === "undefined" || typeof window.gtag !== "function") return;
  // Drop undefined values so GA doesn't record empty params.
  const clean: EventParams = {};
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== "") clean[k] = v;
  }
  window.gtag("event", name, clean);
}
