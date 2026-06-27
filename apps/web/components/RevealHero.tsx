"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import styles from "./RevealHero.module.css";

// On-brand reveal assets in /public/showcase.
// surface = polished finished website (the surface); blueprint = the system beneath.
const SURFACE = "/showcase/surface.svg";
const BLUEPRINT = "/showcase/blueprint.svg";
const SPOTLIGHT_R = 260;

const MASK = `radial-gradient(
  circle ${SPOTLIGHT_R}px at var(--mx, -999px) var(--my, -999px),
  rgba(255,255,255,1.0)  0%,
  rgba(255,255,255,1.0)  40%,
  rgba(255,255,255,0.75) 60%,
  rgba(255,255,255,0.4)  75%,
  rgba(255,255,255,0.12) 88%,
  rgba(255,255,255,0.0)  100%
)`;

/**
 * Interactive showcase hero — a cursor-following spotlight that reveals the
 * "system blueprint" beneath a polished website surface. Uses a CSS radial
 * mask driven by a CSS custom property (no canvas, no per-frame React state).
 * Coordinates are section-relative so the spotlight stays aligned beneath the
 * sticky site nav and on scroll.
 */
export function RevealHero() {
  const sectionRef = useRef<HTMLElement>(null);
  const mouse = useRef({ x: -9999, y: -9999 });
  const smooth = useRef({ x: -9999, y: -9999 });
  const rafRef = useRef<number | undefined>(undefined);
  const runningRef = useRef(false);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    const apply = () => {
      const rect = section.getBoundingClientRect();
      section.style.setProperty("--mx", `${smooth.current.x - rect.left}px`);
      section.style.setProperty("--my", `${smooth.current.y - rect.top}px`);
    };

    const tick = () => {
      const s = smooth.current;
      const m = mouse.current;
      s.x += (m.x - s.x) * 0.1;
      s.y += (m.y - s.y) * 0.1;
      apply();

      // หยุด loop เมื่อ spotlight ตามทันเคอร์เซอร์ → ปล่อย main thread ว่าง
      if ((m.x - s.x) ** 2 + (m.y - s.y) ** 2 > 0.25) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        s.x = m.x;
        s.y = m.y;
        apply();
        runningRef.current = false;
      }
    };

    const startLoop = () => {
      if (runningRef.current) return;
      runningRef.current = true;
      rafRef.current = requestAnimationFrame(tick);
    };

    const onMove = (e: MouseEvent) => {
      mouse.current = { x: e.clientX, y: e.clientY };
      startLoop();
    };

    window.addEventListener("mousemove", onMove, { passive: true });
    return () => {
      window.removeEventListener("mousemove", onMove);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      runningRef.current = false;
    };
  }, []);

  return (
    <section
      ref={sectionRef}
      className="relative w-full overflow-hidden bg-navy-deep"
      style={{ minHeight: "calc(100svh - 4rem)" }}
    >
      {/* 1. Base image — the polished surface */}
      <div
        className={`${styles.heroZoom} absolute inset-0 z-10 bg-cover bg-center bg-no-repeat`}
        style={{ backgroundImage: `url(${SURFACE})` }}
      />

      {/* 2. Reveal layer — the system blueprint beneath */}
      <div
        className="absolute inset-0 z-30 bg-cover bg-center bg-no-repeat pointer-events-none"
        style={{ backgroundImage: `url(${BLUEPRINT})`, WebkitMaskImage: MASK, maskImage: MASK }}
      />

      {/* Legibility scrim — มืดเฉพาะบน/ล่าง กันตัวอักษรจมภาพ กลางใส reveal ยังคม */}
      <div
        className="absolute inset-0 z-40 pointer-events-none"
        style={{
          background:
            "linear-gradient(to bottom, rgba(9,7,22,0.62) 0%, rgba(9,7,22,0.18) 24%, rgba(9,7,22,0) 42%, rgba(9,7,22,0) 60%, rgba(9,7,22,0.55) 100%)",
        }}
      />

      {/* 3. Heading */}
      <div className="absolute top-[12%] left-0 right-0 z-50 flex flex-col items-center px-5 text-center pointer-events-none">
        <h1 className="leading-[1.04]">
          <span
            className={`${styles.heroAnim} ${styles.heroReveal} block font-display text-5xl font-light sm:text-7xl md:text-8xl`}
            style={{ color: "#ffffff", letterSpacing: "-0.01em", animationDelay: "0.25s", textShadow: "0 2px 10px rgba(9,7,22,0.55)" }}
          >
            ใต้ดีไซน์สวย ๆ
          </span>
          <span
            className={`${styles.heroAnim} ${styles.heroReveal} block font-display text-5xl font-bold sm:text-7xl md:text-8xl`}
            style={{ color: "#ffc233", letterSpacing: "-0.02em", animationDelay: "0.42s", textShadow: "0 2px 10px rgba(9,7,22,0.6)" }}
          >
            คือระบบที่โตได้
          </span>
        </h1>
      </div>

      {/* 4. Bottom-left paragraph */}
      <div
        className={`${styles.heroAnim} ${styles.heroFade} absolute bottom-14 left-6 z-50 hidden max-w-[280px] sm:block md:left-14`}
        style={{ animationDelay: "0.7s" }}
      >
        <p className="text-sm leading-relaxed text-paper/90" style={{ textShadow: "0 1px 14px rgba(9,7,22,0.75)" }}>
          ทุกเว็บที่เราส่งมอบ ออกแบบให้เติบโตต่อได้ — จากเว็บแรก ฿3,900 สู่ระบบระดับองค์กร
          ดูแลต่อโดยทีมงานคนไทยที่เชียงใหม่
        </p>
      </div>

      {/* 5. Bottom-right block */}
      <div
        className={`${styles.heroAnim} ${styles.heroFade} absolute bottom-10 left-5 right-5 z-50 flex max-w-full flex-col items-start gap-4 sm:bottom-20 sm:left-auto sm:right-10 sm:max-w-[280px] sm:gap-5 md:right-14`}
        style={{ animationDelay: "0.85s" }}
      >
        <p className="text-xs leading-relaxed text-paper/90 sm:text-sm" style={{ textShadow: "0 1px 14px rgba(9,7,22,0.75)" }}>
          ลองเลื่อนเคอร์เซอร์ไปบนภาพ แล้วส่องดูโครงสร้างระบบที่อยู่เบื้องหลังงานออกแบบของเรา
        </p>
        <Link
          href="/talon"
          className="inline-flex items-center gap-2 whitespace-nowrap rounded-full bg-gold px-7 py-3 font-display text-sm font-semibold text-navy shadow-glow transition-all hover:scale-[1.03] hover:bg-gold/90 active:scale-95"
        >
          เริ่มเลย ฿3,900
          <ArrowRight size={16} strokeWidth={2.5} />
        </Link>
      </div>
    </section>
  );
}
