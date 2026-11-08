import "./globals.css";
import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { fontVariables } from "@odh/brand/fonts";
import { colors } from "@odh/brand";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { Analytics } from "@/components/Analytics";
import { JsonLd } from "@/components/JsonLd";
import { baseOpenGraph, baseTwitter, SITE_NAME, SITE_URL } from "@/lib/seo";
import { businessSchema, websiteSchema } from "@/lib/structured-data";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "รับทำเว็บไซต์ เชียงใหม่ เริ่ม ฿3,900 เสร็จใน 5 วัน | Owl Day House",
    template: `%s | ${SITE_NAME}`,
  },
  description:
    "ซอฟต์แวร์เฮาส์เชียงใหม่ รับทำเว็บไซต์ เว็บแอป และระบบองค์กร เริ่มต้นด้วย Talon เว็บไซต์เสร็จไวใน 5 วัน ฿3,900 — ทีมงานคนไทยดูแลจริง",
  keywords: [
    "รับทำเว็บไซต์ เชียงใหม่",
    "รับทำเว็บไซต์ กรุงเทพ",
    "รับทำเว็บไซต์ กทม",
    "รับทำเว็บไซต์บริษัท",
    "รับทำเว็บไซต์ราคาถูก",
    "รับทำเว็บแอป",
    "รับทำระบบองค์กร",
    "Talon เว็บไซต์ 5 วัน",
  ],
  applicationName: SITE_NAME,
  authors: [{ name: SITE_NAME, url: SITE_URL }],
  publisher: SITE_NAME,
  // Canonical is set per page: one here would be inherited by 404/noindex routes.
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  openGraph: { ...baseOpenGraph, url: SITE_URL },
  twitter: baseTwitter,
};

export const viewport: Viewport = {
  themeColor: colors.navy,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="th" className={fontVariables}>
      <body className="flex min-h-screen flex-col bg-paper font-body text-ink antialiased">
        <JsonLd data={[businessSchema, websiteSchema]} />
        <Nav />
        <div className="flex-1">{children}</div>
        <Footer />
        <Analytics />
      </body>
    </html>
  );
}
