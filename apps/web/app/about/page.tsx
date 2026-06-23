import Image from "next/image";
import { Building2, FileCheck, MapPin, Users } from "lucide-react";
import { Button, Card, SectionHeading } from "@odh/ui";
import { company, contact } from "@/content/site";
import { pageMeta } from "@/lib/seo";
import { JsonLd } from "@/components/JsonLd";
import { breadcrumbSchema } from "@/lib/structured-data";
import { Reveal } from "@/components/Reveal";

export const metadata = pageMeta({
  title: "เราคือใคร",
  description:
    "Owl Day House ซอฟต์แวร์เฮาส์เชียงใหม่ บริษัทจดทะเบียน ออกใบกำกับภาษีได้ มีผลงานจริงทั้งเว็บและระบบองค์กร",
  path: "/about/",
});

const reasons = [
  { icon: Building2, title: "บริษัทจดทะเบียน", text: `${company.legalName} ตั้งอยู่ที่เชียงใหม่ มีตัวตนจริง ตรวจสอบได้` },
  { icon: FileCheck, title: "ออกใบกำกับภาษีได้", text: "เบิกจ่ายในนามบริษัทหรือหน่วยงานได้ สะดวกกับงานองค์กรและราชการ" },
  { icon: Users, title: "ทีมคนไทยดูแลต่อ", text: "คุยภาษาเดียวกัน แก้ไขไว ดูแลต่อเนื่อง ไม่หายตัวหลังส่งงาน" },
  { icon: MapPin, title: "ผลงานระดับมหาวิทยาลัย", text: "รับงานที่คนใช้จริงจำนวนมาก เช่น ระบบลงทะเบียน reg.tu.ac.th" },
];

export default function AboutPage() {
  return (
    <main className="mx-auto max-w-5xl px-6 py-20">
      <JsonLd data={breadcrumbSchema("เราคือใคร", "/about/")} />
      <SectionHeading
        as="h1"
        eyebrow="เกี่ยวกับเรา"
        title="ซอฟต์แวร์เฮาส์เชียงใหม่ ที่โตไปกับลูกค้า"
        subtitle="เริ่มจากเว็บเล็กๆ จนถึงระบบระดับองค์กร — ด้วยทีมเดิมที่อยู่กับคุณจริง"
      />
      <div className="mt-8 grid items-center gap-10 lg:grid-cols-2">
        <div className="space-y-4 text-muted">
          <p>
            Owl Day House คือซอฟต์แวร์เฮาส์จากเชียงใหม่ ที่เชื่อว่าธุรกิจทุกขนาดควรเริ่มมีเว็บที่ดีได้
            โดยไม่ต้องลงทุนก้อนใหญ่ตั้งแต่วันแรก เราจึงออกแบบบริการให้เริ่มเล็กได้ แล้วต่อยอดขึ้นไปเรื่อย ๆ
            ตามการเติบโตของคุณ
          </p>
          <p>
            เราไม่ได้แค่ทำเว็บให้เสร็จแล้วจากไป — แต่อยู่ดูแล แก้ไข และพัฒนาต่อด้วยทีมคนไทยชุดเดิม
            ตั้งแต่เว็บแรกราคา ฿3,900 ไปจนถึงระบบที่รองรับคนทั้งองค์กรหรือทั้งมหาวิทยาลัย
          </p>
        </div>
        <Image
          src="/illustrations/design-collaboration.svg"
          alt="ทีม Owl Day House ทำงานร่วมกันเพื่อดูแลลูกค้า"
          width={440}
          height={330}
          className="mx-auto w-full max-w-md"
        />
      </div>

      <div className="mt-12 grid gap-4 sm:grid-cols-2">
        {reasons.map(({ icon: Icon, title, text }, i) => (
          <Reveal key={title} delay={i * 0.06}>
            <Card className="flex h-full gap-4">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gold-soft text-navy">
                <Icon size={22} />
              </span>
              <div>
                <h2 className="font-display text-lg font-bold text-navy">{title}</h2>
                <p className="mt-1 text-sm text-muted">{text}</p>
              </div>
            </Card>
          </Reveal>
        ))}
      </div>

      <div className="mt-12">
        <Button variant="gold" size="lg" asChild>
          <a href={contact.messenger} target="_blank" rel="noopener noreferrer">
            คุยกับทีมเรา
          </a>
        </Button>
      </div>
    </main>
  );
}
