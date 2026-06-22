import type { Metadata } from "next";
import { Button, SectionHeading } from "@odh/ui";
import { contact } from "@/content/site";

export const metadata: Metadata = {
  title: "ผลงาน",
  description: "ผลงาน Owl Day House — งานเว็บไซต์ ระบบองค์กร และงานราชการ/มหาวิทยาลัย เช่นระบบลงทะเบียน",
};

export default function WorkPage() {
  return (
    <main className="mx-auto max-w-5xl px-6 py-20">
      <SectionHeading
        as="h1"
        eyebrow="ผลงาน"
        title="งานที่เราภูมิใจ"
        subtitle="รวมงานเว็บ ระบบองค์กร และงานราชการ/มหาวิทยาลัย — ดันงานที่รับผิดชอบจริงขึ้นก่อน"
      />
      <p className="mt-8 max-w-2xl text-muted">การ์ดผลงานจริง (งานราชการ/มหาวิทยาลัยอยู่บนสุด) จะสร้างใน Step 4 ดึงจาก content/portfolio</p>
      <Button variant="gold" className="mt-8" asChild>
        <a href={contact.messenger}>อยากได้แบบนี้บ้าง</a>
      </Button>
    </main>
  );
}
