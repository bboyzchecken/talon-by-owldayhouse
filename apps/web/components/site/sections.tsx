import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { getCopy } from "@/content/copy";
import { getIndustries } from "@/content/industries";
import { industryNames, type CaseStudy, type PortfolioItem } from "@/content/portfolio";
import { contact, social } from "@/content/site";
import { localeHref, type Locale } from "@/lib/i18n";
import { EmailLink, LineLink } from "@/components/MessengerCta";

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
  showResult?: boolean;
}

/** Live work in equal frames, so every project reads as part of one set. */
export function WorkEditorial({ items, locale, showResult }: WorkEditorialProps) {
  return (
    <div className="odh-work">
      {items.map((item) => {
        const picture = (
          <div className="odh-work__panel">
            <div className="odh-work__win">
              <div className="odh-work__bar" aria-hidden="true">
                <i />
                <i />
                <i />
              </div>
              <Image src={item.image ?? ""} alt={`${item.title[locale]}, ${item.client[locale]}`} width={1280} height={640} sizes="(max-width: 900px) 100vw, 30vw" />
            </div>
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
              <span className="odh-mono">{item.category[locale]}</span>
              <h3>{item.title[locale]}</h3>
              {showResult ? <p className="odh-work__result">{item.result[locale]}</p> : null}
            </figcaption>
          </figure>
        );
      })}
    </div>
  );
}

/** Industries we have worked in. Most campaign work is under NDA, so no client names. */
export function IndustryMarquee({ label, locale }: { label: string; locale: Locale }) {
  const list = industryNames[locale];
  const names = [...list, ...list];
  return (
    <div className="odh-marquee" role="img" aria-label={`${label}: ${list.join(", ")}`}>
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
            <EmailLink location={`${location}-text`} className="odh-link">
              {contact.email}
            </EmailLink>
            <a className="odh-link" href={social.linkedin} target="_blank" rel="noopener noreferrer">
              LinkedIn <ArrowUpRight size={16} />
            </a>
          </div>
        </div>
        {locale === "en" ? (
          <EmailLink location={location} className="odh-disc">
            <span>
              {t.disc[0]}
              <br />
              {t.disc[1]}
            </span>
          </EmailLink>
        ) : (
          <LineLink location={location} className="odh-disc">
            <span>
              {t.disc[0]}
              <br />
              {t.disc[1]}
            </span>
          </LineLink>
        )}
      </div>
    </section>
  );
}

/** Campaign and event cards for work under NDA: brand category, what we did, and a confirmed number. */
export function CaseGrid({ items, locale, showNote = true }: { items: readonly CaseStudy[]; locale: Locale; showNote?: boolean }) {
  const t = getCopy(locale).cases;
  if (items.length === 0) return null;
  return (
    <div>
      <div className="odh-cases">
        {items.map((item) => (
          <article key={item.slug}>
            <p className="odh-mono">{item.category[locale]}</p>
            {item.metric ? <p className="odh-cases__metric">{item.metric[locale]}</p> : null}
            <h3>{item.client[locale]}</h3>
            <p>{item.work[locale]}</p>
          </article>
        ))}
      </div>
      {showNote ? <p className="odh-note mt-8">{t.note}</p> : null}
    </div>
  );
}

/** The fixed-scope starter package, with a quotation CTA. Price stays with the sales team. */
export function LeadKit({ locale, location }: { locale: Locale; location: string }) {
  const t = getCopy(locale).leadKit;
  return (
    <section className="odh-sec odh-wrap odh-two">
      <div>
        <p className="odh-mono">{t.label}</p>
        <h2 className="mt-4">{t.title}</h2>
        <p className="odh-note mt-4">{t.body}</p>
        <div className="mt-8">
          <EmailLink location={`${location}-leadkit`} className="odh-link">
            {t.cta} <ArrowRight size={16} />
          </EmailLink>
        </div>
      </div>
      <ul className="odh-lines">
        {t.items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </section>
  );
}

/** Links to the industry landing pages. */
export function IndustryLinks({ locale }: { locale: Locale }) {
  return (
    <div className="odh-news">
      {getIndustries(locale).map((industry) => (
        <Link key={industry.slug} href={localeHref(locale, `/industries/${industry.slug}/`)}>
          <span className="odh-mono">{industry.name}</span>
          <h3>{industry.title}</h3>
          <ArrowRight size={18} />
        </Link>
      ))}
    </div>
  );
}
