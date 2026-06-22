import type { Metadata } from "next";

export const SITE_URL = "https://owldayhouse.com";
export const SITE_NAME = "Owl Day House";

interface PageMetaInput {
  title: string;
  description: string;
  /** Route path with trailing slash, e.g. "/talon/". Use "/" for home. */
  path: string;
}

/** Per-page metadata: canonical + OpenGraph/Twitter. OG image comes from app/opengraph-image. */
export function pageMeta({ title, description, path }: PageMetaInput): Metadata {
  const fullTitle = `${title} | ${SITE_NAME}`;
  const url = path === "/" ? SITE_URL : `${SITE_URL}${path}`;
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: { title: fullTitle, description, url },
    twitter: { title: fullTitle, description },
  };
}
