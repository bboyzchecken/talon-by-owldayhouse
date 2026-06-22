import Script from "next/script";

// Plausible — single lightweight, cookieless script. Renders only when
// NEXT_PUBLIC_ANALYTICS_DOMAIN is set (so dev/preview builds stay clean).
export function Analytics() {
  const domain = process.env.NEXT_PUBLIC_ANALYTICS_DOMAIN;
  if (!domain) return null;
  return (
    <Script
      defer
      data-domain={domain}
      src="https://plausible.io/js/script.js"
      strategy="afterInteractive"
    />
  );
}
