import { getCopy } from "@/content/copy";
import { company, social } from "@/content/site";
import { posts } from "@/content/news";
import { getServices } from "@/content/services";
import { localeHref, type Locale } from "./i18n";
import { OG_IMAGE_PATH, SITE_NAME, SITE_URL } from "./seo";

const LOGO_URL = `${SITE_URL}/brand/owl-logo.svg`;
const OG_IMAGE_URL = `${SITE_URL}${OG_IMAGE_PATH}`;
const BUSINESS_ID = `${SITE_URL}/#organization`;
const WEBSITE_ID = `${SITE_URL}/#website`;
const sameAs = [social.facebook, social.instagram, social.linkedin];
const inLanguage: Record<Locale, string> = { th: "th-TH", en: "en-US" };

const areaServed: Record<Locale, string[]> = {
  th: ["กรุงเทพมหานคร", "ประเทศไทย", "ทั่วโลก"],
  en: ["Bangkok", "Thailand", "Worldwide"],
};

const businessDescription: Record<Locale, string> = {
  th: "ทีมจากกรุงเทพที่ทำได้ตั้งแต่เว็บไซต์และซอฟต์แวร์ กิจกรรมหน้างานอีเวนต์ KOL ไปจนถึงการตลาดดิจิทัล",
  en: "A Bangkok-based team for software, event experiences, KOL campaigns and digital marketing.",
};

/** Reference to the single business entity, so Google merges it across pages. */
const businessRef = {
  "@type": "ProfessionalService",
  "@id": BUSINESS_ID,
  name: SITE_NAME,
  url: SITE_URL,
};

export function businessSchema(locale: Locale) {
  return {
    "@context": "https://schema.org",
    "@type": "ProfessionalService",
    "@id": BUSINESS_ID,
    name: SITE_NAME,
    legalName: locale === "th" ? company.legalName : company.legalNameEn,
    alternateName: [company.legalName, company.legalNameEn, company.brandNameEn, "ODH"],
    description: businessDescription[locale],
    url: SITE_URL,
    logo: LOGO_URL,
    image: OG_IMAGE_URL,
    telephone: "+66924552450",
    email: "owldayhouse@gmail.com",
    // Registered office. Replace with the Bangkok office once its address is confirmed.
    address: {
      "@type": "PostalAddress",
      streetAddress: locale === "th" ? `${company.address.line} ต.ไชยสถาน` : "Room B1, 1st Floor, TNC Building, 172 Chai Sathan",
      addressLocality: locale === "th" ? "สารภี" : "Saraphi",
      addressRegion: locale === "th" ? company.address.city : "Chiang Mai",
      postalCode: company.address.postcode,
      addressCountry: "TH",
    },
    areaServed: areaServed[locale],
    contactPoint: {
      "@type": "ContactPoint",
      telephone: "+66924552450",
      email: "owldayhouse@gmail.com",
      contactType: "customer service",
      availableLanguage: ["th", "en"],
      areaServed: "TH",
    },
    knowsAbout: getServices(locale).map((service) => service.title),
    sameAs,
    openingHoursSpecification: [
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
        opens: "09:00",
        closes: "18:00",
      },
    ],
  };
}

export function websiteSchema(locale: Locale) {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": WEBSITE_ID,
    name: SITE_NAME,
    url: SITE_URL,
    inLanguage: inLanguage[locale],
    publisher: { "@id": BUSINESS_ID },
  };
}

/** One Service per offering. */
export function servicesSchema(locale: Locale) {
  return getServices(locale).map((service) => ({
    "@context": "https://schema.org",
    "@type": "Service",
    name: service.title,
    description: service.blurb,
    url: `${SITE_URL}${localeHref(locale, `/services/${service.slug}/`)}`,
    provider: businessRef,
    areaServed: areaServed[locale],
  }));
}

/** Article index for /news. */
export const blogSchema = {
  "@context": "https://schema.org",
  "@type": "Blog",
  name: `บทความ ${SITE_NAME}`,
  url: `${SITE_URL}/news/`,
  inLanguage: inLanguage.th,
  publisher: businessRef,
  blogPost: posts.map((post) => ({
    "@type": "BlogPosting",
    headline: post.title,
    url: `${SITE_URL}/news/${post.slug}/`,
    datePublished: post.datePublished,
  })),
};

interface BreadcrumbParent {
  name: string;
  path: string;
}

/** Home > [parent] > Page breadcrumb. Paths exclude the locale prefix. */
export function breadcrumbSchema(locale: Locale, name: string, path: string, parent?: BreadcrumbParent) {
  const trail = [...(parent ? [parent] : []), { name, path }];
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: getCopy(locale).breadcrumbHome, item: `${SITE_URL}${localeHref(locale, "/")}` },
      ...trail.map((crumb, index) => ({
        "@type": "ListItem",
        position: index + 2,
        name: crumb.name,
        item: `${SITE_URL}${localeHref(locale, crumb.path)}`,
      })),
    ],
  };
}

interface ArticleSchemaInput {
  title: string;
  description: string;
  path: string; // e.g. "/news/slug/"
  datePublished: string; // ISO date
  dateModified?: string;
  keywords?: readonly string[];
}

/** BlogPosting schema for /news articles. */
export function articleSchema({ title, description, path, datePublished, dateModified, keywords }: ArticleSchemaInput) {
  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: title,
    description,
    inLanguage: inLanguage.th,
    mainEntityOfPage: `${SITE_URL}${path}`,
    url: `${SITE_URL}${path}`,
    datePublished,
    dateModified: dateModified ?? datePublished,
    image: OG_IMAGE_URL,
    keywords: keywords?.join(", "),
    isPartOf: { "@id": WEBSITE_ID },
    author: businessRef,
    publisher: { ...businessRef, logo: { "@type": "ImageObject", url: LOGO_URL } },
  };
}
