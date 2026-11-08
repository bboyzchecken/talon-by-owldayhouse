"use client";

import { useCallback, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@odh/ui";
import type { Copy } from "@/content/copy";
import { clamp, ease, useScrollFrame } from "@/lib/hooks/useScrollFrame";

const EYE = { width: 1920, height: 1088, pupilY: 0.415, irisShare: 0.62 };

interface EyeHeroProps {
  home: Copy["home"];
  workHref: string;
  contactHref: string;
}

/** Opening section: the O in "Grow" is the owl's eye, and opens to full screen on scroll. */
export function EyeHero({ home, workHref, contactHref }: EyeHeroProps) {
  const root = useRef<HTMLElement>(null);
  const pin = useRef<HTMLDivElement>(null);
  const eye = useRef<HTMLSpanElement>(null);
  const layer = useRef<HTMLDivElement>(null);
  const image = useRef<HTMLImageElement>(null);
  const scrim = useRef<HTMLDivElement>(null);
  const say = useRef<HTMLParagraphElement>(null);

  const frame = useCallback(() => {
    if (!root.current || !pin.current || !eye.current || !layer.current || !image.current) return;
    if (!scrim.current || !say.current) return;

    const section = root.current.getBoundingClientRect();
    const progress = clamp(-section.top / (section.height - window.innerHeight));
    const stage = pin.current.getBoundingClientRect();
    const o = eye.current.getBoundingClientRect();
    const W = stage.width;
    const H = stage.height;
    const cx = o.left - stage.left + o.width / 2;
    const cy = o.top - stage.top + o.height / 2;
    const cover = Math.max(W / EYE.width, H / EYE.height);
    const px = W / 2;
    const py = H / 2 + (EYE.pupilY - 0.5) * EYE.height * cover;

    const q = ease(clamp(progress / 0.72));
    const reach = Math.hypot(Math.max(cx, W - cx), Math.max(cy, H - cy));
    const radius = o.width / 2 + (reach - o.width / 2) * q;
    const start = o.width / (EYE.irisShare * EYE.width * cover);
    const tx = (cx - px) * (1 - q);
    const ty = (cy - py) * (1 - q);
    const ptx = px + tx;
    const pty = py + ty;
    // Smallest scale that keeps the picture under the whole visible circle.
    const scale =
      Math.max(
        start + (1 - start) * q,
        (ptx - Math.max(0, cx - radius)) / px,
        (Math.min(W, cx + radius) - ptx) / (W - px),
        (pty - Math.max(0, cy - radius)) / py,
        (Math.min(H, cy + radius) - pty) / (H - py),
      ) +
      0.14 * clamp((progress - 0.72) / 0.28);

    layer.current.style.clipPath = `circle(${radius.toFixed(1)}px at ${cx.toFixed(1)}px ${cy.toFixed(1)}px)`;
    image.current.style.transformOrigin = `${px}px ${py}px`;
    image.current.style.transform = `translate(${tx.toFixed(1)}px, ${ty.toFixed(1)}px) scale(${scale.toFixed(4)})`;

    const fade = clamp((progress - 0.7) / 0.2);
    scrim.current.style.opacity = String(fade);
    say.current.style.opacity = String(fade);
    say.current.style.transform = `translateY(${(1 - fade) * 24}px)`;
  }, []);

  useScrollFrame(frame);

  return (
    <section ref={root} className="odh-eyehero">
      <div ref={pin} className="odh-eyehero__pin">
        <h1 className="odh-eyehero__title" aria-label="Build. Activate. Grow.">
          <span className="l" aria-hidden="true">
            Build.
            <span className="odh-chip">
              <Image src="/imagery/build.webp" alt="" width={1088} height={1360} sizes="240px" />
            </span>
          </span>
          <span className="l" aria-hidden="true">
            <span className="odh-chip">
              <Image src="/imagery/kiosk.webp" alt="" width={1088} height={1360} sizes="240px" />
            </span>
            Activate.
          </span>
          <span className="l" aria-hidden="true">
            Gr
            <span ref={eye} className="odh-eye" />
            w.
          </span>
        </h1>

        <div className="odh-eyehero__meta">
          <p className="odh-eyehero__th">{home.subtitle}</p>
          <p>{home.lead}</p>
          <div className="flex flex-wrap items-center gap-4">
            <Button variant="key" asChild>
              <Link href={contactHref}>
                {home.primary} <ArrowRight size={18} />
              </Link>
            </Button>
            <Link className="odh-link" href={workHref}>
              {home.secondary}
            </Link>
          </div>
        </div>

        <div ref={layer} className="odh-eyehero__reveal" aria-hidden="true">
          <Image ref={image} src="/imagery/eye.webp" alt="" width={EYE.width} height={EYE.height} sizes="100vw" priority />
          <div ref={scrim} className="odh-eyehero__scrim" />
          <p ref={say} className="odh-eyehero__say">
            {home.reveal[0]}
            <br />
            {home.reveal[1]}
          </p>
        </div>
      </div>
    </section>
  );
}
