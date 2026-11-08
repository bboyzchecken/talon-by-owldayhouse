import type { Metadata } from "next";
import { OwlDocsApp } from "@/components/OwlDocsApp";

// Hidden internal tool — keep it out of search + link previews. It is also
// absent from sitemap.ts; robots.ts must not block it or noindex goes unread.
export const metadata: Metadata = {
  title: "เครื่องมือภายใน",
  robots: { index: false, follow: false, nocache: true },
  alternates: { canonical: undefined },
};

export default function OwlDocsPage() {
  return <OwlDocsApp />;
}
