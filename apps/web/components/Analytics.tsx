"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

// Google Analytics 4. Renders only when NEXT_PUBLIC_GA_ID is set, so dev/preview
// builds stay clean. NEXT_PUBLIC_* is inlined at build time → set it before
// `pnpm build:web` to enable GA on the exported site.
const GA_ID = process.env.NEXT_PUBLIC_GA_ID;

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
    window.gtag("event", "page_view", { page_path: pathname });
  }, [pathname]);

  if (!GA_ID) return null;

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
