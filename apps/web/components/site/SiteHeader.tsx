"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { Button, OwlLogo } from "@odh/ui";
import { getCopy } from "@/content/copy";
import { getServices } from "@/content/services";
import { localeHref, switchLocalePath, type Locale } from "@/lib/i18n";

const PILLARS = ["Build", "Activate", "Grow"] as const;

interface SiteHeaderProps {
  locale: Locale;
  /** Overrides the language link on pages with no twin, such as the 404 page. */
  languageHref?: string;
}

export function SiteHeader({ locale, languageHref }: SiteHeaderProps) {
  const [open, setOpen] = useState(false);
  const [megaDismissed, setMegaDismissed] = useState(false);
  const pathname = usePathname();
  const t = getCopy(locale).nav;
  const services = getServices(locale);
  const href = (path: string) => localeHref(locale, path);
  const other: Locale = locale === "th" ? "en" : "th";

  const links = [
    { href: href("/work/"), label: t.work },
    { href: href("/news/"), label: t.news },
    { href: href("/about/"), label: t.about },
  ];
  const close = () => setOpen(false);

  // The mega menu opens on hover and focus, and both survive a client-side
  // navigation. A click hides it until the pointer leaves or focus returns.
  const dismissMega = () => {
    setMegaDismissed(true);
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
  };
  const restoreMega = () => setMegaDismissed(false);

  return (
    <header className="odh-header">
      <div className="odh-wrap odh-header__bar">
        <Link className="odh-header__logo" href={href("/")} aria-label={t.home} onClick={close}>
          <OwlLogo height={26} className="text-ink" />
        </Link>

        <nav aria-label={t.services}>
          <div className="odh-nav__svc" data-dismissed={megaDismissed || undefined} onMouseLeave={restoreMega} onFocus={restoreMega}>
            <Link href={href("/services/")} onClick={dismissMega}>
              {t.services}
            </Link>
            <div className="odh-mega">
              <div className="odh-wrap odh-mega__grid">
                {PILLARS.map((pillar) => (
                  <div key={pillar}>
                    <p className="odh-mono">{pillar}</p>
                    <ul>
                      {services
                        .filter((service) => service.pillar === pillar)
                        .map((service) => (
                          <li key={service.slug}>
                            <Link href={href(`/services/${service.slug}/`)} onClick={dismissMega}>
                              {service.title}
                            </Link>
                          </li>
                        ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          </div>
          {links.map((link) => (
            <Link key={link.href} href={link.href}>
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="odh-header__end">
          <Link className="odh-lang" href={languageHref ?? switchLocalePath(pathname, other)} hrefLang={other} aria-label={t.switchLabel} onClick={close}>
            {other.toUpperCase()}
          </Link>
          <Button variant="key" size="sm" asChild className="odh-header__cta">
            <Link href={href("/contact/")} onClick={close}>
              {t.cta}
            </Link>
          </Button>
          <button type="button" className="odh-burger" onClick={() => setOpen((value) => !value)} aria-label={t.menu} aria-expanded={open}>
            {open ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {open ? (
        <div className="odh-mobile">
          <div className="odh-wrap">
            <Link href={href("/services/")} onClick={close}>
              {t.services}
            </Link>
            {links.map((link) => (
              <Link key={link.href} href={link.href} onClick={close}>
                {link.label}
              </Link>
            ))}
            <Button variant="key" asChild className="mt-4">
              <Link href={href("/contact/")} onClick={close}>
                {t.cta}
              </Link>
            </Button>
          </div>
        </div>
      ) : null}
    </header>
  );
}
