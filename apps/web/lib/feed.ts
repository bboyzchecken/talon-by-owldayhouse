import { getCopy } from "@/content/copy";
import { getPosts } from "@/content/news";
import { localeHref, type Locale } from "./i18n";
import { SITE_NAME, SITE_URL } from "./seo";

const escapeXml = (text: string) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** RSS 2.0 feed of every article in a language. */
export function articleFeed(locale: Locale): string {
  const t = getCopy(locale).news;
  const index = `${SITE_URL}${localeHref(locale, "/news/")}`;
  const items = getPosts(locale)
    .map((post) => {
      const url = `${index}${post.slug}/`;
      return `<item><title>${escapeXml(post.title)}</title><link>${url}</link><guid>${url}</guid><description>${escapeXml(post.description)}</description><pubDate>${new Date(post.datePublished).toUTCString()}</pubDate></item>`;
    })
    .join("");
  return `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>${escapeXml(`${SITE_NAME} ${t.title}`)}</title><link>${index}</link><description>${escapeXml(t.metaDescription)}</description><language>${locale}</language>${items}</channel></rss>`;
}
