// Re-derive sRGB hex values for any oklch() color tokens we still author
// in comments inside src/styles/tailwind.css. Use this when you tweak a
// token: edit the oklch comment, run `node scripts/measure-tokens.mjs`,
// then paste the printed hex over the existing value.
//
// Why hex and not oklch? Some accessibility tools (notably the axe-core
// build bundled in older releases of Accessibility Insights for Web)
// miscompute contrast against modern color literals. Serializing the
// canonical sRGB form sidesteps that entire class of bug while keeping
// the perceptual-uniform oklch authoring intent recorded in comments.
//
// Usage:
//   node scripts/measure-tokens.mjs                # measure the defaults
//   node scripts/measure-tokens.mjs "oklch(78% 0.13 280)" "oklch(...)" ...
import puppeteer from "puppeteer";

const argv = process.argv.slice(2);
const inputs = argv.length
  ? argv
  : [
      "oklch(97% 0.02 280)",
      "oklch(94% 0.04 280)",
      "oklch(87% 0.08 280)",
      "oklch(78% 0.13 280)",
      "oklch(68% 0.18 280)",
      "oklch(60% 0.21 280)",
      "oklch(52% 0.22 280)",
      "oklch(44% 0.20 280)",
      "oklch(36% 0.16 280)",
      "oklch(28% 0.12 280)",
    ];

const browser = await puppeteer.launch({ headless: true });
const page = await browser.newPage();
await page.setContent(`<!doctype html><html><body><div id="t"></div></body></html>`);
const out = await page.evaluate((inputs) => {
  const cv = document.createElement("canvas");
  cv.width = 1;
  cv.height = 1;
  const ctx = cv.getContext("2d");
  const t = document.getElementById("t");
  const hex = ([r, g, b]) =>
    "#" + [r, g, b].map((n) => n.toString(16).padStart(2, "0")).join("");
  return inputs.map((c) => {
    t.style.color = c;
    const computed = getComputedStyle(t).color;
    ctx.fillStyle = computed;
    ctx.fillRect(0, 0, 1, 1);
    const d = ctx.getImageData(0, 0, 1, 1).data;
    return { input: c, computed, hex: hex([d[0], d[1], d[2]]) };
  });
}, inputs);
await browser.close();

for (const { input, hex } of out) {
  console.log(`${hex}   /* ${input} */`);
}
