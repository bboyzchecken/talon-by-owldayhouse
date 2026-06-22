import type { Metadata } from "next";
import { Badge, Button, SectionHeading } from "@odh/ui";
import { contact } from "@/content/site";

export const metadata: Metadata = {
  title: "Talon — เว็บไซต์ไวด้วย AI ฿3,900",
  description: "Talon เว็บไซต์ไวด้วย AI เสร็จใน 5 วัน เริ่มต้น ฿3,900 — เร็วเท่า AI แต่มีทีมคนไทยดูแลจริง",
};

export default function TalonPage() {
  return (
    <main className="mx-auto max-w-5xl px-6 py-20">
      <Badge variant="gold">NEW</Badge>
      <div className="mt-4">
        <SectionHeading
          as="h1"
          eyebrow="Talon"
          title="เว็บไซต์ไวด้วย AI เสร็จใน 5 วัน"
          subtitle="เริ่มต้น ฿3,900 — เร็วเท่า AI แต่ไม่พังเพราะมีทีมคนไทยดูแลจริง"
        />
      </div>
      <p className="mt-8 max-w-2xl text-muted">หน้าขาย Talon แบบเต็ม (ปัญหา → ทางออก → ราคา → แพ็กดูแล → CTA) จะสร้างใน Step 4</p>
      <Button variant="gold" size="lg" className="mt-8" asChild>
        <a href={contact.messenger}>เริ่มเลย ฿3,900</a>
      </Button>
    </main>
  );
}
