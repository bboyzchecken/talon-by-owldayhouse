import type { Metadata } from "next";
import { Button, SectionHeading } from "@odh/ui";
import { contact } from "@/content/site";

export const metadata: Metadata = {
  title: "บริการของเรา",
  description: "รับทำเว็บไซต์ เว็บแอป/โมบายแอป ระบบองค์กร และงานกราฟิก โดยทีมซอฟต์แวร์เฮาส์เชียงใหม่",
};

export default function ServicesPage() {
  return (
    <main className="mx-auto max-w-5xl px-6 py-20">
      <SectionHeading
        as="h1"
        eyebrow="บริการ"
        title="เราทำอะไร"
        subtitle="เว็บไซต์ · เว็บ/โมบายแอป · ระบบองค์กร · กราฟิก — เริ่มเล็กได้ โตได้ ไม่ต้องย้ายเจ้า"
      />
      <p className="mt-8 max-w-2xl text-muted">เนื้อหาแบบเต็มจะเพิ่มใน Step 6 — ตอนนี้เป็นโครงหน้าเพื่อวาง navigation และฐาน SEO</p>
      <Button variant="gold" className="mt-8" asChild>
        <a href={contact.messenger}>ปรึกษาเราเลย</a>
      </Button>
    </main>
  );
}
