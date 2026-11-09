// Two locales on a static export: Thai lives at the original URLs, English under /en/.

export type Locale = "th" | "en";

export const locales: readonly Locale[] = ["th", "en"];

const thaiOnlyPrefixes = ["/news/", "/owl-docs/", "/up-docs/", "/showcase/"];

/** Locale-aware internal link. Paths use a trailing slash, e.g. "/work/". */
export function localeHref(locale: Locale, path: string): string {
  if (locale === "th") return path;
  return path === "/" ? "/en/" : `/en${path}`;
}

/** The same page in the other language, or that language's home if it has no twin. */
export function switchLocalePath(pathname: string, target: Locale): string {
  const clean = pathname.endsWith("/") ? pathname : `${pathname}/`;
  const bare = clean === "/en/" ? "/" : clean.startsWith("/en/") ? clean.slice(3) : clean;
  // Articles and internal pages exist in Thai only.
  if (target === "en" && thaiOnlyPrefixes.some((prefix) => bare.startsWith(prefix))) return "/en/";
  return localeHref(target, bare);
}
