import type { Metadata } from "next";
import { Button, SectionHeading } from "@odh/ui";
import { contact } from "@/content/site";

export const metadata: Metadata = {
  title: "เราคือใคร",
  description:
    "Owl Day House ซอฟต์แวร์เฮาส์เชียงใหม่ บริษัทจดทะเบียน ออกใบกำกับภาษีได้ มีผลงานจริงทั้งเว็บและระบบองค์กร",
};

export default function AboutPage() {
  return (
    <main className="mx-auto max-w-5xl px-6 py-20">
      <SectionHeading
        as="h1"
        eyebrow="เกี่ยวกับเรา"
        title="Owl Day House — ซอฟต์แวร์เฮาส์เชียงใหม่"
        subtitle="บริษัทจดทะเบียน ออกใบกำกับภาษีได้ ผลงานจริง — น่าไว้ใจตั้งแต่เว็บแรกจนถึงระบบองค์กร"
      />
      <p className="mt-8 max-w-2xl text-muted">เนื้อหาแบบเต็มจะเพิ่มใน Step 6 — ตอนนี้เป็นโครงหน้าเพื่อวาง navigation และฐาน SEO</p>
      <Button variant="gold" className="mt-8" asChild>
        <a href={contact.messenger}>คุยกับทีมเรา</a>
      </Button>
    </main>
  );
}
