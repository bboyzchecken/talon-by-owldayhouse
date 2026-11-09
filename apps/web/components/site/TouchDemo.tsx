"use client";

import { useState } from "react";

interface TouchDemoProps {
  hint: string;
  aria: string;
  sampleLabel: string;
}

/** A small kiosk game visitors can actually play. */
export function TouchDemo({ hint, aria, sampleLabel }: TouchDemoProps) {
  const [score, setScore] = useState(0);
  const [position, setPosition] = useState({ left: 50, top: 52 });

  const hit = () => {
    setScore((value) => value + 1);
    setPosition({ left: 18 + Math.random() * 64, top: 28 + Math.random() * 50 });
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="odh-touch">
        <div className="odh-touch__screen">
          <div className="odh-touch__score" aria-live="polite">
            {score}
          </div>
          <button type="button" className="odh-touch__dot" aria-label={aria} onClick={hit} style={{ left: `${position.left}%`, top: `${position.top}%` }} />
          <div className="odh-touch__hint">{hint}</div>
        </div>
        <div className="odh-touch__stand" />
        <div className="odh-touch__foot" />
      </div>
      <span className="odh-tag odh-tag--sample">{sampleLabel}</span>
    </div>
  );
}
