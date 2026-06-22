import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Badge, Button, SectionHeading } from "@odh/ui";
import { contact } from "@/content/site";
import { portfolio } from "@/content/portfolio";
import { pageMeta } from "@/lib/seo";
import { JsonLd } from "@/components/JsonLd";
import { breadcrumbSchema } from "@/lib/structured-data";
import { Reveal } from "@/components/Reveal";

export const metadata = pageMeta({
  title: "ผลงาน",
  description:
    "ผลงาน Owl Day House — งานเว็บไซต์ ระบบองค์กร และงานราชการ/มหาวิทยาลัย เช่น ระบบลงทะเบียน reg.tu.ac.th",
  path: "/work/",
});

export default function WorkPage() {
  return (
    <main className="mx-auto max-w-6xl px-6 py-20">
      <JsonLd data={breadcrumbSchema("ผลงาน", "/work/")} />
      <SectionHeading
        as="h1"
        eyebrow="ผลงาน"
        title="งานจริงที่เรารับผิดชอบ"
        subtitle="ตั้งแต่เว็บธุรกิจไปจนถึงระบบที่คนใช้จริงทั้งมหาวิทยาลัย"
      />
      <p className="mt-6 max-w-2xl text-muted">
        เราดันงานราชการและมหาวิทยาลัยขึ้นก่อน เพราะระบบที่ต้องรองรับผู้ใช้จำนวนมากในเวลาเดียวกัน
        คือบทพิสูจน์ว่าทีมเรารับงานจริง รับผิดชอบจริง และดูแลต่อได้ในระยะยาว
      </p>

      <div className="mt-12 grid gap-5 md:grid-cols-3">
        {portfolio.map((item, i) => (
          <Reveal key={item.title} delay={i * 0.08}>
            <article className="flex h-full flex-col rounded-2xl border border-line bg-white p-6 shadow-card">
              <Badge variant={i === 0 ? "gold" : "soft"}>{item.category}</Badge>
              <h2 className="mt-4 font-display text-lg font-bold text-navy">{item.title}</h2>
              <p className="mt-1 text-sm font-medium text-navy/70">{item.client}</p>
              <p className="mt-3 flex-1 text-sm text-muted">{item.result}</p>
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

      <div className="mt-12 rounded-2xl bg-navy px-8 py-10 text-center text-paper">
        <h2 className="font-display text-2xl font-bold">อยากให้เว็บหรือระบบของคุณอยู่ในนี้บ้างไหม?</h2>
        <p className="mx-auto mt-2 max-w-xl text-paper/80">
          เริ่มจากเว็บแรก ฿3,900 แล้วเติบโตขึ้นไปพร้อมทีมเดิม — ทักมาคุยกันได้เลย
        </p>
        <Button variant="gold" size="lg" className="mt-6" asChild>
          <a href={contact.messenger} target="_blank" rel="noopener noreferrer">
            เริ่มคุยกับเรา
          </a>
        </Button>
      </div>
    </main>
  );
}
