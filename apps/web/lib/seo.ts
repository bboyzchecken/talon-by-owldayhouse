import type { Metadata } from "next";

export const SITE_URL = "https://owldayhouse.com";
export const SITE_NAME = "Owl Day House";
export const OG_IMAGE_PATH = "/og.png";

/** Date the static pages' content last changed — sitemap <lastmod>. Bump on real content edits. */
export const SITE_UPDATED = "2026-11-09";

const ogImage = { url: OG_IMAGE_PATH, width: 1200, height: 630, alt: SITE_NAME };

// Next.js replaces (does not merge) a parent's openGraph/twitter objects, so every
// page must carry these or it loses its share image and large card.
export const baseOpenGraph = {
  type: "website" as const,
  siteName: SITE_NAME,
  locale: "th_TH",
  images: [ogImage],
};

export const baseTwitter = {
  card: "summary_large_image" as const,
  images: [OG_IMAGE_PATH],
};

interface PageMetaInput {
  title: string;
  description: string;
  /** Route path with trailing slash, e.g. "/talon/". Use "/" for home. */
  path: string;
  /** Skip the "| Owl Day House" suffix — for titles already long enough to truncate. */
  absoluteTitle?: boolean;
}

/** Per-page metadata: canonical + complete OpenGraph/Twitter tags. */
export function pageMeta({ title, description, path, absoluteTitle }: PageMetaInput): Metadata {
  const fullTitle = absoluteTitle ? title : `${title} | ${SITE_NAME}`;
  const url = path === "/" ? SITE_URL : `${SITE_URL}${path}`;
  return {
    title: absoluteTitle ? { absolute: title } : title,
    description,
    alternates: { canonical: path },
    openGraph: { ...baseOpenGraph, title: fullTitle, description, url },
    twitter: { ...baseTwitter, title: fullTitle, description },
  };
}
