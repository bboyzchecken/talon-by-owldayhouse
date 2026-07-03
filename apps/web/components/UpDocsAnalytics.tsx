"use client";

import Script from "next/script";

// GA4 for the UP Docs tool — loaded on the REAL /up-docs page (not inside the
// tool's srcdoc iframe, where page_location is "about:srcdoc" and hits are
// unreliable). The iframe tool sends its events up via window.parent.gtag with
// send_to targeting this property, so usage lands here with a real URL context.
//
// This is a SEPARATE property from the marketing site GA (which is excluded from
// /up-docs in components/Analytics.tsx) — the two never mix.
const UP_DOCS_GA_ID = "G-3XWGSN9WKG"; // property "up docs" · account owldayhouse

export function UpDocsAnalytics() {
  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${UP_DOCS_GA_ID}`}
        strategy="afterInteractive"
      />
      <Script id="updocs-ga-init" strategy="afterInteractive">
        {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}window.gtag=gtag;gtag('js',new Date());gtag('config','${UP_DOCS_GA_ID}');`}
      </Script>
    </>
  );
}
