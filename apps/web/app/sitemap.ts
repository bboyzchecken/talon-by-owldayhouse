import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";

export const dynamic = "force-static";

// trailingSlash:true — keep URLs consistent with the exported pages.
const routes = ["", "/about", "/services", "/talon", "/packages", "/work", "/contact"];

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  return routes.map((route) => ({
    url: `${SITE_URL}${route}/`,
    lastModified,
    changeFrequency: "monthly",
    priority: route === "" ? 1 : route === "/talon" ? 0.9 : 0.8,
  }));
}
