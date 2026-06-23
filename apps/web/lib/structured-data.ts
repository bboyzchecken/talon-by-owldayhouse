import { company, social } from "@/content/site";
import { SITE_NAME, SITE_URL } from "./seo";

const LOGO_URL = `${SITE_URL}/brand/ODH_Banding.svg`;
const sameAs = [social.facebook, social.instagram, social.linkedin];

export const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: SITE_NAME,
  legalName: company.legalName,
  url: SITE_URL,
  logo: LOGO_URL,
  sameAs,
};

export const localBusinessSchema = {
  "@context": "https://schema.org",
  "@type": "ProfessionalService",
  name: company.legalName,
  url: SITE_URL,
  logo: LOGO_URL,
  image: `${SITE_URL}/opengraph-image`,
  telephone: "+66924552450",
  priceRange: "฿฿",
  address: {
    "@type": "PostalAddress",
    streetAddress: company.address.line,
    addressLocality: "สารภี",
    addressRegion: "เชียงใหม่",
    postalCode: company.address.postcode,
    addressCountry: "TH",
  },
  // TODO: confirm exact coordinates of the office (approx. Saraphi, Chiang Mai).
  geo: { "@type": "GeoCoordinates", latitude: 18.71, longitude: 99.04 },
  // Registered office is Chiang Mai, but the team serves Bangkok + nationwide.
  areaServed: ["เชียงใหม่", "กรุงเทพมหานคร", "ประเทศไทย"],
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

export const websiteSchema = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: SITE_NAME,
  url: SITE_URL,
  inLanguage: "th-TH",
};

export const talonServiceSchema = {
  "@context": "https://schema.org",
  "@type": "Service",
  name: "Talon — เว็บไซต์โปร เสร็จไวใน 5 วัน",
  serviceType: "รับทำเว็บไซต์",
  provider: { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
  areaServed: "TH",
  description: "บริการทำเว็บไซต์เสร็จไวใน 5 วัน เริ่มต้น 3,900 บาท พร้อมทีมคนไทยดูแลต่อ",
  offers: { "@type": "Offer", price: "3900", priceCurrency: "THB", url: `${SITE_URL}/talon/` },
};

/** Home > Page breadcrumb. */
export function breadcrumbSchema(name: string, path: string) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "หน้าแรก", item: `${SITE_URL}/` },
      { "@type": "ListItem", position: 2, name, item: `${SITE_URL}${path}` },
    ],
  };
}

/** FAQPage schema — eligible for the FAQ rich result in Google search. */
export function faqSchema(faqs: readonly { q: string; a: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map(({ q, a }) => ({
      "@type": "Question",
      name: q,
      acceptedAnswer: { "@type": "Answer", text: a },
    })),
  };
}

interface ArticleSchemaInput {
  title: string;
  description: string;
  path: string; // e.g. "/news/slug/"
  datePublished: string; // ISO date
  dateModified?: string;
}

/** BlogPosting schema for /news articles. */
export function articleSchema({
  title,
  description,
  path,
  datePublished,
  dateModified,
}: ArticleSchemaInput) {
  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: title,
    description,
    inLanguage: "th-TH",
    mainEntityOfPage: `${SITE_URL}${path}`,
    url: `${SITE_URL}${path}`,
    datePublished,
    dateModified: dateModified ?? datePublished,
    image: `${SITE_URL}/og.png`,
    author: { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
    publisher: {
      "@type": "Organization",
      name: SITE_NAME,
      url: SITE_URL,
      logo: { "@type": "ImageObject", url: LOGO_URL },
    },
  };
}
