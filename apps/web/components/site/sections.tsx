import type { ReactNode } from "react";
import Image from "next/image";
import { ArrowUpRight } from "lucide-react";
import { getCopy, type Copy } from "@/content/copy";
import { clientNames, type PortfolioItem } from "@/content/portfolio";
import { contact, social } from "@/content/site";
import type { Locale } from "@/lib/i18n";
import { CapabilityTag } from "./CapabilityTag";
import { MessengerLink } from "@/components/MessengerCta";

export function PageIntro({ label, title, lead }: { label: string; title: string; lead?: string }) {
  return (
    <header className="odh-intro odh-wrap">
      <p className="odh-mono">{label}</p>
      <h1 className="odh-h1">{title}</h1>
      {lead ? <p className="odh-lead">{lead}</p> : null}
    </header>
  );
}

export function SectionHead({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="odh-head mb-16">
      <p className="odh-mono">{label}</p>
      <h2>{children}</h2>
    </div>
  );
}

interface WorkEditorialProps {
  items: readonly PortfolioItem[];
  locale: Locale;
  labels: Copy["capability"];
}

/** Portfolio placed off-grid like a magazine spread. */
export function WorkEditorial({ items, locale, labels }: WorkEditorialProps) {
  return (
    <div className="odh-work">
      {items.map((item) => {
        const picture = (
          <div className="odh-work__img">
            <Image src={item.image} alt={`${item.title[locale]}, ${item.client[locale]}`} width={1028} height={771} sizes="(max-width: 900px) 100vw, 58vw" />
          </div>
        );
        return (
          <figure key={item.slug}>
            {item.url ? (
              <a href={item.url} target="_blank" rel="noopener noreferrer">
                {picture}
              </a>
            ) : (
              picture
            )}
            <figcaption>
              <div className="odh-work__top">
                <span className="odh-mono">{item.category[locale]}</span>
                <CapabilityTag kind={item.status} labels={labels} />
              </div>
              <h3>{item.title[locale]}</h3>
            </figcaption>
          </figure>
        );
      })}
    </div>
  );
}

export function LogoMarquee({ label }: { label: string }) {
  const names = [...clientNames, ...clientNames];
  return (
    <div className="odh-marquee" role="img" aria-label={`${label}: ${clientNames.join(", ")}`}>
      <div className="odh-marquee__t" aria-hidden="true">
        {names.map((name, index) => (
          <span key={`${name}-${index}`}>{name}</span>
        ))}
      </div>
    </div>
  );
}

export function ContactClose({ locale, location }: { locale: Locale; location: string }) {
  const t = getCopy(locale).close;
  return (
    <section className="odh-sec odh-wrap">
      <div className="odh-close">
        <div>
          <h2>{t.title}</h2>
          <p className="max-w-lg text-xl text-muted">{t.body}</p>
          <div className="odh-close__ways">
            <a className="odh-link" href={contact.phoneTel}>
              {locale === "th" ? contact.phoneDisplay : contact.phoneDisplayEn}
            </a>
            <a className="odh-link" href={social.facebook} target="_blank" rel="noopener noreferrer">
              Facebook <ArrowUpRight size={16} />
            </a>
            <a className="odh-link" href={social.linkedin} target="_blank" rel="noopener noreferrer">
              LinkedIn <ArrowUpRight size={16} />
            </a>
          </div>
        </div>
        <MessengerLink location={location} className="odh-disc">
          <span>
            {t.disc[0]}
            <br />
            {t.disc[1]}
          </span>
        </MessengerLink>
      </div>
    </section>
  );
}
