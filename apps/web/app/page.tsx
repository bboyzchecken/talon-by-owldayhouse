import Link from "next/link";
import { Button, OwlMark, SectionHeading } from "@odh/ui";

// Temporary home — proves brand + navigation. Real hero / sections land in Step 4.
export default function HomePage() {
  return (
    <main>
      <section className="mx-auto flex max-w-4xl flex-col items-center gap-8 px-6 py-24 text-center sm:py-32">
        <OwlMark size={72} />
        <SectionHeading
          align="center"
          as="h1"
          eyebrow="Owl Day House"
          title="จากเว็บแรก ฿3,900 สู่ระบบระดับองค์กร"
          subtitle="AI เร็ว + ทีมคนไทยดูแลจริง — เริ่มเล็กได้ โตได้ ไม่ต้องย้ายเจ้า"
        />
        <div className="flex flex-wrap justify-center gap-3">
          <Button variant="gold" size="lg" asChild>
            <Link href="/talon">เริ่มเลย ฿3,900</Link>
          </Button>
          <Button variant="ghost" size="lg" asChild>
            <Link href="/work">ดูผลงาน</Link>
          </Button>
        </div>
      </section>
    </main>
  );
}
