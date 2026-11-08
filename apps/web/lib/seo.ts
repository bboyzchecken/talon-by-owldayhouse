import type { Metadata } from "next";
import { localeHref, type Locale } from "./i18n";

export const SITE_URL = "https://owldayhouse.com";
export const SITE_NAME = "Owl Day House";
export const OG_IMAGE_PATH = "/og.png";

/** Date the static pages' content last changed — sitemap <lastmod>. Bump on real content edits. */
export const SITE_UPDATED = "2026-11-09";

const ogImage = { url: OG_IMAGE_PATH, width: 1200, height: 630, alt: SITE_NAME };
const ogLocale: Record<Locale, string> = { th: "th_TH", en: "en_US" };

// Next.js replaces (does not merge) a parent's openGraph/twitter objects, so every
// page must carry these or it loses its share image and large card.
export function baseOpenGraph(locale: Locale) {
  return {
    type: "website" as const,
    siteName: SITE_NAME,
    locale: ogLocale[locale],
    images: [ogImage],
  };
}

export const baseTwitter = {
  card: "summary_large_image" as const,
  images: [OG_IMAGE_PATH],
};

/** hreflang map for a page that exists in both languages. */
export function languageAlternates(path: string) {
  return {
    th: path,
    en: localeHref("en", path),
    "x-default": path,
  };
}

interface PageMetaInput {
  locale: Locale;
  title: string;
  description: string;
  /** Route path without the locale prefix, with trailing slash. Use "/" for home. */
  path: string;
  /** Skip the "| Owl Day House" suffix — for titles already long enough to truncate. */
  absoluteTitle?: boolean;
  /** The page has no twin in the other language. */
  singleLanguage?: boolean;
  /** Share image path, 1200x630. Defaults to the site image. */
  image?: string;
}

/** Per-page metadata: canonical, hreflang and complete OpenGraph/Twitter tags. */
export function pageMeta({
  locale,
  title,
  description,
  path,
  absoluteTitle,
  singleLanguage,
  image,
}: PageMetaInput): Metadata {
  const fullTitle = absoluteTitle ? title : `${title} | ${SITE_NAME}`;
  const localized = localeHref(locale, path);
  const url = localized === "/" ? SITE_URL : `${SITE_URL}${localized}`;
  const shareImage = image ? { images: [{ url: image, width: 1200, height: 630, alt: title }] } : {};
  const isNews = path.startsWith("/news/");
  return {
    title: absoluteTitle ? { absolute: title } : title,
    description,
    alternates: {
      canonical: localized,
      ...(singleLanguage ? {} : { languages: languageAlternates(path) }),
      ...(isNews ? { types: { "application/rss+xml": localeHref(locale, "/feed.xml") } } : {}),
    },
    openGraph: { ...baseOpenGraph(locale), title: fullTitle, description, url, ...shareImage },
    twitter: { ...baseTwitter, title: fullTitle, description, ...(image ? { images: [image] } : {}) },
  };
}
