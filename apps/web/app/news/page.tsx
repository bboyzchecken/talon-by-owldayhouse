import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Card, SectionHeading } from "@odh/ui";
import { posts } from "@/content/news";
import { pageMeta } from "@/lib/seo";
import { JsonLd } from "@/components/JsonLd";
import { Reveal } from "@/components/Reveal";
import { breadcrumbSchema } from "@/lib/structured-data";

export const metadata = pageMeta({
  title: "บทความ & ความรู้ทำเว็บไซต์",
  description:
    "บทความจาก Owl Day House — ความรู้เรื่องทำเว็บไซต์ ราคา และการตลาดออนไลน์สำหรับธุรกิจและ SME เชียงใหม่",
  path: "/news/",
});

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("th-TH", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default function NewsPage() {
  return (
    <main className="mx-auto max-w-5xl px-6 py-20">
      <JsonLd data={breadcrumbSchema("บทความ", "/news/")} />
      <SectionHeading
        as="h1"
        eyebrow="บทความ"
        title="ความรู้ทำเว็บไซต์ & การตลาดออนไลน์"
        subtitle="เขียนจากงานจริงโดยทีม Owl Day House — เน้นเรื่องที่ธุรกิจและ SME เชียงใหม่ใช้ได้จริง"
      />

      <div className="mt-12 grid gap-5 sm:grid-cols-2">
        {posts.map((post, i) => (
          <Reveal key={post.slug} delay={i * 0.08}>
            <Link href={`/news/${post.slug}/`} className="group block h-full">
              <Card className="flex h-full flex-col transition-shadow hover:shadow-glow">
                <p className="font-display text-xs uppercase tracking-wider text-gold">
                  {formatDate(post.datePublished)} · อ่าน {post.readingMinutes} นาที
                </p>
                <h2 className="mt-3 font-display text-xl font-bold leading-snug text-navy">
                  {post.title}
                </h2>
                <p className="mt-3 flex-1 text-sm leading-relaxed text-muted">
                  {post.description}
                </p>
                <span className="mt-5 inline-flex items-center gap-1.5 font-display text-sm font-semibold text-navy transition-colors group-hover:text-gold">
                  อ่านต่อ
                  <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />
                </span>
              </Card>
            </Link>
          </Reveal>
        ))}
      </div>
    </main>
  );
}
