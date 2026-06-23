"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Button } from "@odh/ui";

// Supporting elements fade up on mount; the H1 (LCP) renders immediately so it
// paints without delay.
const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, delay: 0.12 * i, ease: "easeOut" },
  }),
};

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-navy text-paper">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-gradient-to-b from-navy to-navy-deep"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-[-120px] h-[480px] w-[480px] -translate-x-1/2 rounded-full bg-gold/20 blur-[120px]"
      />
      <div className="relative mx-auto flex max-w-4xl flex-col items-center gap-7 px-6 py-28 text-center sm:py-36">
        <motion.span
          variants={fadeUp}
          initial="hidden"
          animate="show"
          custom={0}
          className="font-display text-sm font-semibold uppercase tracking-[0.25em] text-gold"
        >
          รับทำเว็บไซต์ · เชียงใหม่
        </motion.span>

        <h1 className="font-display text-4xl font-bold leading-[1.1] sm:text-6xl">
          จากเว็บแรก <span className="text-gold">฿3,900</span>
          <br className="hidden sm:block" /> สู่ระบบระดับองค์กร
        </h1>

        <motion.p
          variants={fadeUp}
          initial="hidden"
          animate="show"
          custom={1}
          className="max-w-xl text-lg text-paper/80"
        >
          เว็บที่ทำให้ธุรกิจคุณดูน่าเชื่อถือและได้ลูกค้าจริง — มีทีมงานดูแลต่อ เริ่มเล็กได้ โตได้
        </motion.p>

        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="show"
          custom={2}
          className="flex flex-wrap justify-center gap-3"
        >
          <Button variant="gold" size="lg" asChild>
            <Link href="/talon">เริ่มเลย ฿3,900</Link>
          </Button>
          <Button
            variant="ghost"
            size="lg"
            asChild
            className="border-white/25 text-paper hover:bg-white/10"
          >
            <Link href="/work">ดูผลงาน</Link>
          </Button>
        </motion.div>
      </div>
    </section>
  );
}
