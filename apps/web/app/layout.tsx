import "./globals.css";
import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { fontVariables } from "@odh/brand/fonts";
import { colors } from "@odh/brand";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { Analytics } from "@/components/Analytics";
import { JsonLd } from "@/components/JsonLd";
import { SITE_NAME, SITE_URL } from "@/lib/seo";
import { localBusinessSchema, organizationSchema, websiteSchema } from "@/lib/structured-data";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Owl Day House — รับทำเว็บไซต์ เชียงใหม่",
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
  alternates: { canonical: "/" },
  robots: { index: true, follow: true },
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    locale: "th_TH",
    url: SITE_URL,
    images: [{ url: "/og.png", width: 1200, height: 630, alt: SITE_NAME }],
  },
  twitter: { card: "summary_large_image", images: ["/og.png"] },
};

export const viewport: Viewport = {
  themeColor: colors.navy,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="th" className={fontVariables}>
      <body className="flex min-h-screen flex-col bg-paper font-body text-ink antialiased">
        <JsonLd data={[organizationSchema, localBusinessSchema, websiteSchema]} />
        <Nav />
        <div className="flex-1">{children}</div>
        <Footer />
        <Analytics />
      </body>
    </html>
  );
}
