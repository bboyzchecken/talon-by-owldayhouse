import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";

export const dynamic = "force-static";

export default function robots(): MetadataRoute.Robots {
  return {
    // /owl-docs/ is a hidden internal tool — keep it out of the index.
    rules: { userAgent: "*", allow: "/", disallow: "/owl-docs/" },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
