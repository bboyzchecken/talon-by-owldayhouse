import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";

export const dynamic = "force-static";

export default function robots(): MetadataRoute.Robots {
  return {
    // /owl-docs/ + /up-docs/ are hidden gated tools — keep them out of the index.
    rules: { userAgent: "*", allow: "/", disallow: ["/owl-docs/", "/up-docs/"] },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
