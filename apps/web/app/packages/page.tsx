import { Button, SectionHeading } from "@odh/ui";
import { contact } from "@/content/site";
import { pageMeta } from "@/lib/seo";
import { JsonLd } from "@/components/JsonLd";
import { breadcrumbSchema } from "@/lib/structured-data";

export const metadata = pageMeta({
  title: "แพ็กเกจ & ราคา",
  description: "แพ็กเกจรับทำเว็บไซต์และระบบ — บันได 4 ขั้น เริ่มจากเว็บไว ฿3,900 ถึงระบบองค์กร พร้อมแพ็กดูแลรายเดือน",
  path: "/packages/",
});

export default function PackagesPage() {
  return (
    <main className="mx-auto max-w-5xl px-6 py-20">
      <JsonLd data={breadcrumbSchema("แพ็กเกจ", "/packages/")} />
      <SectionHeading
        as="h1"
        eyebrow="แพ็กเกจ"
        title="บันได 4 ขั้น + แพ็กดูแล"
        subtitle="เริ่มจากเว็บไว ฿3,900 ไต่ขึ้นเว็บธุรกิจ ระบบ/ร้านออนไลน์ จนถึงระบบองค์กร — โตได้ในที่เดียว"
      />
      <p className="mt-8 max-w-2xl text-muted">ตารางราคาและบันได 4 ขั้นแบบเต็มจะสร้างใน Step 4 (ดึงจาก content/packages)</p>
      <Button variant="gold" className="mt-8" asChild>
        <a href={contact.messenger}>ขอใบเสนอราคา</a>
      </Button>
    </main>
  );
}
