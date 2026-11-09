import type { ReactNode } from "react";
import { fontVariables } from "@odh/brand/fonts";
import { Analytics } from "@/components/Analytics";
import { JsonLd } from "@/components/JsonLd";
import type { Locale } from "@/lib/i18n";
import { businessSchema, websiteSchema } from "@/lib/structured-data";
import { SiteFooter } from "./SiteFooter";
import { SiteHeader } from "./SiteHeader";

/** <html> and page chrome. Each language has its own root layout so `lang` is correct in the static HTML. */
export function SiteShell({ locale, children }: { locale: Locale; children: ReactNode }) {
  return (
    <html lang={locale} className={fontVariables}>
      <body className="flex min-h-screen flex-col bg-white font-body text-ink antialiased">
        <JsonLd data={[businessSchema(locale), websiteSchema(locale)]} />
        <SiteHeader locale={locale} />
        <div className="flex-1">{children}</div>
        <SiteFooter locale={locale} />
        <Analytics />
      </body>
    </html>
  );
}
