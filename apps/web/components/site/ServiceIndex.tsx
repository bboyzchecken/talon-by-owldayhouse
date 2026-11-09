"use client";

import { useEffect, useRef, type PointerEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import type { Service } from "@/content/services";
import { CapabilityTag } from "./CapabilityTag";
import type { Copy } from "@/content/copy";

interface ServiceIndexProps {
  services: Service[];
  labels: Copy["capability"];
  /** Localized services path with trailing slash, e.g. "/en/services/". */
  basePath: string;
}

/** Large service list. On hover, an image follows the cursor. */
export function ServiceIndex({ services, labels, basePath }: ServiceIndexProps) {
  const root = useRef<HTMLDivElement>(null);
  const float = useRef<HTMLDivElement>(null);
  const floatImage = useRef<HTMLImageElement>(null);
  const motion = useRef({ tx: 0, ty: 0, x: 0, y: 0, live: false, raf: 0 });

  useEffect(() => {
    const state = motion.current;
    return () => cancelAnimationFrame(state.raf);
  }, []);

  const loop = () => {
    const state = motion.current;
    state.x += (state.tx - state.x) * 0.16;
    state.y += (state.ty - state.y) * 0.16;
    if (float.current) float.current.style.transform = `translate(${state.x.toFixed(1)}px, ${state.y.toFixed(1)}px)`;
    if (state.live) state.raf = requestAnimationFrame(loop);
  };

  const onMove = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "touch" || !root.current) return;
    const rect = root.current.getBoundingClientRect();
    motion.current.tx = event.clientX - rect.left + 24;
    motion.current.ty = event.clientY - rect.top - 160;
  };

  const onEnter = (event: PointerEvent<HTMLAnchorElement>, image: string) => {
    if (event.pointerType === "touch" || !float.current || !floatImage.current) return;
    floatImage.current.src = image;
    float.current.style.opacity = "1";
    if (!motion.current.live) {
      motion.current.live = true;
      loop();
    }
  };

  const onLeave = () => {
    motion.current.live = false;
    if (float.current) float.current.style.opacity = "0";
  };

  return (
    <div ref={root} className="odh-index" onPointerMove={onMove} onPointerLeave={onLeave}>
      {services.map((service) => (
        <Link
          key={service.slug}
          href={`${basePath}${service.slug}/`}
          className="odh-index__row"
          onPointerEnter={(event) => onEnter(event, service.image)}
        >
          <span className="odh-mono">{service.pillar.toUpperCase()}</span>
          <h3>{service.title}</h3>
          {service.capability === "partner" ? <CapabilityTag kind="partner" labels={labels} /> : <span />}
          <Image className="odh-index__thumb" src={service.image} alt="" width={144} height={144} />
        </Link>
      ))}
      <div ref={float} className="odh-index__float" aria-hidden="true">
        <Image ref={floatImage} src={services[0]?.image ?? ""} alt="" width={520} height={650} />
      </div>
    </div>
  );
}
