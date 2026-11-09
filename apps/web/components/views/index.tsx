import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "@odh/ui";
import { JsonLd } from "@/components/JsonLd";
import { EmailLink, LineLink, MessengerCta } from "@/components/MessengerCta";
import { BrandLoop } from "@/components/site/BrandLoop";
import { CapabilityTag } from "@/components/site/CapabilityTag";
import { EyeHero } from "@/components/site/EyeHero";
import { ListTabs, type ListTab } from "@/components/site/ListTabs";
import { ServiceIndex } from "@/components/site/ServiceIndex";
import { StatementFill } from "@/components/site/StatementFill";
import { ThreeActs } from "@/components/site/ThreeActs";
import { TouchDemo } from "@/components/site/TouchDemo";
import { CaseGrid, ContactClose, IndustryLinks, IndustryMarquee, LeadKit, PageIntro, SectionHead, WorkEditorial } from "@/components/site/sections";
import { getCopy } from "@/content/copy";
import { getIndustry } from "@/content/industries";
import { publishedPosts } from "@/content/news";
import { cases, earlierWork, liveWork, portfolio } from "@/content/portfolio";
import { getService, getServices } from "@/content/services";
import { company, contact } from "@/content/site";
import { localeHref, type Locale } from "@/lib/i18n";
import { pageMeta } from "@/lib/seo";
import { breadcrumbSchema, servicesSchema } from "@/lib/structured-data";

/** Services that agencies and event organizers also hire us for. */
const agencyServices = new Set(["event-interactive", "event-content", "kol-influencer"]);

/* Home */

export function homeMeta(locale: Locale): Metadata {
  const t = getCopy(locale).home;
  return pageMeta({ locale, title: t.metaTitle, description: t.metaDescription, path: "/", absoluteTitle: true });
}

