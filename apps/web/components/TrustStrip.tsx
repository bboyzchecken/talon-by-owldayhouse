import { SectionHeading } from "@odh/ui";
import { portfolio, trustedBy } from "@/content/portfolio";
import { PortfolioCard } from "./PortfolioCard";
import { Reveal } from "./Reveal";

const featured = portfolio.filter((item) => item.featured);

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
          {featured.map((item, i) => (
            <Reveal key={item.title} delay={i * 0.08}>
              <PortfolioCard item={item} />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
