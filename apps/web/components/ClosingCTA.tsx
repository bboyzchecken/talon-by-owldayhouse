import { ArrowRight } from "lucide-react";
import { Button } from "@odh/ui";
import { contact } from "@/content/site";
import { Reveal } from "./Reveal";

export function ClosingCTA() {
  return (
    <section className="relative overflow-hidden bg-navy text-paper">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-gradient-to-t from-navy-deep to-navy"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 bottom-[-140px] h-[420px] w-[420px] -translate-x-1/2 rounded-full bg-gold/20 blur-[120px]"
      />
      <Reveal className="relative mx-auto max-w-3xl px-6 py-24 text-center">
        <h2 className="font-display text-3xl font-bold sm:text-4xl">พร้อมเริ่มเว็บแรกของคุณหรือยัง?</h2>
        <p className="mx-auto mt-4 max-w-xl text-paper/80">
          ทักมาคุยได้เลย ไม่มีฟอร์มให้กรอกยุ่งยาก — ทีมคนไทยตอบเอง แนะนำตรงๆ ว่าควรเริ่มขั้นไหน
        </p>
        <div className="mt-8 flex justify-center">
          <Button variant="gold" size="lg" asChild>
            <a href={contact.messenger} target="_blank" rel="noopener noreferrer">
              ทักเราเลย <ArrowRight size={18} />
            </a>
          </Button>
        </div>
      </Reveal>
    </section>
  );
}
