"use client";

import { useEffect } from "react";

export const clamp = (value: number, min = 0, max = 1) => Math.min(max, Math.max(min, value));
export const ease = (t: number) => t * t * (3 - 2 * t);

export function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Runs `frame` at most once per animation frame on scroll and resize. Pass a stable callback. */
export function useScrollFrame(frame: () => void) {
  useEffect(() => {
    if (prefersReducedMotion()) return;
    let queued = false;
    const request = () => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(() => {
        queued = false;
        frame();
      });
    };
    window.addEventListener("scroll", request, { passive: true });
    window.addEventListener("resize", request);
    void document.fonts?.ready.then(request);
    request();
    return () => {
      window.removeEventListener("scroll", request);
      window.removeEventListener("resize", request);
    };
  }, [frame]);
}
