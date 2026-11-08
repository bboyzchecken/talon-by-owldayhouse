import type { MetadataRoute } from "next";
import { SITE_UPDATED, SITE_URL } from "@/lib/seo";
import { posts } from "@/content/news";

export const dynamic = "force-static";

// trailingSlash:true — keep URLs consistent with the exported pages.
const routes = [
  "",
  "/about",
  "/services",
  "/talon",
  "/packages",
  "/work",
  "/showcase/reveal",
  "/contact",
  "/news",
];

// lastModified is a real content date, never the build time: Google ignores
// <lastmod> on sites where it changes every build.
export default function sitemap(): MetadataRoute.Sitemap {
  const pages: MetadataRoute.Sitemap = routes.map((route) => ({
    url: `${SITE_URL}${route}/`,
    lastModified: SITE_UPDATED,
  }));

  const articles: MetadataRoute.Sitemap = posts.map((post) => ({
    url: `${SITE_URL}/news/${post.slug}/`,
    lastModified: post.dateModified ?? post.datePublished,
  }));

  return [...pages, ...articles];
}