export function HomeView({ locale }: { locale: Locale }) {
  const copy = getCopy(locale);
  const href = (path: string) => localeHref(locale, path);
  const t = copy.home;
  // Articles are published in Thai only.
  const newsTab: ListTab = {
    id: "news",
    label: t.newsTabs.news,
    items: publishedPosts.slice(0, 3).map((post) => ({ category: `${post.readingMinutes} ${copy.news.minutes}`, title: post.title, href: `/news/${post.slug}/` })),
  };

  return (
    <main>
      <EyeHero home={t} workHref={href("/work/")} contactHref={href("/contact/")} />
      <StatementFill segments={t.statement} emphasis={t.statementKey} />
      <ThreeActs acts={copy.acts} />
      <BrandLoop loop={t.loop} />
      <section className="odh-sec odh-wrap">
        <SectionHead label="Services">
          {t.servicesTitle} <em>{t.servicesKey}</em>
        </SectionHead>
        <ServiceIndex services={getServices(locale)} labels={copy.capability} basePath={href("/services/")} />
      </section>
      <section className="odh-sec odh-wrap">
        <SectionHead label={copy.industries.label}>
          {t.industriesTitle} <em>{t.industriesKey}</em>
        </SectionHead>
        <IndustryLinks locale={locale} />
      </section>
      <section className="odh-sec odh-wrap">
        <SectionHead label="Selected work">{t.workTitle}</SectionHead>
        <WorkEditorial items={liveWork} locale={locale} />
      </section>
      <section className="odh-sec odh-wrap">
        <SectionHead label={copy.cases.label}>{copy.cases.title}</SectionHead>
        <CaseGrid items={cases} locale={locale} />
      </section>
      <IndustryMarquee label={t.industriesMarquee} locale={locale} />
      {locale === "th" ? (
        <section className="odh-sec odh-wrap">
          <ListTabs tabs={[newsTab]} />
        </section>
      ) : null}
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
      <section className="odh-sec odh-wrap">
        <SectionHead label={copy.industries.label}>{t.industriesTitle}</SectionHead>
        <IndustryLinks locale={locale} />
      </section>
      <LeadKit locale={locale} location="services" />
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
  const relatedCases = cases.filter((item) => item.services.includes(slug));

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

      {service.tool || isPartner ? (
        <section className="odh-wrap odh-two pb-24">
          <h2>{service.tool ? t.toolsTitle : copy.capability.partner}</h2>
          <div>
            {service.tool ? <p className="odh-statementline">{service.tool}</p> : null}
            {isPartner ? <p className="odh-note mt-4">{t.partnerBody}</p> : null}
          </div>
        </section>
      ) : null}

      {slug === "event-interactive" ? <LeadKit locale={locale} location={`service-${slug}`} /> : null}

      {isSoftware ? (
        <section className="odh-sec odh-wrap">
          <SectionHead label="Selected work">{t.relatedWork}</SectionHead>
          <WorkEditorial items={liveWork} locale={locale} />
        </section>
      ) : null}

      {relatedCases.length > 0 ? (
        <section className="odh-sec odh-wrap">
          <SectionHead label={copy.cases.label}>{t.relatedWork}</SectionHead>
          <CaseGrid items={relatedCases} locale={locale} />
        </section>
      ) : null}

      {agencyServices.has(slug) ? (
        <section className="odh-wrap odh-two pb-24">
          <h2>{t.agencyTitle}</h2>
          <p className="odh-statementline">{t.agencyBody}</p>
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
            <span className="odh-tool__tags">{item.partner ? <CapabilityTag kind="partner" labels={copy.capability} /> : null}</span>
          </div>
        ))}
      </section>
      <section className="odh-sec odh-wrap odh-two">
        <p className="odh-mono">{t.open.label}</p>
        <div>
          <h2>{t.open.title}</h2>
          <p className="odh-lead">{t.open.body}</p>
        </div>
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
        <WorkEditorial items={liveWork} locale={locale} showResult />
      </section>
      <section className="odh-sec odh-wrap">
        <SectionHead label={copy.cases.label}>{copy.cases.title}</SectionHead>
        <CaseGrid items={cases} locale={locale} />
      </section>
      <section className="odh-wrap pb-24 odh-two">
        <h2>{t.earlier}</h2>
        <ul className="odh-lines">
          {earlierWork.map((item) => (
            <li key={item.slug} className="flex flex-col gap-2">
              <span className="flex flex-wrap items-center justify-between gap-3">
                {item.title[locale]}
                <CapabilityTag kind="closed" labels={copy.capability} />
              </span>
              <span className="odh-note font-body text-base">{item.result[locale]}</span>
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
      {t.teamStats.length > 0 ? (
        <section className="odh-wrap pb-24">
          <p className="odh-mono mb-8">{t.teamLabel}</p>
          <div className="odh-stats">
            {t.teamStats.map((stat) => (
              <div key={stat.label}>
                <strong>{stat.value}</strong>
                <span>{stat.label}</span>
              </div>
            ))}
          </div>
        </section>
      ) : null}
      <ContactClose locale={locale} location="about-close" />
    </main>
  );
}

/* Contact */

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
            <h2>{t.email}</h2>
            <p>{contact.email}</p>
            <div className="odh-cta">
              <Button variant="key" asChild>
                <EmailLink location="contact-page">
                  {t.emailCta} <ArrowRight size={18} />
                </EmailLink>
              </Button>
            </div>
          </div>
          <div>
            <h2>{t.line}</h2>
            <p>{t.lineNote}</p>
            <div className="odh-cta">
              <Button variant="line" asChild>
                <LineLink location="contact-page">{t.lineCta}</LineLink>
              </Button>
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
            <h2>{t.messenger}</h2>
            <p>{t.messengerNote}</p>
            <div className="odh-cta">
              <MessengerCta location="contact-page" variant="line">
                {t.messengerCta}
              </MessengerCta>
            </div>
          </div>
        </div>
        {contact.profilePdf ? (
          <div className="mt-10">
            <a className="odh-link" href={contact.profilePdf} download>
              {t.profile} <ArrowRight size={16} />
            </a>
          </div>
        ) : null}
      </section>
      <section className="odh-wrap pb-24">
        <div className="odh-reasons odh-reasons--3">
          <div>
            <h2>{t.base}</h2>
            <p>{locale === "th" ? company.base : company.baseEn}</p>
          </div>
          <div>
            <h2>{t.address}</h2>
            <address className="not-italic text-muted">
              {locale === "th" ? company.legalName : company.legalNameEn}
              <br />
              {locale === "th" ? `${company.address.line} ${company.address.district} ${company.address.city} ${company.address.postcode}` : company.addressEn}
            </address>
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

/* Industries */

export function industryMeta(locale: Locale, slug: string): Metadata {
  const industry = getIndustry(locale, slug);
  if (!industry) return {};
  return pageMeta({ locale, title: industry.metaTitle, description: industry.metaDescription, path: `/industries/${slug}/` });
}

const PILLARS = ["Build", "Activate", "Grow"] as const;

export function IndustryView({ locale, slug }: { locale: Locale; slug: string }) {
  const industry = getIndustry(locale, slug);
  if (!industry) notFound();
  const copy = getCopy(locale);
  const t = copy.industries;
  const href = (path: string) => localeHref(locale, path);
  const proofWork = portfolio.filter((item) => industry.proofWork.includes(item.slug));
  const proofCases = cases.filter((item) => industry.proofCases.includes(item.slug));

  return (
    <main>
      <JsonLd data={breadcrumbSchema(locale, industry.name, `/industries/${slug}/`, { name: copy.nav.services, path: "/services/" })} />
      <header className="odh-intro odh-wrap">
        <Link className="odh-link" href={href("/services/")}>
          <ArrowLeft size={16} /> {t.back}
        </Link>
        <p className="odh-mono mt-10">
          {t.label} · {industry.name}
        </p>
        <h1 className="odh-h1">{industry.title}</h1>
        <p className="odh-lead">{industry.lead}</p>
      </header>
      <div className="odh-wrap">
        <Image className="odh-pageimg" src={industry.image} alt="" width={1920} height={1360} sizes="100vw" priority />
      </div>

      <section className="odh-sec odh-wrap odh-two">
        <h2>{t.pains}</h2>
        <ul className="odh-lines">
          {industry.pains.map((pain) => (
            <li key={pain}>{pain}</li>
          ))}
        </ul>
      </section>

      <section className="odh-wrap odh-two pb-24">
        <h2>{t.moments}</h2>
        <ul className="odh-lines">
          {industry.moments.map((moment) => (
            <li key={moment}>{moment}</li>
          ))}
        </ul>
      </section>

      <section className="odh-sec odh-wrap">
        <div className="odh-two mb-16">
          <h2>{t.plan}</h2>
        </div>
        <ol className="odh-steps odh-steps--3">
          {PILLARS.map((pillar) => (
            <li key={pillar}>
              <span className="odh-mono">{pillar}</span>
              <p className="mt-2 text-xl text-ink">{industry.plan[pillar]}</p>
            </li>
          ))}
        </ol>
        {industry.note ? <p className="odh-note mt-10">{industry.note}</p> : null}
      </section>

      <LeadKit locale={locale} location={`industry-${slug}`} />

      {proofWork.length > 0 || proofCases.length > 0 ? (
        <section className="odh-sec odh-wrap">
          <SectionHead label="Selected work">{t.proof}</SectionHead>
          {proofWork.length > 0 ? <WorkEditorial items={proofWork} locale={locale} showResult /> : null}
          {proofCases.length > 0 ? (
            <div className={proofWork.length > 0 ? "mt-16" : undefined}>
              <CaseGrid items={proofCases} locale={locale} />
            </div>
          ) : null}
        </section>
      ) : null}

      <ContactClose locale={locale} location={`industry-${slug}`} />
    </main>
  );
}
