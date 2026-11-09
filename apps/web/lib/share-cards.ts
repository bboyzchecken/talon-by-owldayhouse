// Share cards (the image people see when a page is posted to Facebook, LINE or X).
// The files are rendered into public/og by scripts/og/build.mjs; this reads the same
// manifest, so a page that has no card of its own falls back to the brand card
// instead of pointing at a file that was never generated.
import manifest from "@/scripts/og/cards.json";
import type { Locale } from "./i18n";

const cards = new Set(manifest.cards.map((card) => card.out));

/** "/og/<name>.jpg" when that card exists, otherwise undefined. */
export function shareCard(name: string): string | undefined {
  return cards.has(name) ? `/og/${name}.jpg` : undefined;
}

/** Same card layout per language — the English twin is "<name>-en". */
export function localeCard(locale: Locale, name: string): string | undefined {
  return shareCard(locale === "en" ? `${name}-en` : name);
}
