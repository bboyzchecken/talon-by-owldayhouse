import { AlertTriangle, Check, ShieldCheck, Sparkles, Users } from "lucide-react";
import { Badge, Button, Card, SectionHeading, cn } from "@odh/ui";
import { contact } from "@/content/site";
import { carePlans, firstMonthFree, talon } from "@/content/packages";
import { ClosingCTA } from "@/components/ClosingCTA";
import { Reveal } from "@/components/Reveal";
import { JsonLd } from "@/components/JsonLd";
import { pageMeta } from "@/lib/seo";
import { breadcrumbSchema, talonServiceSchema } from "@/lib/structured-data";

export const metadata = pageMeta({
  title: "Talon — เว็บไซต์ ฿3,900 เสร็จใน 5 วัน",
  description:
    "Talon เว็บไซต์โปร เสร็จไวใน 5 วัน เริ่มต้น ฿3,900 — ทีมคนไทยทำให้ครบ ดูแลต่อจริง แพ็กดูแลรายเดือนเดือนแรกฟรี",
  path: "/talon/",
});

const problems = [
  "เว็บสวยตอนแรก แต่พอจะแก้เองกลับทำไม่เป็น",
  "พังขึ้นมาทีไร ไม่มีใครช่วย ต้องนั่งงมเอง",
  "เนื้อหาดูดีแต่ Google ไม่เจอ ลูกค้าหาไม่เจอ",
  "เสียเวลาเป็นเดือน สุดท้ายเว็บก็ไม่เสร็จ",
];

const solutions = [
  { icon: Sparkles, title: "เสร็จไวใน 5 วัน", text: "ทำงานเป็นระบบ ส่งมอบไวใน 5 วันทำการ ไม่ต้องรอเป็นเดือน" },
  { icon: Users, title: "มีคนไทยดูแล", text: "ทีมงานคนไทยปรับแก้ ตอบแชท ดูแลต่อเนื่อง ไม่ปล่อยให้พังเอง" },
  { icon: ShieldCheck, title: "ไม่พังกลางทาง", text: "บริษัทจดทะเบียน ออกใบกำกับภาษีได้ มีคนรับผิดชอบจริง" },
];

