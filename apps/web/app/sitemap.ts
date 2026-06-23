import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";
import { posts } from "@/content/news";

export const dynamic = "force-static";

// trailingSlash:true — keep URLs consistent with the exported pages.
const routes = ["", "/about", "/services", "/talon", "/packages", "/work", "/contact", "/news"];

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  const pages: MetadataRoute.Sitemap = routes.map((route) => ({
    url: `${SITE_URL}${route}/`,
    lastModified,
    changeFrequency: "monthly",
    priority: route === "" ? 1 : route === "/talon" ? 0.9 : 0.8,
  }));

  const articles: MetadataRoute.Sitemap = posts.map((post) => ({
    url: `${SITE_URL}/news/${post.slug}/`,
    lastModified: new Date(post.dateModified ?? post.datePublished),
    changeFrequency: "yearly",
    priority: 0.6,
  }));

  return [...pages, ...articles];
}
