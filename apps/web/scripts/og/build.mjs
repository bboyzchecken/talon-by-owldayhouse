// Renders the share cards in scripts/og/cards.json to public/og/<out>.png.
// Each card is laid out as real HTML in the brand fonts, then screenshotted with
// headless Chrome, so Thai typography matches the site. Run it after editing
// cards.json or the layout below:  node scripts/og/build.mjs
//
// Output is committed — the static export just serves the files.

import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const webRoot = resolve(here, "../..");
const publicDir = join(webRoot, "public");
const outDir = join(publicDir, "og");

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const WIDTH = 1200;
const HEIGHT = 630;

// Brand tokens — mirrored from @odh/brand because this script runs outside the bundler.
const NAVY = "#28254c";
const GOLD = "#e9a41b";
const INK = "#15151c";
const GRAY600 = "#5a5a66";

const MIME = { svg: "image/svg+xml", webp: "image/webp", png: "image/png", jpg: "image/jpeg" };

/** Inline an asset so headless Chrome never has to fetch it. Paths are relative to apps/web. */
function dataUri(path) {
  const mime = MIME[path.split(".").pop()];
  if (!mime) throw new Error(`Unsupported asset: ${path}`);
  return `data:${mime};base64,${readFileSync(join(webRoot, path)).toString("base64")}`;
}

const logo = dataUri("public/brand/owl-logo.svg");

const escapeHtml = (s) => s.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c]);

function html({ label, headline, photo }) {
  const textWidth = photo ? 700 : WIDTH;
  const startSize = photo ? 52 : 68;
  return `<!doctype html>
<html lang="th"><head><meta charset="utf-8">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,700&family=Anuphan:wght@600;700&family=IBM+Plex+Sans+Thai:wght@400;500&family=DM+Mono:wght@500&display=swap" rel="stylesheet">
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{width:${WIDTH}px;height:${HEIGHT}px;background:#fff;overflow:hidden}
  .card{display:flex;width:${WIDTH}px;height:${HEIGHT}px}
  .text{width:${textWidth}px;display:flex;flex-direction:column;align-items:flex-start;justify-content:space-between;padding:64px}
  .logo{height:34px;width:168px;display:block}
  .bar{display:block;width:56px;height:5px;background:${GOLD}}
  .label{margin-top:26px;font-family:"DM Mono","IBM Plex Sans Thai",monospace;font-weight:500;font-size:19px;letter-spacing:.13em;text-transform:uppercase;color:${GRAY600}}
  .headline{margin-top:18px;font-family:"Bricolage Grotesque","Anuphan",sans-serif;font-weight:700;font-size:${startSize}px;line-height:1.16;color:${NAVY};text-wrap:balance;word-break:break-word}
  .site{font-family:"DM Mono","IBM Plex Sans Thai",monospace;font-weight:500;font-size:19px;letter-spacing:.06em;color:${INK};opacity:.45}
  .photo{flex:1;overflow:hidden}
  .photo img{width:100%;height:100%;object-fit:cover;display:block}
</style></head>
<body>
  <div class="card">
    <div class="text">
      <img class="logo" src="${logo}" alt="Owl Day House">
      <div class="mid">
        <span class="bar"></span>
        <p class="label">${escapeHtml(label)}</p>
        <h1 class="headline">${escapeHtml(headline).replaceAll("|", "<br>")}</h1>
      </div>
      <p class="site">owldayhouse.com</p>
    </div>
    ${photo ? `<div class="photo"><img src="${dataUri(photo)}" alt=""></div>` : ""}
  </div>
  <script>
    // Shrink the headline until the column fits — Thai and English run to different lengths.
    document.fonts.ready.then(() => {
      const col = document.querySelector(".text");
      const h = document.querySelector(".headline");
      let size = parseFloat(getComputedStyle(h).fontSize);
      while (col.scrollHeight > col.clientHeight && size > 26) {
        size -= 2;
        h.style.fontSize = size + "px";
      }
      document.title = "ready";
    });
  </script>
</body></html>`;
}

const manifest = JSON.parse(readFileSync(join(here, "cards.json"), "utf8"));
const work = mkdtempSync(join(tmpdir(), "odh-og-"));
const profile = mkdtempSync(join(tmpdir(), "odh-chrome-"));

try {
  for (const card of manifest.cards) {
    const page = join(work, `${card.out.replace(/\//g, "_")}.html`);
    writeFileSync(page, html(card));
    const jpg = join(outDir, `${card.out}.jpg`);
    const png = join(work, `${card.out.replace(/\//g, "_")}.png`);
    mkdirSync(dirname(jpg), { recursive: true });
    execFileSync(CHROME, [
      "--headless=new",
      "--disable-gpu",
      "--hide-scrollbars",
      `--user-data-dir=${profile}`,
      "--force-device-scale-factor=1",
      `--window-size=${WIDTH},${HEIGHT}`,
      "--virtual-time-budget=10000",
      `--screenshot=${png}`,
      pathToFileURL(page).href,
    ], { stdio: ["ignore", "ignore", "pipe"] });
    // JPEG keeps each card near 100 KB; crawlers re-encode the image anyway.
    execFileSync("sips", ["-s", "format", "jpeg", "-s", "formatOptions", "88", png, "--out", jpg], {
      stdio: ["ignore", "ignore", "pipe"],
    });
    console.log(`og/${card.out}.jpg`);
  }
} finally {
  rmSync(work, { recursive: true, force: true });
  rmSync(profile, { recursive: true, force: true });
}

console.log(`\n${manifest.cards.length} cards → public/og/`);
