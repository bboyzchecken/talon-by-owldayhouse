"use client";

import { useCallback, useRef } from "react";
import Image from "next/image";
import type { Copy } from "@/content/copy";
import { clamp, ease, useScrollFrame } from "@/lib/hooks/useScrollFrame";

/** Pinned section: Build, Activate and Grow replace each other as the reader scrolls. */
export function ThreeActs({ acts }: { acts: Copy["acts"] }) {
  const root = useRef<HTMLElement>(null);
  const track = useRef<HTMLDivElement>(null);

  const frame = useCallback(() => {
    const el = root.current;
    if (!el || !track.current) return;
    const pin = el.querySelector<HTMLElement>(".odh-acts__pin");
    if (!pin) return;
    if (getComputedStyle(pin).position !== "sticky") return; // short screens show the static layout
    const rect = el.getBoundingClientRect();
    const count = acts.length;
    const position = clamp(-rect.top / (rect.height - window.innerHeight)) * (count - 1);

    track.current.style.transform = `translateY(${(-position * 100) / count}%)`;
    el.querySelectorAll<HTMLElement>(".odh-acts__copy").forEach((copy, index) => {
      const distance = Math.abs(position - index);
      copy.style.opacity = clamp(1 - distance * 2.4).toFixed(3);
      copy.style.transform = `translateY(${((index - position) * 36).toFixed(1)}px)`;
      copy.style.pointerEvents = distance < 0.3 ? "auto" : "none";
    });
    el.querySelectorAll<HTMLElement>(".odh-acts__img figure").forEach((figure, index) => {
      const shown = index ? clamp(position - (index - 1)) : 1;
      if (index) figure.style.clipPath = `inset(${((1 - ease(shown)) * 100).toFixed(2)}% 0 0 0)`;
      const image = figure.querySelector("img");
      if (image) image.style.transform = `scale(${(1.14 - 0.14 * shown).toFixed(4)})`;
    });
    el.querySelectorAll<HTMLElement>(".odh-acts__ticks b").forEach((tick, index) => {
      tick.style.transform = `scaleX(${clamp(position + 1 - index).toFixed(3)})`;
    });
  }, [acts.length]);

  useScrollFrame(frame);

  return (
    <section ref={root} className="odh-acts">
      <div className="odh-acts__pin">
        <div className="odh-acts__left">
          <p className="odh-mono mb-3">What we do</p>
          <div className="odh-acts__ticks" aria-hidden="true">
            {acts.map((act) => (
              <i key={act.word}>
                <b />
              </i>
            ))}
          </div>
          <div className="odh-acts__word" aria-hidden="true">
            <div ref={track} className="odh-acts__track">
              {acts.map((act) => (
                <div key={act.word}>{act.word}</div>
              ))}
            </div>
          </div>
          <div className="odh-acts__body">
            {acts.map((act, index) => (
              <div key={act.word} className="odh-acts__copy" style={index ? undefined : { opacity: 1 }}>
                <h2 className="sr-only">{act.word}</h2>
                <p>{act.description}</p>
                <ul>
                  {act.services.map((service) => (
                    <li key={service}>{service}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
        <div className="odh-acts__img">
          {acts.map((act) => (
            <figure key={act.word}>
              <Image src={act.image} alt="" width={1088} height={1360} sizes="(max-width: 900px) 100vw, 42vw" />
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
