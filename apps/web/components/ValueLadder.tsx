import { ArrowUpRight, Check } from "lucide-react";
import { SectionHeading, cn } from "@odh/ui";
import { ladder } from "@/content/ladder";
import { Reveal } from "./Reveal";

// Ascending staircase on desktop — leftmost step sits lowest, climbing right.
const offsets = ["lg:mt-16", "lg:mt-10", "lg:mt-4", "lg:mt-0"];

export function ValueLadder() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-20 sm:py-28">
      <SectionHeading
        eyebrow="บันได 4 ขั้น"
        title="เริ่มเล็ก แล้วโตไปกับเรา"
        subtitle="เลือกขั้นที่ใช่วันนี้ แล้วไต่ขึ้นได้เรื่อยๆ โดยไม่ต้องย้ายเจ้า — ทีมเดิม โครงเดิม ต่อยอดได้"
      />
      <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
        {ladder.map((s, i) => (
          <Reveal key={s.step} delay={i * 0.08} className={cn("h-full", offsets[i])}>
            <div className="flex h-full flex-col rounded-2xl border border-line bg-white p-6 shadow-card transition-transform hover:-translate-y-1">
              <div className="flex items-start justify-between">
                <span className="font-display text-3xl font-bold text-gold">{s.step}</span>
                <ArrowUpRight size={22} className="text-line" />
              </div>
              <h3 className="mt-4 font-display text-lg font-bold text-navy">{s.name}</h3>
              <p className="mt-1 text-sm text-muted">{s.tagline}</p>
              <p className="mt-5 text-xs font-semibold uppercase tracking-wide text-muted">เริ่มต้น</p>
              <p className="font-display text-2xl font-bold text-navy">{s.priceFrom}</p>
              <ul className="mt-4 space-y-2 text-sm text-muted">
                {s.features.map((f) => (
                  <li key={f} className="flex gap-2">
                    <Check size={16} className="mt-0.5 shrink-0 text-gold" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
