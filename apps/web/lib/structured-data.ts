import { company, social } from "@/content/site";
import { ladder } from "@/content/ladder";
import { posts } from "@/content/news";
import { services } from "@/content/services";
import { OG_IMAGE_PATH, SITE_NAME, SITE_URL } from "./seo";

const LOGO_URL = `${SITE_URL}/brand/ODH_Banding.svg`;
const OG_IMAGE_URL = `${SITE_URL}${OG_IMAGE_PATH}`;
const BUSINESS_ID = `${SITE_URL}/#organization`;
const WEBSITE_ID = `${SITE_URL}/#website`;
const sameAs = [social.facebook, social.instagram, social.linkedin];
const areaServed = ["เชียงใหม่", "กรุงเทพมหานคร", "ประเทศไทย"];

/** Reference to the single business entity, so Google merges it across pages. */
const businessRef = {
  "@type": "ProfessionalService",
  "@id": BUSINESS_ID,
  name: SITE_NAME,
  url: SITE_URL,
};

// One entity on purpose: ProfessionalService is both an Organization and a
// LocalBusiness, and two separate entities gave Google two names for the company.
export const businessSchema = {
  "@context": "https://schema.org",
  "@type": "ProfessionalService",
  "@id": BUSINESS_ID,
  name: SITE_NAME,
  legalName: company.legalName,
  alternateName: [company.legalName, company.brandNameEn, "ODH"],
  description: "ซอฟต์แวร์เฮาส์เชียงใหม่ รับทำเว็บไซต์ เว็บแอป และระบบองค์กร",
  url: SITE_URL,
  logo: LOGO_URL,
  image: OG_IMAGE_URL,
  telephone: "+66924552450",
  priceRange: "฿฿",
  address: {
    "@type": "PostalAddress",
    streetAddress: `${company.address.line} ต.ไชยสถาน`,
    addressLocality: "สารภี",
    addressRegion: company.address.city,
    postalCode: company.address.postcode,
    addressCountry: "TH",
  },
  // TODO: confirm exact coordinates of the office (approx. Saraphi, Chiang Mai).
  geo: { "@type": "GeoCoordinates", latitude: 18.71, longitude: 99.04 },
  // Registered office is Chiang Mai, but the team serves Bangkok + nationwide.
  areaServed,
  contactPoint: {
    "@type": "ContactPoint",
    telephone: "+66924552450",
    contactType: "customer service",
    availableLanguage: ["th"],
    areaServed: "TH",
  },
  knowsAbout: ["รับทำเว็บไซต์", "พัฒนาเว็บแอป", "โมบายแอป", "ระบบองค์กร", "SEO", "งานกราฟิก"],
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
  "@id": WEBSITE_ID,
  name: SITE_NAME,
  url: SITE_URL,
  inLanguage: "th-TH",
  publisher: { "@id": BUSINESS_ID },
};

export const talonServiceSchema = {
  "@context": "https://schema.org",
  "@type": "Service",
  name: "Talon — เว็บไซต์โปร เสร็จไวใน 5 วัน",
  serviceType: "รับทำเว็บไซต์",
  url: `${SITE_URL}/talon/`,
  provider: businessRef,
  areaServed: "TH",
  description: "บริการทำเว็บไซต์เสร็จไวใน 5 วัน เริ่มต้น 3,900 บาท พร้อมทีมงานคนไทยดูแลต่อ",
  offers: {
    "@type": "Offer",
    price: "3900",
    priceCurrency: "THB",
    availability: "https://schema.org/InStock",
    url: `${SITE_URL}/talon/`,
  },
};

/** One Service per card on /services. */
export const servicesSchema = services.map((service) => ({
  "@context": "https://schema.org",
  "@type": "Service",
  name: service.title,
  description: service.blurb,
  url: `${SITE_URL}/services/`,
  provider: businessRef,
  areaServed,
}));

/** Published price tiers for /packages. Tiers without a fixed starting price are left out. */
export const packagesSchema = {
  "@context": "https://schema.org",
  "@type": "OfferCatalog",
  name: "แพ็กเกจรับทำเว็บไซต์และระบบ",
  url: `${SITE_URL}/packages/`,
  itemListElement: ladder
    .filter((tier) => /\d/.test(tier.priceFrom))
    .map((tier) => ({
      "@type": "Offer",
      priceCurrency: "THB",
      price: tier.priceFrom.replace(/\D/g, ""),
      priceSpecification: {
        "@type": "PriceSpecification",
        minPrice: tier.priceFrom.replace(/\D/g, ""),
        priceCurrency: "THB",
      },
      itemOffered: {
        "@type": "Service",
        name: tier.name,
        description: tier.tagline,
        provider: businessRef,
      },
    })),
};

/** Article index for /news. */
export const blogSchema = {
  "@context": "https://schema.org",
  "@type": "Blog",
  name: `บทความ ${SITE_NAME}`,
  url: `${SITE_URL}/news/`,
  inLanguage: "th-TH",
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

/** Home > [parent] > Page breadcrumb. */
export function breadcrumbSchema(name: string, path: string, parent?: BreadcrumbParent) {
  const trail = [...(parent ? [parent] : []), { name, path }];
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "หน้าแรก", item: `${SITE_URL}/` },
      ...trail.map((crumb, i) => ({
        "@type": "ListItem",
        position: i + 2,
        name: crumb.name,
        item: `${SITE_URL}${crumb.path}`,
      })),
    ],
  };
}

/** FAQPage schema. Google limits the FAQ rich result to gov/health sites, but the markup still describes the page. */
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
  keywords?: readonly string[];
}

/** BlogPosting schema for /news articles. */
export function articleSchema({
  title,
  description,
  path,
  datePublished,
  dateModified,
  keywords,
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
    image: OG_IMAGE_URL,
    keywords: keywords?.join(", "),
    isPartOf: { "@id": WEBSITE_ID },
    author: businessRef,
    publisher: { ...businessRef, logo: { "@type": "ImageObject", url: LOGO_URL } },
  };
}
