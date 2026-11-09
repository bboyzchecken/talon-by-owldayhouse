import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { JsonLd } from "@/components/JsonLd";
import { ContactClose, PageIntro } from "@/components/site/sections";
import { getCopy } from "@/content/copy";
import { publishedPosts } from "@/content/news";
import { pageMeta } from "@/lib/seo";
import { shareCard } from "@/lib/share-cards";
import { blogSchema, breadcrumbSchema } from "@/lib/structured-data";

const t = getCopy("th").news;

export const metadata = pageMeta({
  locale: "th",
  title: t.metaTitle,
  description: t.metaDescription,
  path: "/news/",
  singleLanguage: true,
  image: shareCard("news"),
});

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("th-TH", { year: "numeric", month: "long", day: "numeric" });
}

export default function NewsPage() {
  return (
    <main>
      <JsonLd data={[breadcrumbSchema("th", t.title, "/news/"), blogSchema]} />
      <PageIntro label={t.label} title={t.title} lead={t.lead} />
      <section className="odh-wrap pb-24">
        <div className="odh-news">
          {publishedPosts.map((post) => (
            <Link key={post.slug} href={`/news/${post.slug}/`}>
              <span className="odh-mono">
                {formatDate(post.datePublished)} · {t.read} {post.readingMinutes} {t.minutes}
              </span>
              <h3>{post.title}</h3>
              <ArrowRight size={18} />
            </Link>
          ))}
        </div>
      </section>
      <ContactClose locale="th" location="news-close" />
    </main>
  );
}
