import type { Metadata, Viewport } from "next";
import { colors } from "@odh/brand";
import { getCopy } from "@/content/copy";
import type { Locale } from "./i18n";
import { baseOpenGraph, baseTwitter, languageAlternates, SITE_NAME, SITE_URL } from "./seo";

const keywords: Record<Locale, string[]> = {
  th: [
    "รับทำเว็บไซต์ กรุงเทพ",
    "รับทำเว็บแอป",
    "รับทำระบบองค์กร",
    "เกม Kiosk งานอีเวนต์",
    "จ้าง KOL Influencer",
    "ถ่ายทำงานอีเวนต์",
    "Digital Marketing กรุงเทพ",
    "Social Listening",
  ],
  en: [
    "software development Thailand",
    "event kiosk games",
    "KOL marketing Thailand",
    "event video production Bangkok",
    "digital marketing Thailand",
    "social listening Thailand",
  ],
};

export function rootMetadata(locale: Locale): Metadata {
  const t = getCopy(locale).home;
  return {
    metadataBase: new URL(SITE_URL),
    title: { default: t.metaTitle, template: `%s | ${SITE_NAME}` },
    description: t.metaDescription,
    keywords: keywords[locale],
    applicationName: SITE_NAME,
    authors: [{ name: SITE_NAME, url: SITE_URL }],
    publisher: SITE_NAME,
    // Canonical is set per page: one here would be inherited by noindex routes.
    alternates: { languages: languageAlternates("/") },
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
    openGraph: { ...baseOpenGraph(locale), url: SITE_URL },
    twitter: baseTwitter,
  };
}

export const rootViewport: Viewport = {
  themeColor: colors.white,
};
