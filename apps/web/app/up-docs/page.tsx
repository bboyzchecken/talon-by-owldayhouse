import type { Metadata } from "next";
import { UpDocsApp } from "@/components/UpDocsApp";
import { UpDocsAnalytics } from "@/components/UpDocsAnalytics";

// Hidden client demo (UP Docs — ม.พะเยา) — keep it out of search + link
// previews. It is also absent from sitemap.ts and disallowed in robots.ts.
export const metadata: Metadata = {
  title: "UP Docs",
  robots: { index: false, follow: false, nocache: true },
  alternates: { canonical: undefined },
};

export default function UpDocsPage() {
  return (
    <>
      <UpDocsAnalytics />
      <UpDocsApp />
    </>
  );
}
