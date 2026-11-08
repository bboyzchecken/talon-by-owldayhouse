import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowLeft, ArrowRight, ArrowUpRight } from "lucide-react";
import { Button } from "@odh/ui";
import { JsonLd } from "@/components/JsonLd";
import { MessengerCta } from "@/components/MessengerCta";
import { CapabilityTag } from "@/components/site/CapabilityTag";
import { EyeHero } from "@/components/site/EyeHero";
import { ListTabs, type ListTab } from "@/components/site/ListTabs";
import { ServiceIndex } from "@/components/site/ServiceIndex";
import { StatementFill } from "@/components/site/StatementFill";
import { ThreeActs } from "@/components/site/ThreeActs";
import { TouchDemo } from "@/components/site/TouchDemo";
import { ContactClose, LogoMarquee, PageIntro, SectionHead, WorkEditorial } from "@/components/site/sections";
import { getCopy } from "@/content/copy";
import { posts } from "@/content/news";
import { portfolio } from "@/content/portfolio";
import { getService, getServices } from "@/content/services";
import { company, contact } from "@/content/site";
import { localeHref, type Locale } from "@/lib/i18n";
import { pageMeta } from "@/lib/seo";
import { breadcrumbSchema, servicesSchema } from "@/lib/structured-data";

const marqueeLabel: Record<Locale, string> = { th: "ลูกค้าที่เคยร่วมงาน", en: "Clients we have worked with" };

/* Home */

export function homeMeta(locale: Locale): Metadata {
  const t = getCopy(locale).home;
  return pageMeta({ locale, title: t.metaTitle, description: t.metaDescription, path: "/", absoluteTitle: true });
}

export function HomeView({ locale }: { locale: Locale }) {
  const copy = getCopy(locale);
  const href = (path: string) => localeHref(locale, path);
  const t = copy.home;
  const workTab: ListTab = {
    id: "work",
    label: t.newsTabs.work,
    items: portfolio
      .filter((item) => item.status === "live")
      .map((item) => ({ category: item.category[locale], title: item.title[locale], href: item.url ?? href("/work/"), external: Boolean(item.url) })),
  };
  // Articles are published in Thai only.
  const newsTab: ListTab = {
    id: "news",
    label: t.newsTabs.news,
    items: posts.slice(0, 3).map((post) => ({ category: `${post.readingMinutes} ${copy.news.minutes}`, title: post.title, href: `/news/${post.slug}/` })),
  };

  return (
    <main>
      <EyeHero home={t} workHref={href("/work/")} contactHref={href("/contact/")} />
      <StatementFill segments={t.statement} emphasis={t.statementKey} />
      <ThreeActs acts={copy.acts} />
      <section className="odh-sec odh-wrap">
        <SectionHead label="Services">
          {t.servicesTitle} <em>{t.servicesKey}</em>
        </SectionHead>
        <ServiceIndex services={getServices(locale)} labels={copy.capability} basePath={href("/services/")} />
      </section>
      <section className="odh-sec odh-wrap">
        <SectionHead label="Selected work">{t.workTitle}</SectionHead>
        <WorkEditorial items={portfolio.slice(0, 4)} locale={locale} labels={copy.capability} />
      </section>
      <LogoMarquee label={marqueeLabel[locale]} />
      <section className="odh-sec odh-wrap">
        <ListTabs tabs={locale === "th" ? [workTab, newsTab] : [workTab]} />
      </section>
      <ContactClose locale={locale} location="home-close" />
    </main>
  );
}

/* Services */

export function servicesMeta(locale: Locale): Metadata {
  const t = getCopy(locale).servicesPage;
  return pageMeta({ locale, title: t.metaTitle, description: t.metaDescription, path: "/services/" });
}

export function ServicesView({ locale }: { locale: Locale }) {
  const copy = getCopy(locale);
  const t = copy.servicesPage;
  const href = (path: string) => localeHref(locale, path);
  return (
    <main>
      <JsonLd data={[breadcrumbSchema(locale, copy.nav.services, "/services/"), ...servicesSchema(locale)]} />
      <PageIntro label={t.label} title={t.title} lead={t.lead} />
      <section className="odh-wrap pb-24">
        <ServiceIndex services={getServices(locale)} labels={copy.capability} basePath={href("/services/")} />
        <div className="mt-10">
          <Link className="odh-link" href={href("/tools/")}>
            {t.ctaTools} <ArrowRight size={16} />
          </Link>
        </div>
      </section>
      <ContactClose locale={locale} location="services-close" />
    </main>
  );
}

