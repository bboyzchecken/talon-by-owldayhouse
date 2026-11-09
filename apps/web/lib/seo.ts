import type { Metadata } from "next";
import { localeHref, type Locale } from "./i18n";
import { plainText } from "./thai-wrap";

export const SITE_URL = "https://owldayhouse.com";
export const SITE_NAME = "Owl Day House";
/** Brand share card — the fallback for pages without one of their own. */
export const OG_IMAGE_PATH = "/og.png";

/** Date the static pages' content last changed — sitemap <lastmod>. Bump on real content edits. */
export const SITE_UPDATED = "2026-11-09";

/** Every share card is 1200×630 — see scripts/og/README.md. */
const OG_SIZE = { width: 1200, height: 630 } as const;
const defaultImage = { url: OG_IMAGE_PATH, ...OG_SIZE, alt: SITE_NAME };
const ogLocale: Record<Locale, string> = { th: "th_TH", en: "en_US" };

function shareImage(path: string | undefined, alt: string) {
  return path ? { url: path, ...OG_SIZE, alt } : defaultImage;
}

// Next.js replaces (does not merge) a parent's openGraph/twitter objects, so every
// page must carry these or it loses its share image and large card.
export function baseOpenGraph(locale: Locale, image?: string, alt = SITE_NAME) {
  return {
    type: "website" as const,
    siteName: SITE_NAME,
    locale: ogLocale[locale],
    images: [shareImage(image, alt)],
  };
}

export function baseTwitter(image?: string, alt = SITE_NAME) {
  return {
    card: "summary_large_image" as const,
    images: [shareImage(image, alt)],
  };
}

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
  /**
   * This page's own share card, e.g. "/og/services.png". Without one the page falls
   * back to the brand card, which makes every link look alike when it is shared.
   */
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
  title = plainText(title);
  description = plainText(description);
  const fullTitle = absoluteTitle ? title : `${title} | ${SITE_NAME}`;
  const localized = localeHref(locale, path);
  const url = localized === "/" ? SITE_URL : `${SITE_URL}${localized}`;
  return {
    title: absoluteTitle ? { absolute: title } : title,
    description,
    alternates: {
      canonical: localized,
      ...(singleLanguage ? {} : { languages: languageAlternates(path) }),
    },
    openGraph: { ...baseOpenGraph(locale, image, fullTitle), title: fullTitle, description, url },
    twitter: { ...baseTwitter(image, fullTitle), title: fullTitle, description },
  };
}
