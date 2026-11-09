// Generates the photography behind the share cards with the FLUX image API.
// Build input only — the files land in scripts/og/art/ and are baked into
// public/og/news/*.png by build.mjs, so they are never served on their own.
//
//   BFL_API_KEY=... node scripts/og/news-art.mjs [name ...]
//
// Prompts follow the site's photography: bright, white and pale grey, soft
// daylight, one warm golden light, generous negative space, no text anywhere.

import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const artDir = join(here, "art");

const KEY = process.env.BFL_API_KEY;
if (!KEY) throw new Error("Set BFL_API_KEY in the environment (never commit it).");

const STYLE =
  "Editorial architectural photograph, bright and airy, white and pale grey palette, " +
  "soft diffused daylight from a large skylight, one warm golden accent light, " +
  "generous negative space, calm professional mood, shot on 35mm, shallow depth of field, " +
  "muted natural colour, no text, no lettering, no signage, no logos, no watermark.";

const SCENES = {
  services:
    "A bright white meeting room in Bangkok: four Thai colleagues around a pale table with " +
    "laptops and printed layouts, one standing and pointing at a large wall screen showing " +
    "plain pale shapes, relaxed working mood.",
  work:
    "A white office desk against a bright wall: a large monitor showing a pale abstract dashboard " +
    "of simple charts, a keyboard, a notebook and pen, an office chair, a tall window to the side. " +
    "An office, not a home, no bed, no bedding, no blanket.",
  about:
    "Five Thai colleagues in smart casual clothes standing and talking in a bright white office " +
    "with a tall window, candid mid-conversation, warm and professional.",
  contact:
    "A calm bright reception area: a pale stone counter, a small plant, a notebook and a pen, a " +
    "phone face down, tall window light falling across the surface, nobody in frame.",
  tools:
    "A tall touchscreen kiosk standing in a bright white exhibition hall, its screen showing " +
    "plain pale interface shapes, a visitor's hand reaching toward it, clean minimal surroundings.",
  "news-index":
    "A quiet modern office corner in Bangkok: a wide white desk by a tall window, an open " +
    "notebook and a pen, a laptop closed, a single glass of water, morning light across the surface.",
  "ngan-poet-tua-khrongkan-song-lead-sales":
    "A property launch event in a bright white hall: a large architectural scale model of a " +
    "condominium on a white plinth, Thai visitors in smart business clothes looking at it, " +
    "a sales consultant holding a tablet in the middle distance.",
  "open-house-wat-phon-phu-samak":
    "A university open house in a bright white exhibition hall: Thai high-school students in " +
    "uniform at a clean white registration counter, a staff member with a tablet greeting them, " +
    "a row of simple white booths behind.",
  "kep-raichue-lukkha-na-booth-pdpa":
    "Close view at a clean white exhibition booth: a visitor's hands tapping a consent form on a " +
    "tablet mounted on a white stand, a staff member slightly out of focus behind, soft daylight.",
  "thurakit-prap-tua-yuk-ai":
    "A minimal software studio: a Thai developer seen from behind at a large monitor showing " +
    "abstract pale interface panels, a white desk, a second empty chair, bright window light.",
};

const WIDTH = 832;
const HEIGHT = 1056; // matches the card's photo panel (roughly 4:5)

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function generate(slug, scene) {
  const start = await fetch("https://api.bfl.ai/v1/flux-pro-1.1", {
    method: "POST",
    headers: { "Content-Type": "application/json", accept: "application/json", "x-key": KEY },
    body: JSON.stringify({
      prompt: `${scene} ${STYLE}`,
      width: WIDTH,
      height: HEIGHT,
      output_format: "png",
      prompt_upsampling: false,
      safety_tolerance: 2,
    }),
  });
  if (!start.ok) throw new Error(`${slug}: request failed (${start.status})`);
  const { polling_url: pollingUrl } = await start.json();

  for (let attempt = 0; attempt < 120; attempt++) {
    await sleep(2000);
    const res = await fetch(pollingUrl, { headers: { accept: "application/json", "x-key": KEY } });
    const body = await res.json();
    if (body.status === "Ready") return body.result.sample;
    if (body.status !== "Pending" && body.status !== "Request Moderated") {
      throw new Error(`${slug}: ${body.status}`);
    }
    if (body.status === "Request Moderated") throw new Error(`${slug}: prompt was moderated`);
  }
  throw new Error(`${slug}: timed out`);
}

const wanted = process.argv.slice(2);
const slugs = wanted.length ? wanted : Object.keys(SCENES);
mkdirSync(artDir, { recursive: true });

for (const slug of slugs) {
  const scene = SCENES[slug];
  if (!scene) throw new Error(`No scene for "${slug}"`);
  const url = await generate(slug, scene);
  const png = join(artDir, `${slug}.png`);
  const webp = join(artDir, `${slug}.webp`);
  writeFileSync(png, Buffer.from(await (await fetch(url)).arrayBuffer()));
  // webp keeps the card build input small (cwebp comes with the webp tools).
  execFileSync("cwebp", ["-q", "82", "-quiet", png, "-o", webp]);
  execFileSync("rm", [png]);
  console.log(`art/${slug}.webp`);
}
