import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Badge, Button } from "@odh/ui";
import { Reveal } from "./Reveal";

export function TalonLaunch() {
  return (
    <section className="px-6 py-8">
      <Reveal className="mx-auto max-w-6xl">
        <div className="relative overflow-hidden rounded-3xl border border-gold/40 bg-navy-deep px-8 py-12 text-paper sm:px-12">
          <div
            aria-hidden
            className="pointer-events-none absolute right-[-80px] top-[-80px] h-72 w-72 rounded-full bg-gold/20 blur-[100px]"
          />
          <div className="relative flex flex-col items-start gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl">
              <Badge variant="gold">แพ็กเกจโปรโมชัน</Badge>
              <h2 className="mt-4 font-display text-3xl font-bold leading-tight text-paper sm:text-4xl">
                Talon — เว็บหน้าเดียว <span className="text-gold">เสร็จใน 5 วัน เริ่ม ฿3,900</span>
              </h2>
              <p className="mt-3 text-paper/80">
                แพ็กเกจเว็บไซต์หน้าเดียวสำหรับร้านค้า/SME ที่อยากมีหน้าร้านออนไลน์ดูโปรเร็ว ๆ —
                ทีม ODH ทำให้ครบ พร้อมดูแลต่อให้เว็บยังหาลูกค้าได้ทุกวัน
              </p>
            </div>
            <Button variant="gold" size="lg" asChild className="shrink-0">
              <Link href="/talon">
                ดูแพ็กเกจ Talon <ArrowRight size={18} />
              </Link>
            </Button>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
