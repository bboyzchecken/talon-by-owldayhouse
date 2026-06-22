import { SectionHeading } from "@odh/ui";
import { pageMeta } from "@/lib/seo";
import { JsonLd } from "@/components/JsonLd";
import { breadcrumbSchema } from "@/lib/structured-data";
import { ValueLadder } from "@/components/ValueLadder";
import { CarePlans } from "@/components/CarePlans";
import { ClosingCTA } from "@/components/ClosingCTA";

export const metadata = pageMeta({
  title: "แพ็กเกจ & ราคา",
  description:
    "ราคารับทำเว็บไซต์และระบบ เริ่มต้น ฿3,900 — บันได 4 ขั้นจากเว็บไวถึงระบบองค์กร พร้อมแพ็กดูแลรายเดือน เดือนแรกฟรี",
  path: "/packages/",
});

export default function PackagesPage() {
  return (
    <main>
      <JsonLd data={breadcrumbSchema("แพ็กเกจ", "/packages/")} />
      <section className="mx-auto max-w-5xl px-6 pt-20">
        <SectionHeading
          as="h1"
          eyebrow="แพ็กเกจ & ราคา"
          title="ราคาที่เริ่มได้ตั้งแต่วันนี้"
          subtitle="โปร่งใส ไม่มีบวกเพิ่มทีหลัง — เลือกขั้นที่ใช่ แล้วค่อยโตขึ้นเมื่อพร้อม"
        />
        <p className="mt-6 max-w-2xl text-muted">
          เรารับทำเว็บไซต์ราคาเริ่มต้น ฿3,900 และวางราคาแบบเป็นขั้นบันได เพื่อให้ธุรกิจเล็กเริ่มได้ก่อน
          แล้วอัปเกรดเป็นเว็บธุรกิจ ระบบร้านออนไลน์ หรือระบบองค์กรได้ในภายหลัง โดยไม่ต้องเริ่มใหม่หรือย้ายเจ้า
        </p>
      </section>

      <ValueLadder />
      <CarePlans />
      <ClosingCTA />
    </main>
  );
}
