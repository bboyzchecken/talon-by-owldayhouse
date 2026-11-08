"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@odh/ui";
import { getCopy } from "@/content/copy";
import { localeHref, type Locale } from "@/lib/i18n";
import { SiteFooter } from "./SiteFooter";
import { SiteHeader } from "./SiteHeader";

/** One static 404.html serves every missing URL, so the language comes from the address. */
export function NotFoundPage() {
  const [locale, setLocale] = useState<Locale>("th");

  useEffect(() => {
    const { pathname } = window.location;
    if (pathname !== "/en" && !pathname.startsWith("/en/")) return;
    setLocale("en");
    document.documentElement.lang = "en";
  }, []);

  const copy = getCopy(locale);
  const t = copy.notFound;
  const href = (path: string) => localeHref(locale, path);
  const links = [
    { href: href("/services/"), label: copy.nav.services },
    { href: href("/work/"), label: copy.nav.work },
    { href: href("/tools/"), label: copy.nav.tools },
    { href: href("/news/"), label: copy.nav.news },
  ];

  return (
    <>
      <SiteHeader locale={locale} languageHref={locale === "th" ? "/en/" : "/"} />
      <main className="odh-404 odh-wrap">
        <div>
          <p className="odh-404__code" aria-hidden="true">
            4<span className="odh-eye" />4
          </p>
          <h1 className="odh-h1">{t.title}</h1>
          <p className="odh-lead">{t.lead}</p>
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <Button variant="key" asChild>
              <Link href={href("/")}>
                {t.home} <ArrowRight size={18} />
              </Link>
            </Button>
            <Button variant="line" asChild>
              <Link href={href("/contact/")}>{t.contact}</Link>
            </Button>
          </div>
        </div>
        <nav className="odh-404__links" aria-label={t.linksLabel}>
          <p className="odh-mono">{t.linksLabel}</p>
          <ul>
            {links.map((link) => (
              <li key={link.href}>
                <Link href={link.href}>
                  {link.label} <ArrowRight size={18} />
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </main>
      <SiteFooter locale={locale} />
    </>
  );
}
