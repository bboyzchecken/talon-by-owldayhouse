import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "@odh/ui";
import { JsonLd } from "@/components/JsonLd";
import { EmailLink, MessengerCta } from "@/components/MessengerCta";
import { BrandLoop } from "@/components/site/BrandLoop";
import { CapabilityTag } from "@/components/site/CapabilityTag";
import { EyeHero } from "@/components/site/EyeHero";
import { ListTabs, type ListTab } from "@/components/site/ListTabs";
import { ServiceIndex } from "@/components/site/ServiceIndex";
import { StatementFill } from "@/components/site/StatementFill";
import { ThreeActs } from "@/components/site/ThreeActs";
import { TouchDemo } from "@/components/site/TouchDemo";
import { ArticleBody } from "@/components/site/ArticleBody";
import { Prose } from "@/components/Prose";
import { ContactClose, LogoMarquee, PageIntro, SectionHead, WorkEditorial } from "@/components/site/sections";
import { getCopy } from "@/content/copy";
import { getGuide, getPost, getPosts } from "@/content/news";
import { bodies } from "@/content/news/bodies";
import { earlierWork, liveWork } from "@/content/portfolio";
import { getService, getServices } from "@/content/services";
import { company, contact } from "@/content/site";
import { localeHref, type Locale } from "@/lib/i18n";
import { pageMeta } from "@/lib/seo";
import { articleSchema, blogSchema, breadcrumbSchema, faqSchema, serviceSchema, servicesSchema } from "@/lib/structured-data";

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
  const newsTab: ListTab = {
    id: "news",
    label: t.newsTabs.news,
    items: getPosts(locale)
      .slice(0, 3)
      .map((post) => ({ category: post.category, title: post.title, href: href(`/news/${post.slug}/`) })),
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
        <SectionHead label="Selected work">{t.workTitle}</SectionHead>
        <WorkEditorial items={liveWork} locale={locale} />
      </section>
      <LogoMarquee label={marqueeLabel[locale]} />
      <section className="odh-sec odh-wrap">
        <ListTabs tabs={[newsTab]} />
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
  return pageMeta({ locale, title: service.metaTitle, description: service.metaDescription, path: `/services/${slug}/`, image: `/og/service-${slug}.jpg` });
}

