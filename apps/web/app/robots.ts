import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";

export const dynamic = "force-static";

export default function robots(): MetadataRoute.Robots {
  return {
    // Hidden tools (/owl-docs/, /up-docs/) stay crawlable on purpose: they carry
    // noindex, and a crawler blocked here could never read it.
    rules: { userAgent: "*", allow: "/" },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
