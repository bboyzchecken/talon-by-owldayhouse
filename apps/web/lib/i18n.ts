// Two locales on a static export: Thai lives at the original URLs, English under /en/.

export type Locale = "th" | "en";

export const locales: readonly Locale[] = ["th", "en"];

const thaiOnlyPrefixes = ["/owl-docs/", "/up-docs/", "/showcase/"];

/** Articles written for Thai search only. Every other article exists in both languages. */
export const thaiOnlyPostSlugs = [
  "thurakit-prap-tua-yuk-ai",
  "rab-tham-website-krungthep",
  "rab-tham-website-chiang-mai-rakha",
  "thurakit-chiang-mai-tong-mi-website",
];

/** Locale-aware internal link. Paths use a trailing slash, e.g. "/work/". */
export function localeHref(locale: Locale, path: string): string {
  if (locale === "th") return path;
  return path === "/" ? "/en/" : `/en${path}`;
}

/** The same page in the other language, or that language's home if it has no twin. */
export function switchLocalePath(pathname: string, target: Locale): string {
  const clean = pathname.endsWith("/") ? pathname : `${pathname}/`;
  const bare = clean === "/en/" ? "/" : clean.startsWith("/en/") ? clean.slice(3) : clean;
  // Internal pages have no English twin; Thai-only articles fall back to the English index.
  if (target === "en" && thaiOnlyPrefixes.some((prefix) => bare.startsWith(prefix))) return "/en/";
  if (target === "en" && thaiOnlyPostSlugs.some((slug) => bare === `/news/${slug}/`)) return "/en/news/";
  return localeHref(target, bare);
}
