import Image from "next/image";
import { Check } from "lucide-react";
import { SectionHeading } from "@odh/ui";
import { Reveal } from "./Reveal";

const reasons = [
  {
    title: "เว็บที่ช่วยปิดการขายจริง",
    text: "ออกแบบให้ลูกค้าเชื่อใจและกดติดต่อ ไม่ใช่แค่สวยอย่างเดียว",
  },
  {
    title: "ทีมงานคนไทยดูแลต่อ ไม่หายตัว",
    text: "แก้ไข อัปเดต ตอบเร็ว ไม่ปล่อยให้คุณงมเอง",
  },
  {
    title: "บริษัทจดทะเบียน ตรวจสอบได้",
    text: "ออกใบกำกับภาษีได้ รับผิดชอบงานในระยะยาว",
  },
  {
    title: "เริ่มถูก โตได้",
    text: "เริ่มจากเว็บหน้าเดียว ฿3,900 แล้วขยายเมื่อธุรกิจพร้อม",
  },
];

export function WhyUs() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-20 sm:py-24">
      <div className="grid items-center gap-10 lg:grid-cols-2">
        <Reveal>
          <Image
            src="/illustrations/design-collaboration.svg"
            alt="ทีม Owl Day House ทำงานร่วมกับลูกค้า"
            width={440}
            height={330}
            className="mx-auto w-full max-w-md"
          />
        </Reveal>
        <Reveal delay={0.1}>
          <SectionHeading
            eyebrow="ทำไมต้อง ODH"
            title="เว็บที่ SME ไว้ใจให้ดูแลธุรกิจ"
            subtitle="ไม่ใช่แค่ทำเว็บให้สวยแล้วจบ — เราทำเว็บที่ช่วยให้ลูกค้าเชื่อใจและติดต่อคุณจริง"
          />
          <ul className="mt-6 space-y-4">
            {reasons.map((r) => (
              <li key={r.title} className="flex gap-3">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gold-soft text-navy">
                  <Check size={15} />
                </span>
                <div>
                  <p className="font-display font-bold text-navy">{r.title}</p>
                  <p className="text-sm text-muted">{r.text}</p>
                </div>
              </li>
            ))}
          </ul>
        </Reveal>
      </div>
    </section>
  );
}