export default function TalonPage() {
  return (
    <main>
      <JsonLd data={[breadcrumbSchema("Talon", "/talon/"), talonServiceSchema]} />
      {/* hero */}
      <section className="relative overflow-hidden bg-navy text-paper">
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-gradient-to-b from-navy to-navy-deep" />
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-[-120px] h-[440px] w-[440px] -translate-x-1/2 rounded-full bg-gold/20 blur-[120px]"
        />
        <div className="relative mx-auto max-w-4xl px-6 py-24 text-center sm:py-32">
          <Badge variant="gold">NEW · Talon</Badge>
          <h1 className="mt-5 font-display text-4xl font-bold leading-tight sm:text-5xl">
            เว็บไซต์โปร <span className="text-gold">เสร็จไวใน 5 วัน</span>
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-lg text-paper/80">
            เริ่มต้น {talon.price} — ทีมคนไทยทำให้เสร็จไว ครบ จบ พร้อมดูแลต่อ
          </p>
          <div className="mt-8 flex justify-center">
            <Button variant="gold" size="lg" asChild>
              <a href={contact.messenger} target="_blank" rel="noopener noreferrer">
                เริ่มเลย {talon.price}
              </a>
            </Button>
          </div>
        </div>
      </section>

      {/* problem */}
      <section className="mx-auto max-w-5xl px-6 py-20">
        <SectionHeading eyebrow="ปัญหา" title="อยากมีเว็บโปร แต่เจอแบบนี้ไหม?" />
        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          {problems.map((p, i) => (
            <Reveal key={p} delay={i * 0.06}>
              <Card className="flex h-full items-start gap-3">
                <AlertTriangle size={20} className="mt-0.5 shrink-0 text-gold" />
                <p className="text-muted">{p}</p>
              </Card>
            </Reveal>
          ))}
        </div>
      </section>

      {/* solution */}
      <section className="bg-paper">
        <div className="mx-auto max-w-5xl px-6 py-20">
          <SectionHeading
            eyebrow="ทางออก"
            title="เสร็จไว ดูแลต่อ โดยทีมคนไทย"
            subtitle="Talon ทำให้คุณได้เว็บโปร เร็ว คุ้ม และมีทีมดูแลต่อจริง — จบครบในที่เดียว"
          />
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {solutions.map(({ icon: Icon, title, text }, i) => (
              <Reveal key={title} delay={i * 0.08}>
                <Card className="h-full">
                  <span className="flex h-11 w-11 items-center justify-center rounded-full bg-gold-soft text-navy">
                    <Icon size={22} />
                  </span>
                  <h3 className="mt-4 font-display text-lg font-bold text-navy">{title}</h3>
                  <p className="mt-1 text-sm text-muted">{text}</p>
                </Card>
              </Reveal>
            ))}
          </div>
          <p className="mt-8 max-w-2xl text-sm text-muted">
            เบื้องหลังเราใช้เครื่องมือและเทคโนโลยีทันสมัยช่วยให้งานเร็วและคุ้มขึ้น — แต่คนไทยเป็นผู้ออกแบบ คุมงาน และดูแลคุณจริงทุกขั้นตอน
          </p>
        </div>
      </section>

      {/* what you get */}
      <section className="mx-auto max-w-5xl px-6 py-20">
        <SectionHeading
          eyebrow="สิ่งที่ได้"
          title={`${talon.name} — ${talon.price}`}
          subtitle={talon.period}
        />
        <Card className="mt-8">
          <ul className="grid gap-3 sm:grid-cols-2">
            {talon.includes.map((item) => (
              <li key={item} className="flex items-start gap-2.5">
                <Check size={18} className="mt-0.5 shrink-0 text-gold" />
                <span className="text-navy">{item}</span>
              </li>
            ))}
          </ul>
          <Button variant="gold" size="lg" asChild className="mt-8">
            <a href={contact.messenger} target="_blank" rel="noopener noreferrer">
              เริ่มเลย {talon.price}
            </a>
          </Button>
        </Card>
      </section>

      {/* care plans */}
      <section className="bg-paper">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <SectionHeading
            eyebrow="แพ็กดูแลรายเดือน"
            title="ดูแลต่อเนื่อง ไม่ปล่อยให้พัง"
            subtitle={firstMonthFree ? "เดือนแรกฟรีทุกแพ็ก — ยกเลิกได้ ไม่ผูกมัด" : "เลือกระดับการดูแลที่เหมาะกับคุณ"}
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
                  <Button
                    variant={plan.highlighted ? "gold" : "ghost"}
                    asChild
                    className="mt-6 w-full"
                  >
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

      {/* trust */}
      <section className="mx-auto max-w-5xl px-6 py-20">
        <SectionHeading
          eyebrow="ทำไมต้อง ODH"
          title="น่าเชื่อถือตั้งแต่เว็บแรก"
          subtitle="ไม่ใช่ฟรีแลนซ์หายตัว — เราเป็นบริษัทจริงที่รับงานระดับองค์กรและราชการ"
        />
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          <Card>
            <h3 className="font-display text-base font-bold text-navy">บริษัทจดทะเบียน</h3>
            <p className="mt-1 text-sm text-muted">บริษัท อาวล์ เดย์ เฮ้าส์ จำกัด เชียงใหม่</p>
          </Card>
          <Card>
            <h3 className="font-display text-base font-bold text-navy">ออกใบกำกับภาษีได้</h3>
            <p className="mt-1 text-sm text-muted">เบิกจ่ายในนามบริษัท/หน่วยงานได้</p>
          </Card>
          <Card>
            <h3 className="font-display text-base font-bold text-navy">ผลงานระดับมหาวิทยาลัย</h3>
            <p className="mt-1 text-sm text-muted">เช่น ระบบลงทะเบียน reg.tu.ac.th</p>
          </Card>
        </div>
      </section>

      <ClosingCTA />
    </main>
  );
}
