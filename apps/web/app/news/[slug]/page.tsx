import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import { getPost, posts } from "@/content/news";
import { bodies } from "@/content/news/bodies";
import { pageMeta } from "@/lib/seo";
import { JsonLd } from "@/components/JsonLd";
import { Prose } from "@/components/Prose";
import { ClosingCTA } from "@/components/ClosingCTA";
import { articleSchema, breadcrumbSchema } from "@/lib/structured-data";

export const dynamicParams = false;

export function generateStaticParams() {
  return posts.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) return {};
  const base = pageMeta({
    title: post.title,
    description: post.description,
    path: `/news/${slug}/`,
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
  return new Date(iso).toLocaleDateString("th-TH", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default async function NewsArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = getPost(slug);
  const Body = bodies[slug];
  if (!post || !Body) notFound();

  const path = `/news/${slug}/`;
  const others = posts.filter((p) => p.slug !== slug).slice(0, 2);

  return (
    <main>
      <JsonLd
        data={[
          breadcrumbSchema(post.title, path),
          articleSchema({
            title: post.title,
            description: post.description,
            path,
            datePublished: post.datePublished,
            dateModified: post.dateModified,
          }),
        ]}
      />

      <article className="mx-auto max-w-2xl px-6 py-16 sm:py-20">
        <Link
          href="/news/"
          className="inline-flex items-center gap-1.5 font-display text-sm text-muted transition-colors hover:text-navy"
        >
          <ArrowLeft size={16} /> บทความทั้งหมด
        </Link>

        <p className="mt-8 font-display text-xs uppercase tracking-wider text-gold">
          {formatDate(post.datePublished)} · อ่าน {post.readingMinutes} นาที
        </p>
        <h1 className="mt-3 font-display text-3xl font-bold leading-tight text-navy sm:text-4xl">
          {post.title}
        </h1>
        <p className="mt-4 text-lg leading-relaxed text-muted">{post.description}</p>

        <hr className="my-8 border-line" />

        <Prose>
          <Body />
        </Prose>
      </article>

      {others.length > 0 ? (
        <section className="bg-paper">
          <div className="mx-auto max-w-2xl px-6 pb-16">
            <h2 className="font-display text-lg font-bold text-navy">อ่านต่อ</h2>
            <ul className="mt-4 space-y-3">
              {others.map((p) => (
                <li key={p.slug}>
                  <Link
                    href={`/news/${p.slug}/`}
                    className="font-display text-navy underline decoration-gold decoration-2 underline-offset-4 transition-colors hover:text-gold"
                  >
                    {p.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}

      <ClosingCTA />
    </main>
  );
}
