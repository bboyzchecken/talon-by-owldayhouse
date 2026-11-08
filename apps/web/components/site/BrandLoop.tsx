import type { CSSProperties } from "react";
import { Clapperboard, Database, Ear, Gamepad2, Globe, Megaphone, MessagesSquare, Smartphone, Users, type LucideIcon } from "lucide-react";
import { SectionHead } from "@/components/site/sections";
import type { Copy } from "@/content/copy";

/* A figure of eight in a 920×400 box. It starts at the crossing, circles the left lobe, then the right. */
const LOOP_PATH = "M500 240C440 160 380 90 270 90C165 90 90 155 90 240C90 325 165 390 270 390C380 390 440 320 500 240C560 160 620 90 730 90C835 90 910 155 910 240C910 325 835 390 730 390C620 390 560 320 500 240Z";
const VIEW_BOX = "40 40 920 400";

interface Tile {
  icon: LucideIcon;
  /** Tile width in px at full size. */
  size: number;
  /** Centre on wide screens, in percent of the stage. */
  x: number;
  y: number;
  /** Centre on narrow screens, where the loop stands upright. */
  mx: number;
  my: number;
  delay: string;
}

/* Three tiles per pillar, one for each of its services. */
const tiles: Tile[] = [
  { icon: Globe, size: 76, x: 6, y: 20, mx: 11, my: 7, delay: "0s" },
  { icon: Smartphone, size: 60, x: 12.5, y: 52, mx: 89, my: 13, delay: "-1.4s" },
  { icon: Database, size: 84, x: 5.5, y: 82, mx: 10, my: 30, delay: "-3.1s" },
  { icon: Gamepad2, size: 72, x: 50, y: 18, mx: 10, my: 50, delay: "-0.7s" },
  { icon: Users, size: 72, x: 50, y: 82, mx: 90, my: 42, delay: "-2.3s" },
  { icon: Clapperboard, size: 56, x: 60, y: 5, mx: 89, my: 58, delay: "-3.8s" },
  { icon: Megaphone, size: 84, x: 94, y: 20, mx: 11, my: 71, delay: "-1.9s" },
  { icon: MessagesSquare, size: 60, x: 87.5, y: 50, mx: 90, my: 87, delay: "-4.2s" },
  { icon: Ear, size: 76, x: 94.5, y: 82, mx: 12, my: 93, delay: "-0.3s" },
];

const place = (x: number, y: number, mx: number, my: number) => ({ "--x": `${x}%`, "--y": `${y}%`, "--mx": `${mx}%`, "--my": `${my}%` }) as CSSProperties;

/* Where each stage sits on the loop: left lobe, crossing, right lobe. */
const pills = [place(25, 50, 50, 25), place(50, 50, 50, 50), place(75, 50, 50, 75)];
const glows = [place(25, 50, 50, 25), place(75, 50, 50, 75)];

/** Shows Build, Activate and Grow as one continuous loop. Runs on CSS alone. */
export function BrandLoop({ loop }: { loop: Copy["home"]["loop"] }) {
  return (
    <section className="odh-sec odh-wrap">
      <SectionHead label="How it connects">
        {loop.title} <em>{loop.titleKey}</em>
      </SectionHead>

      <div className="odh-loop" aria-hidden="true">
        <div className="odh-loop__ring">
          {glows.map((style, index) => (
            <i key={index} className="odh-loop__glow" style={style} />
          ))}
          <svg className="odh-loop__svg" viewBox={VIEW_BOX} fill="none">
            <path className="odh-loop__band" d={LOOP_PATH} />
            <path className="odh-loop__line" d={LOOP_PATH} />
          </svg>
          {/* Kept apart from the band so the moving comet never repaints its shadow. */}
          <svg className="odh-loop__svg" viewBox={VIEW_BOX} fill="none">
            <path className="odh-loop__comet odh-loop__comet--far" d={LOOP_PATH} pathLength={100} />
            <path className="odh-loop__comet odh-loop__comet--near" d={LOOP_PATH} pathLength={100} />
            <path className="odh-loop__comet odh-loop__comet--head" d={LOOP_PATH} pathLength={100} />
          </svg>
          {loop.stages.map((stage, index) => (
            <span key={stage.word} className={`odh-loop__pill odh-loop__pill--${index}`} style={pills[index]}>
              {stage.word}
            </span>
          ))}
        </div>
        {tiles.map(({ icon: Icon, size, x, y, mx, my, delay }) => (
          <span key={`${x}-${y}`} className="odh-loop__tile" style={{ ...place(x, y, mx, my), "--z": size, "--d": delay } as CSSProperties}>
            <Icon strokeWidth={1.75} />
          </span>
        ))}
      </div>

      <ol className="odh-steps odh-loop__steps">
        {loop.stages.map((stage) => (
          <li key={stage.word}>
            <p className="odh-mono">{stage.word}</p>
            <h3>{stage.title}</h3>
            <p>{stage.text}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
