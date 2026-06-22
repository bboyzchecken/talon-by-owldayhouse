import Image from "next/image";
import { Check } from "lucide-react";
import { Button, Card, SectionHeading } from "@odh/ui";
import { contact } from "@/content/site";
import { services } from "@/content/services";
import { pageMeta } from "@/lib/seo";
import { JsonLd } from "@/components/JsonLd";
import { breadcrumbSchema } from "@/lib/structured-data";
import { Reveal } from "@/components/Reveal";

export const metadata = pageMeta({
  title: "บริการของเรา",
  description:
    "รับทำเว็บไซต์ เว็บแอป ระบบองค์กร และงานกราฟิกในเชียงใหม่ — ทีมคนไทยดูแลตั้งแต่ออกแบบจนถึงหลังส่งมอบ",
  path: "/services/",
});

export default function ServicesPage() {
  return (
    <main className="mx-auto max-w-6xl px-6 py-20">
      <JsonLd data={breadcrumbSchema("บริการ", "/services/")} />
      <SectionHeading
        as="h1"
        eyebrow="บริการ"
        title="เราทำอะไร"
        subtitle="เว็บไซต์ · เว็บ/โมบายแอป · ระบบองค์กร · งานกราฟิก — ครบในทีมเดียว"
      />
      <p className="mt-6 max-w-2xl text-muted">
        Owl Day House รับทำเว็บไซต์และพัฒนาระบบในเชียงใหม่ ตั้งแต่เว็บบริษัทหน้าเดียว ไปจนถึงเว็บแอปและระบบองค์กรขนาดใหญ่
        จุดเด่นคือเริ่มเล็กได้ แล้วต่อยอดไปกับทีมเดิม ไม่ต้องย้ายเจ้าให้ปวดหัว
      </p>

      <div className="mt-12 grid gap-5 sm:grid-cols-2">
        {services.map((service, i) => (
          <Reveal key={service.slug} delay={i * 0.06}>
            <Card className="flex h-full gap-5">
              <Image
                src={service.illustration}
                alt={`บริการ${service.title}`}
                width={72}
                height={72}
                className="shrink-0"
              />
              <div>
                <h2 className="font-display text-xl font-bold text-navy">{service.title}</h2>
                <p className="mt-1 text-sm text-muted">{service.blurb}</p>
                <ul className="mt-3 space-y-1.5 text-sm text-muted">
                  {service.points.map((point) => (
                    <li key={point} className="flex gap-2">
                      <Check size={16} className="mt-0.5 shrink-0 text-gold" />
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </Card>
          </Reveal>
        ))}
      </div>

      <div className="mt-12 rounded-2xl border border-line bg-white p-8 text-center shadow-card">
        <h2 className="font-display text-2xl font-bold text-navy">ไม่แน่ใจว่าควรเริ่มตรงไหน?</h2>
        <p className="mx-auto mt-2 max-w-xl text-muted">
          ทักมาเล่าโจทย์ให้ฟัง เดี๋ยวทีมคนไทยแนะนำตรงๆ ว่าธุรกิจคุณควรเริ่มที่บริการไหนให้คุ้มที่สุด
        </p>
        <Button variant="gold" size="lg" className="mt-6" asChild>
          <a href={contact.messenger} target="_blank" rel="noopener noreferrer">
            ปรึกษาเราเลย
          </a>
        </Button>
      </div>
    </main>
  );
}
