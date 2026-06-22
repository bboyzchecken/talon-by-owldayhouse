import { Button, OwlMark, SectionHeading } from "@odh/ui";

// Temporary home — proves brand tokens, fonts and @odh/ui render.
// Real hero / sections land in Step 4.
export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center gap-8 px-6 py-20 text-center">
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
          <a href="https://m.me/owldayhouse">เริ่มเลย ฿3,900</a>
        </Button>
        <Button variant="ghost" size="lg">
          ดูผลงาน
        </Button>
      </div>
    </main>
  );
}
