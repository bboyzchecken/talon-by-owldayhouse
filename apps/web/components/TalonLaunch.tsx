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
              <Badge variant="gold">NEW</Badge>
              <h2 className="mt-4 font-display text-3xl font-bold leading-tight text-paper sm:text-4xl">
                Talon — เว็บไซต์โปร <span className="text-gold">เสร็จไวใน 5 วัน</span>
              </h2>
              <p className="mt-3 text-paper/80">
                เริ่มต้น ฿3,900 — ทีมคนไทยทำให้เสร็จไว พร้อมดูแลต่อ ไม่ทิ้งกลางทาง
              </p>
            </div>
            <Button variant="gold" size="lg" asChild className="shrink-0">
              <Link href="/talon">
                ดู Talon <ArrowRight size={18} />
              </Link>
            </Button>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
