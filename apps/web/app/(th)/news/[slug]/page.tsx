import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import { JsonLd } from "@/components/JsonLd";
import { Prose } from "@/components/Prose";
import { ContactClose } from "@/components/site/sections";
import { getCopy } from "@/content/copy";
import { getPost, posts } from "@/content/news";
import { bodies } from "@/content/news/bodies";
import { pageMeta } from "@/lib/seo";
import { articleSchema, breadcrumbSchema } from "@/lib/structured-data";

const t = getCopy("th").news;

export const dynamicParams = false;

export function generateStaticParams() {
  return posts.map((post) => ({ slug: post.slug }));
}

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) return {};
  const base = pageMeta({
    locale: "th",
    title: post.title,
    description: post.description,
    path: `/news/${slug}/`,
    absoluteTitle: true,
    singleLanguage: true,
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

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("th-TH", { year: "numeric", month: "long", day: "numeric" });
}

export default async function NewsArticlePage({ params }: Props) {
  const { slug } = await params;
  const post = getPost(slug);
  const Body = bodies[slug];
  if (!post || !Body) notFound();

  const path = `/news/${slug}/`;

  return (
    <main>
      <JsonLd
        data={[
          breadcrumbSchema("th", post.title, path, { name: t.title, path: "/news/" }),
          articleSchema({
            title: post.title,
            description: post.description,
            path,
            datePublished: post.datePublished,
            dateModified: post.dateModified,
            keywords: post.keywords,
          }),
        ]}
      />
      <article className="odh-article">
        <Link className="odh-link" href="/news/">
          <ArrowLeft size={16} /> {t.all}
        </Link>
        <p className="odh-mono mt-10">
          <time dateTime={post.datePublished}>{formatDate(post.datePublished)}</time> · {t.read} {post.readingMinutes} {t.minutes}
        </p>
        <h1>{post.title}</h1>
        <Prose className="mt-8">
          <Body />
        </Prose>
      </article>
      <ContactClose locale="th" location={`article-${slug}`} />
    </main>
  );
}
