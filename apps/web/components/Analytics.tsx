"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

// Google Analytics 4 (marketing site). The measurement ID is public,
// so production builds default to it — .env* is gitignored, and relying on it
// silently shipped the site with no tag. `pnpm dev` stays clean. Set
// NEXT_PUBLIC_GA_ID at build time to override, or to empty to disable.
const GA_ID =
  process.env.NEXT_PUBLIC_GA_ID ??
  (process.env.NODE_ENV === "production" ? "G-ZXV0J46ECG" : undefined);

// /up-docs is a separate client tool with its OWN GA4 property (inside its
// iframe). Keep faculty usage out of the marketing property entirely so the two
// analytics never mix — the marketing GA does not load or fire on these paths.
const isExcluded = (path: string) => path.startsWith("/up-docs");

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

export function Analytics() {
  const pathname = usePathname();
  const isFirstLoad = useRef(true);

  // Initial page_view comes from gtag('config'); send one on each SPA route change.
  useEffect(() => {
    if (!GA_ID || typeof window.gtag !== "function") return;
    if (isFirstLoad.current) {
      isFirstLoad.current = false;
      return;
    }
    if (isExcluded(pathname)) return; // never report /up-docs to the marketing property
    window.gtag("event", "page_view", { page_path: pathname });
  }, [pathname]);

  if (!GA_ID || isExcluded(pathname)) return null;

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
        strategy="afterInteractive"
      />
      <Script id="ga4-init" strategy="afterInteractive">
        {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}window.gtag=gtag;gtag('js',new Date());gtag('config','${GA_ID}');`}
      </Script>
    </>
  );
}
