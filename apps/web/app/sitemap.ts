import type { MetadataRoute } from "next";
import { SITE_UPDATED, SITE_URL } from "@/lib/seo";
import { localeHref } from "@/lib/i18n";
import { posts } from "@/content/news";
import { serviceSlugs } from "@/content/services";

export const dynamic = "force-static";

// Pages that exist in both languages.
const pairedRoutes = ["/", "/services/", ...serviceSlugs.map((slug) => `/services/${slug}/`), "/tools/", "/work/", "/about/", "/contact/"];

const url = (path: string) => `${SITE_URL}${path}`;

// lastModified is a real content date, never the build time: Google ignores
// <lastmod> on sites where it changes every build.
export default function sitemap(): MetadataRoute.Sitemap {
  const pages = pairedRoutes.flatMap((route) => {
    const languages = { th: url(route), en: url(localeHref("en", route)) };
    return [
      { url: languages.th, lastModified: SITE_UPDATED, alternates: { languages } },
      { url: languages.en, lastModified: SITE_UPDATED, alternates: { languages } },
    ];
  });

  const news: MetadataRoute.Sitemap = [{ url: url("/news/"), lastModified: SITE_UPDATED }];
  const articles: MetadataRoute.Sitemap = posts.map((post) => ({
    url: url(`/news/${post.slug}/`),
    lastModified: post.dateModified ?? post.datePublished,
  }));

  return [...pages, ...news, ...articles];
}
