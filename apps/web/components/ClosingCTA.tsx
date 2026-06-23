import { ArrowRight } from "lucide-react";
import { MessengerCta } from "./MessengerCta";
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
        <h2 className="font-display text-3xl font-bold sm:text-4xl">พร้อมให้เว็บช่วยหาลูกค้าให้คุณหรือยัง?</h2>
        <p className="mx-auto mt-4 max-w-xl text-paper/80">
          ทักมาเล่าธุรกิจให้ฟังได้เลย ไม่มีฟอร์มยุ่งยาก — ทีมคนไทยตอบเอง แนะนำตรง ๆ
          ว่าควรเริ่มยังไงให้คุ้มและได้ลูกค้าจริง ไม่ขายเกินจำเป็น
        </p>
        <div className="mt-8 flex justify-center">
          <MessengerCta location="closing">
            ทักเราเลย <ArrowRight size={18} />
          </MessengerCta>
        </div>
      </Reveal>
    </section>
  );
}
