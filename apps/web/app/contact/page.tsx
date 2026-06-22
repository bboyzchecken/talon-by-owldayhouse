import type { Metadata } from "next";
import { Button, Card, SectionHeading } from "@odh/ui";
import { company, contact } from "@/content/site";

export const metadata: Metadata = {
  title: "ติดต่อเรา",
  description: "ติดต่อ Owl Day House เชียงใหม่ ผ่าน Facebook Messenger, โทร 092-455-2450 หรือ LINE — ไม่มีฟอร์มให้กรอกยุ่งยาก",
};

export default function ContactPage() {
  return (
    <main className="mx-auto max-w-5xl px-6 py-20">
      <SectionHeading
        as="h1"
        eyebrow="ติดต่อ"
        title="คุยกับเราได้เลย"
        subtitle="ไม่มีฟอร์มให้กรอกยุ่งยาก — ทักช่องทางที่สะดวกที่สุด เดี๋ยวทีมงานคนไทยตอบเอง"
      />

      <div className="mt-10 grid gap-4 sm:grid-cols-3">
        <Card>
          <h2 className="font-display text-lg font-bold text-navy">Messenger</h2>
          <p className="mt-1 text-sm text-muted">ตอบไวที่สุด</p>
          <Button variant="gold" className="mt-4 w-full" asChild>
            <a href={contact.messenger} target="_blank" rel="noopener noreferrer">
              ทักเลย
            </a>
          </Button>
        </Card>
        <Card>
          <h2 className="font-display text-lg font-bold text-navy">โทร</h2>
          <p className="mt-1 text-sm text-muted">{contact.phoneDisplay}</p>
          <Button variant="navy" className="mt-4 w-full" asChild>
            <a href={contact.phoneTel}>โทรเลย</a>
          </Button>
        </Card>
        <Card>
          <h2 className="font-display text-lg font-bold text-navy">LINE</h2>
          <p className="mt-1 text-sm text-muted">แชทผ่าน LINE</p>
          <Button variant="ghost" className="mt-4 w-full" asChild>
            <a href={contact.line} target="_blank" rel="noopener noreferrer">
              เพิ่มเพื่อน
            </a>
          </Button>
        </Card>
      </div>

      <Card className="mt-6">
        <h2 className="font-display text-lg font-bold text-navy">ที่อยู่บริษัท</h2>
        <address className="mt-2 not-italic leading-relaxed text-muted">
          {company.legalName}
          <br />
          {company.address.line} {company.address.district}
          <br />
          {company.address.city} {company.address.postcode}
        </address>
      </Card>
    </main>
  );
}
