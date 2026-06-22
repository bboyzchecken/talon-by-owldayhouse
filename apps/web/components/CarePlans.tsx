import { Check } from "lucide-react";
import { Badge, Button, Card, SectionHeading, cn } from "@odh/ui";
import { contact } from "@/content/site";
import { carePlans, firstMonthFree } from "@/content/packages";
import { Reveal } from "./Reveal";

export function CarePlans() {
  return (
    <section className="bg-paper">
      <div className="mx-auto max-w-6xl px-6 py-20">
        <SectionHeading
          eyebrow="แพ็กดูแลรายเดือน"
          title="ดูแลต่อเนื่อง ไม่ปล่อยให้พัง"
          subtitle={
            firstMonthFree ? "เดือนแรกฟรีทุกแพ็ก — ยกเลิกได้ ไม่ผูกมัด" : "เลือกระดับการดูแลที่เหมาะกับคุณ"
          }
        />
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {carePlans.map((plan, i) => (
            <Reveal key={plan.name} delay={i * 0.08} className="h-full">
              <Card className={cn("flex h-full flex-col", plan.highlighted && "ring-2 ring-gold")}>
                <div className="flex items-center justify-between">
                  <h3 className="font-display text-lg font-bold text-navy">{plan.name}</h3>
                  {plan.highlighted ? <Badge variant="gold">ยอดนิยม</Badge> : null}
                </div>
                <p className="mt-3">
                  <span className="font-display text-3xl font-bold text-navy">฿{plan.price}</span>
                  <span className="text-sm text-muted"> /เดือน</span>
                </p>
                <p className="mt-1 text-sm text-muted">{plan.blurb}</p>
                <ul className="mt-4 flex-1 space-y-2 text-sm text-muted">
                  {plan.features.map((f) => (
                    <li key={f} className="flex gap-2">
                      <Check size={16} className="mt-0.5 shrink-0 text-gold" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <Button variant={plan.highlighted ? "gold" : "ghost"} asChild className="mt-6 w-full">
                  <a href={contact.messenger} target="_blank" rel="noopener noreferrer">
                    เลือกแพ็กนี้
                  </a>
                </Button>
              </Card>
            </Reveal>
          ))}
        </div>
        <p className="mt-4 text-xs text-muted">* เงื่อนไขการแก้ไขไม่จำกัดเป็นไปตามที่ทีมงานกำหนด</p>
      </div>
    </section>
  );
}
