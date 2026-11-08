import type { MetadataRoute } from "next";
import { SITE_UPDATED, SITE_URL } from "@/lib/seo";
import { localeHref } from "@/lib/i18n";
import { getPosts } from "@/content/news";
import { getServices, serviceSlugs } from "@/content/services";

export const dynamic = "force-static";

const url = (path: string) => `${SITE_URL}${path}`;
const serviceImage = (slug: string) => getServices("th").find((service) => service.slug === slug)?.image;

// Pages that exist in both languages.
const pairedRoutes = ["/", "/services/", ...serviceSlugs.map((slug) => `/services/${slug}/`), "/tools/", "/work/", "/about/", "/contact/", "/news/"];

// lastModified is a real content date, never the build time: Google ignores
// <lastmod> on sites where it changes every build.
export default function sitemap(): MetadataRoute.Sitemap {
  const pages = pairedRoutes.flatMap((route) => {
    const languages = { th: url(route), en: url(localeHref("en", route)) };
    const slug = route.match(/^\/services\/(.+)\/$/)?.[1];
    const image = slug ? serviceImage(slug) : undefined;
    const images = image ? { images: [url(image)] } : {};
    return [
      { url: languages.th, lastModified: SITE_UPDATED, alternates: { languages }, ...images },
      { url: languages.en, lastModified: SITE_UPDATED, alternates: { languages }, ...images },
    ];
  });

  const articles: MetadataRoute.Sitemap = (["th", "en"] as const).flatMap((locale) =>
    getPosts(locale).map((post) => {
      const path = `/news/${post.slug}/`;
      return {
        url: url(localeHref(locale, path)),
        lastModified: post.dateModified ?? post.datePublished,
        images: [url(post.image)],
        ...(post.paired ? { alternates: { languages: { th: url(path), en: url(localeHref("en", path)) } } } : {}),
      };
    }),
  );

  return [...pages, ...articles];
}