export function serviceDetailMeta(locale: Locale, slug: string): Metadata {
  const service = getService(locale, slug);
  if (!service) return {};
  return pageMeta({ locale, title: service.metaTitle, description: `${service.blurb} ${service.problem}`, path: `/services/${slug}/` });
}

export function ServiceDetailView({ locale, slug }: { locale: Locale; slug: string }) {
  const service = getService(locale, slug);
  if (!service) notFound();
  const copy = getCopy(locale);
  const t = copy.serviceDetail;
  const href = (path: string) => localeHref(locale, path);
  const isSoftware = service.pillar === "Build";
  const isPartner = service.capability === "partner";

  return (
    <main>
      <JsonLd data={breadcrumbSchema(locale, service.title, `/services/${slug}/`, { name: copy.nav.services, path: "/services/" })} />
      <header className="odh-intro odh-wrap">
        <Link className="odh-link" href={href("/services/")}>
          <ArrowLeft size={16} /> {t.back}
        </Link>
        <p className="odh-mono mt-10">{service.pillar}</p>
        <h1 className="odh-h1">{service.title}</h1>
        <p className="odh-lead">{service.blurb}</p>
      </header>
      <div className="odh-wrap">
        <Image className="odh-pageimg" src={service.image} alt="" width={1920} height={1360} sizes="100vw" priority />
      </div>

      <section className="odh-sec odh-wrap odh-two">
        <p className="odh-mono">{service.pillar}</p>
        <p className="odh-statementline">{service.problem}</p>
      </section>

      <section className="odh-wrap odh-two pb-24">
        <h2>{t.deliverables}</h2>
        <ul className="odh-lines">
          {service.deliverables.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <section className="odh-sec odh-wrap">
        <div className="odh-two mb-16">
          <h2>{t.process}</h2>
        </div>
        <ol className="odh-steps">
          {t.steps.map((step, index) => (
            <li key={step.title}>
              <span className="odh-mono">0{index + 1}</span>
              <h3>{step.title}</h3>
              <p>{step.text}</p>
            </li>
          ))}
        </ol>
      </section>

      {slug === "event-interactive" ? (
        <section className="odh-wrap odh-two pb-24">
          <div>
            <h2>{t.demoTitle}</h2>
            <p className="odh-note mt-4">{t.demoBody}</p>
          </div>
          <div className="odh-demoarea">
            <TouchDemo hint={t.demoHint} aria={t.demoAria} sampleLabel={copy.capability.sample} />
          </div>
        </section>
      ) : null}

      <section className="odh-wrap odh-two pb-24">
        <h2>{isPartner ? copy.capability.partner : t.toolsTitle}</h2>
        <div>
          <p className="odh-statementline">{isPartner ? t.partnerBody : t.toolsBody}</p>
          <div className="mt-6">
            <CapabilityTag kind={service.capability} labels={copy.capability} />
          </div>
        </div>
      </section>

      {isSoftware ? (
        <section className="odh-sec odh-wrap">
          <SectionHead label="Selected work">{t.relatedWork}</SectionHead>
          <WorkEditorial items={portfolio.slice(0, 2)} locale={locale} labels={copy.capability} />
        </section>
      ) : null}

      <ContactClose locale={locale} location={`service-${slug}`} />
    </main>
  );
}

/* Tools */

export function toolsMeta(locale: Locale): Metadata {
  const t = getCopy(locale).tools;
  return pageMeta({ locale, title: t.metaTitle, description: t.metaDescription, path: "/tools/" });
}

export function ToolsView({ locale }: { locale: Locale }) {
  const copy = getCopy(locale);
  const t = copy.tools;
  return (
    <main>
      <JsonLd data={breadcrumbSchema(locale, copy.nav.tools, "/tools/")} />
      <PageIntro label={t.label} title={t.title} lead={t.lead} />
      <section className="odh-wrap pb-24">
        {t.items.map((item) => (
          <div key={item.name} className="odh-tool">
            <h3>{item.name}</h3>
            <p>{item.description}</p>
            <span className="odh-tool__tags">
              <CapabilityTag kind={item.capability} labels={copy.capability} />
            </span>
          </div>
        ))}
      </section>
      <ContactClose locale={locale} location="tools-close" />
    </main>
  );
}

/* Work */

export function workMeta(locale: Locale): Metadata {
  const t = getCopy(locale).work;
  return pageMeta({ locale, title: t.metaTitle, description: t.metaDescription, path: "/work/" });
}

export function WorkView({ locale }: { locale: Locale }) {
  const copy = getCopy(locale);
  const t = copy.work;
  return (
    <main>
      <JsonLd data={breadcrumbSchema(locale, copy.nav.work, "/work/")} />
      <PageIntro label={t.label} title={t.title} lead={t.lead} />
      <section className="odh-wrap pb-24">
        <WorkEditorial items={portfolio} locale={locale} labels={copy.capability} />
      </section>
      <section className="odh-wrap pb-24">
        <ul className="odh-lines">
          {portfolio.map((item) => (
            <li key={item.slug} className="flex flex-col gap-2">
              <span>{item.client[locale]}</span>
              <span className="odh-note font-body text-base">{item.result[locale]}</span>
              {item.url ? (
                <a className="odh-link self-start text-base" href={item.url} target="_blank" rel="noopener noreferrer">
                  {t.viewSite} <ArrowUpRight size={16} />
                </a>
              ) : null}
            </li>
          ))}
        </ul>
      </section>
      <ContactClose locale={locale} location="work-close" />
    </main>
  );
}

/* About */

export function aboutMeta(locale: Locale): Metadata {
  const t = getCopy(locale).about;
  return pageMeta({ locale, title: t.metaTitle, description: t.metaDescription, path: "/about/" });
}

export function AboutView({ locale }: { locale: Locale }) {
  const copy = getCopy(locale);
  const t = copy.about;
  return (
    <main>
      <JsonLd data={breadcrumbSchema(locale, copy.nav.about, "/about/")} />
      <PageIntro label={t.label} title={t.title} />
      <div className="odh-wrap">
        <Image className="odh-pageimg" src="/imagery/event-hall.webp" alt="" width={1920} height={1088} sizes="100vw" priority />
      </div>
      <section className="odh-sec odh-wrap odh-two">
        <p className="odh-mono">Owl Day House</p>
        <div className="odh-paras">
          {t.paragraphs.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>
      </section>
      <section className="odh-wrap pb-24">
        <div className="odh-reasons">
          {t.reasons.map((reason) => (
            <div key={reason.title}>
              <h2>{reason.title}</h2>
              <p>{reason.text}</p>
            </div>
          ))}
        </div>
      </section>
      <ContactClose locale={locale} location="about-close" />
    </main>
  );
}

/* Contact */

const mapsQuery = `${company.address.line} ${company.address.district} ${company.address.city} ${company.address.postcode}`;
const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapsQuery)}`;

export function contactMeta(locale: Locale): Metadata {
  const t = getCopy(locale).contactPage;
  return pageMeta({ locale, title: t.metaTitle, description: t.metaDescription, path: "/contact/" });
}

export function ContactView({ locale }: { locale: Locale }) {
  const copy = getCopy(locale);
  const t = copy.contactPage;
  const phone = locale === "th" ? contact.phoneDisplay : contact.phoneDisplayEn;
  return (
    <main>
      <JsonLd data={breadcrumbSchema(locale, copy.nav.cta, "/contact/")} />
      <PageIntro label={t.label} title={t.title} lead={t.lead} />
      <section className="odh-wrap pb-24">
        <div className="odh-ways">
          <div>
            <h2>{t.messenger}</h2>
            <p>{t.messengerNote}</p>
            <div className="odh-cta">
              <MessengerCta location="contact-page">
                {t.messengerCta} <ArrowRight size={18} />
              </MessengerCta>
            </div>
          </div>
          <div>
            <h2>{t.phone}</h2>
            <p>{phone}</p>
            <div className="odh-cta">
              <Button variant="line" asChild>
                <a href={contact.phoneTel}>{t.phoneCta}</a>
              </Button>
            </div>
          </div>
          <div>
            <h2>{t.line}</h2>
            <p>{t.lineNote}</p>
            <div className="odh-cta">
              <Button variant="line" asChild>
                <a href={contact.line} target="_blank" rel="noopener noreferrer">
                  {t.lineCta}
                </a>
              </Button>
            </div>
          </div>
        </div>
      </section>
      <section className="odh-wrap pb-24">
        <div className="odh-reasons">
          <div>
            <h2>{t.address}</h2>
            <address className="not-italic text-muted">
              {locale === "th" ? company.legalName : company.legalNameEn}
              <br />
              {locale === "th" ? `${company.address.line} ${company.address.district} ${company.address.city} ${company.address.postcode}` : company.addressEn}
            </address>
            <a className="odh-link mt-3" href={mapsUrl} target="_blank" rel="noopener noreferrer">
              {t.map} <ArrowUpRight size={16} />
            </a>
          </div>
          <div>
            <h2>{t.hours}</h2>
            <p>{t.hoursValue}</p>
          </div>
        </div>
      </section>
    </main>
  );
}