export function ServiceDetailView({ locale, slug }: { locale: Locale; slug: string }) {
  const service = getService(locale, slug);
  if (!service) notFound();
  const copy = getCopy(locale);
  const t = copy.serviceDetail;
  const href = (path: string) => localeHref(locale, path);
  const isSoftware = service.pillar === "Build";
  const isPartner = service.capability === "partner";
  const guide = getGuide(locale, slug);

  return (
    <main>
      <JsonLd data={[breadcrumbSchema(locale, service.title, `/services/${slug}/`, { name: copy.nav.services, path: "/services/" }), ...serviceSchema(locale, slug)]} />
      <header className="odh-intro odh-wrap">
        <Link className="odh-link" href={href("/services/")}>
          <ArrowLeft size={16} /> {t.back}
        </Link>
        <p className="odh-mono mt-10">{service.pillar}</p>
        <h1 className="odh-h1">{service.title}</h1>
        <p className="odh-lead">{service.blurb}</p>
      </header>
      <div className="odh-wrap">
        <Image className="odh-pageimg" src={service.image} alt={`${service.title}, Owl Day House`} width={1920} height={1360} sizes="100vw" priority />
      </div>

      <section className="odh-sec odh-wrap odh-two">
        <p className="odh-mono">{service.pillar}</p>
        <p className="odh-statementline">{service.problem}</p>
      </section>

      <section className="odh-wrap odh-two pb-24">
        <h2>{t.deliverables}</h2>
        <div>
          <ul className="odh-lines">
            {service.deliverables.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          {guide ? (
            <Link className="odh-link mt-6" href={href(`/news/${guide.slug}/`)}>
              {t.readGuide} <ArrowRight size={16} />
            </Link>
          ) : null}
        </div>
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
        <p className="odh-statementline">{isPartner ? t.partnerBody : t.toolsBody}</p>
      </section>

      {isSoftware ? (
        <section className="odh-sec odh-wrap">
          <SectionHead label="Selected work">{t.relatedWork}</SectionHead>
          <WorkEditorial items={liveWork} locale={locale} />
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
        <Image className="odh-pageimg" src="/imagery/event-hall.webp" alt="Owl Day House" width={1920} height={1088} sizes="100vw" priority />
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
              <Button variant={locale === "en" ? "key" : "line"} asChild>
                <EmailLink location="contact-page">{t.emailCta}</EmailLink>
              </Button>
            </div>
          </div>
          <div>
            <h2>{t.messenger}</h2>
            <p>{t.messengerNote}</p>
            <div className="odh-cta">
              <MessengerCta location="contact-page" variant={locale === "en" ? "line" : "key"}>
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

/* News */

export function newsMeta(locale: Locale): Metadata {
  const t = getCopy(locale).news;
  return pageMeta({ locale, title: t.metaTitle, description: t.metaDescription, path: "/news/" });
}

function formatDate(locale: Locale, iso: string): string {
  return new Date(iso).toLocaleDateString(locale === "th" ? "th-TH" : "en-US", { year: "numeric", month: "long", day: "numeric" });
}

export function NewsView({ locale }: { locale: Locale }) {
  const t = getCopy(locale).news;
  const href = (path: string) => localeHref(locale, path);
  return (
    <main>
      <JsonLd data={[breadcrumbSchema(locale, t.title, "/news/"), blogSchema(locale)]} />
      <PageIntro label={t.label} title={t.title} lead={t.lead} />
      <section className="odh-wrap pb-24">
        <div className="odh-news">
          {getPosts(locale).map((post) => (
            <Link key={post.slug} href={href(`/news/${post.slug}/`)}>
              <span className="odh-mono">
                {formatDate(locale, post.datePublished)} · {t.read} {post.readingMinutes} {t.minutes}
              </span>
              <h3>{post.title}</h3>
              <ArrowRight size={18} />
            </Link>
          ))}
        </div>
      </section>
      <ContactClose locale={locale} location="news-close" />
    </main>
  );
}

export function articleMeta(locale: Locale, slug: string): Metadata {
  const post = getPost(locale, slug);
  if (!post) return {};
  const base = pageMeta({
    locale,
    title: post.title,
    description: post.description,
    path: `/news/${slug}/`,
    absoluteTitle: true,
    singleLanguage: !post.paired,
    image: `/og/${slug}.jpg`,
  });
  return {
    ...base,
    keywords: [...post.keywords],
    openGraph: {
      ...base.openGraph,
      type: "article",
      publishedTime: post.datePublished,
      modifiedTime: post.dateModified ?? post.datePublished,
    },
  };
}

export function ArticleView({ locale, slug }: { locale: Locale; slug: string }) {
  const post = getPost(locale, slug);
  const Body = bodies[slug];
  if (!post || (!post.markdown && !Body)) notFound();
  const t = getCopy(locale).news;
  const href = (path: string) => localeHref(locale, path);
  const others = getPosts(locale).filter((item) => item.slug !== slug);
  const related = [...others.filter((item) => item.service === post.service), ...others.filter((item) => item.service !== post.service)].slice(0, 3);

  return (
    <main>
      <JsonLd
        data={[
          breadcrumbSchema(locale, post.title, `/news/${slug}/`, { name: t.title, path: "/news/" }),
          articleSchema({
            locale,
            slug,
            title: post.title,
            description: post.description,
            datePublished: post.datePublished,
            dateModified: post.dateModified,
            keywords: post.keywords,
          }),
          ...(post.faq?.length ? [faqSchema(locale, post.faq)] : []),
        ]}
      />
      <article className="odh-article">
        <Link className="odh-link" href={href("/news/")}>
          <ArrowLeft size={16} /> {t.all}
        </Link>
        <p className="odh-mono mt-10">
          <time dateTime={post.datePublished}>{formatDate(locale, post.datePublished)}</time> · {t.read} {post.readingMinutes} {t.minutes}
        </p>
        <h1>{post.title}</h1>
        <Image className="mt-8 aspect-video w-full object-cover" src={post.image} alt={post.imageAlt} width={1600} height={896} sizes="(max-width: 800px) 100vw, 736px" priority />
        <Prose className="mt-8">
          {post.markdown ? <ArticleBody source={post.markdown} /> : Body ? <Body /> : null}
          {post.faq?.length ? (
            <>
              <h2>{t.faq}</h2>
              {post.faq.map(({ q, a }) => (
                <div key={q}>
                  <h3>{q}</h3>
                  <p>{a}</p>
                </div>
              ))}
            </>
          ) : null}
          <h2>{t.related}</h2>
          <ul>
            {related.map((item) => (
              <li key={item.slug}>
                <Link href={href(`/news/${item.slug}/`)}>{item.title}</Link>
              </li>
            ))}
          </ul>
        </Prose>
      </article>
      <ContactClose locale={locale} location={`article-${slug}`} />
    </main>
  );
}
