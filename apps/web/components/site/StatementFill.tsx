"use client";

import { useCallback, useRef } from "react";
import { clamp, useScrollFrame } from "@/lib/hooks/useScrollFrame";

interface StatementFillProps {
  segments: readonly string[];
  emphasis: string;
}

/** Large paragraph whose phrases come into focus as the reader scrolls. */
export function StatementFill({ segments, emphasis }: StatementFillProps) {
  const root = useRef<HTMLParagraphElement>(null);

  const frame = useCallback(() => {
    if (!root.current) return;
    const rect = root.current.getBoundingClientRect();
    const height = window.innerHeight;
    const progress = clamp((height * 0.86 - rect.top) / (rect.height + height * 0.5));
    const parts = root.current.querySelectorAll<HTMLSpanElement>("span");
    parts.forEach((part, index) => {
      part.style.opacity = (0.16 + 0.84 * clamp(progress * parts.length - index)).toFixed(3);
    });
  }, []);

  useScrollFrame(frame);

  return (
    <section className="odh-sec odh-wrap">
      <p ref={root} className="odh-statement">
        {segments.map((segment) => (
          <span key={segment}>{segment}</span>
        ))}
        <span>
          <b>{emphasis}</b>
        </span>
      </p>
    </section>
  );
}
