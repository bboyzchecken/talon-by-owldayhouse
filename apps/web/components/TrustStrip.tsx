import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Badge, SectionHeading } from "@odh/ui";
import { portfolio, trustedBy } from "@/content/portfolio";
import { Reveal } from "./Reveal";

export function TrustStrip() {
  return (
    <section className="bg-paper">
      <div className="mx-auto max-w-6xl px-6 py-20 sm:py-28">
        <SectionHeading
          eyebrow="ผลงาน & ความไว้วางใจ"
          title="งานจริงที่เรารับผิดชอบ"
          subtitle="ดันงานราชการ/มหาวิทยาลัยขึ้นก่อน — เพราะระบบที่คนใช้จริงทั้งมหาวิทยาลัยคือบทพิสูจน์"
        />

        <div className="mt-8 flex flex-wrap gap-2">
          {trustedBy.map((name) => (
            <span
              key={name}
              className="rounded-full border border-line bg-white px-4 py-1.5 font-display text-sm text-muted"
            >
              {name}
            </span>
          ))}
        </div>

        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {portfolio.map((item, i) => (
            <Reveal key={item.title} delay={i * 0.08}>
              <article className="flex h-full flex-col rounded-2xl border border-line bg-white p-6 shadow-card">
                <Badge variant={i === 0 ? "gold" : "soft"}>{item.category}</Badge>
                <h3 className="mt-4 font-display text-lg font-bold text-navy">{item.title}</h3>
                <p className="mt-1 text-sm font-medium text-navy/70">{item.client}</p>
                <p className="mt-3 text-sm text-muted">{item.result}</p>
                {item.url ? (
                  <Link
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-4 inline-flex items-center gap-1 font-display text-sm font-semibold text-gold hover:underline"
                  >
                    ดูระบบจริง <ArrowUpRight size={16} />
                  </Link>
                ) : null}
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
