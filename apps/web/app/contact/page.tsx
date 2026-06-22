import { Clock, MapPin } from "lucide-react";
import { Button, Card, SectionHeading } from "@odh/ui";
import { company, contact } from "@/content/site";
import { pageMeta } from "@/lib/seo";
import { JsonLd } from "@/components/JsonLd";
import { breadcrumbSchema } from "@/lib/structured-data";

export const metadata = pageMeta({
  title: "ติดต่อเรา",
  description:
    "ติดต่อ Owl Day House เชียงใหม่ ผ่าน Facebook Messenger, โทร 092-455-2450 หรือ LINE — ไม่มีฟอร์มให้กรอกยุ่งยาก",
  path: "/contact/",
});

const mapsQuery = `${company.address.line} ${company.address.district} ${company.address.city} ${company.address.postcode}`;
const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapsQuery)}`;

export default function ContactPage() {
  return (
    <main className="mx-auto max-w-5xl px-6 py-20">
      <JsonLd data={breadcrumbSchema("ติดต่อ", "/contact/")} />
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

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <Card>
          <h2 className="flex items-center gap-2 font-display text-lg font-bold text-navy">
            <MapPin size={18} className="text-gold" /> ที่อยู่บริษัท
          </h2>
          <address className="mt-2 not-italic leading-relaxed text-muted">
            {company.legalName}
            <br />
            {company.address.line} {company.address.district}
            <br />
            {company.address.city} {company.address.postcode}
          </address>
          <Button variant="ghost" className="mt-4" asChild>
            <a href={mapsUrl} target="_blank" rel="noopener noreferrer">
              ดูแผนที่ / นำทาง
            </a>
          </Button>
        </Card>
        <Card>
          <h2 className="flex items-center gap-2 font-display text-lg font-bold text-navy">
            <Clock size={18} className="text-gold" /> เวลาทำการ
          </h2>
          <p className="mt-2 text-muted">จันทร์ – ศุกร์ · 09:00 – 18:00 น.</p>
          <p className="mt-1 text-sm text-muted">นอกเวลาทำการทักผ่าน Messenger หรือ LINE ไว้ได้ เดี๋ยวเราตอบกลับ</p>
        </Card>
      </div>
    </main>
  );
}
