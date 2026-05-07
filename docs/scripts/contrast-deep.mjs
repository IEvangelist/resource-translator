// Brute-force contrast scanner that enumerates every text-bearing element,
// walks up its ancestor chain to resolve the first opaque background color,
// then computes WCAG contrast ratio. Catches issues axe's color-contrast rule
// marks as "incomplete" or skips entirely (translucent stacks, gradients,
// elements with computed alpha < 1).
//
// Usage:
//   node scripts/contrast-deep.mjs <path>   # default /
import puppeteer from "puppeteer";

const ORIGIN = process.env.A11Y_ORIGIN ?? "http://127.0.0.1:8765";
const PATH = process.argv[2] ?? "/";
const URL = ORIGIN + PATH;

const SCENARIOS = [
  { name: "light @ 1280", width: 1280, height: 900, dark: false },
  { name: "dark  @ 1280", width: 1280, height: 900, dark: true },
];

const browser = await puppeteer.launch({ headless: true });

for (const s of SCENARIOS) {
  const page = await browser.newPage();
  await page.setViewport({ width: s.width, height: s.height });
  await page.emulateMediaFeatures([
    { name: "prefers-color-scheme", value: s.dark ? "dark" : "light" },
    { name: "prefers-reduced-motion", value: "reduce" },
  ]);
  await page.goto(URL, { waitUntil: "networkidle0" });
  if (s.dark) {
    await page.evaluate(() => document.documentElement.classList.add("dark"));
  }

  const findings = await page.evaluate(() => {
    function parseColor(c) {
      const m = c.match(/rgba?\(([^)]+)\)/);
      if (!m) return null;
      const [r, g, b, a = "1"] = m[1].split(",").map((s) => parseFloat(s));
      return [r, g, b, a];
    }
    function srgbToLinear(c) {
      c /= 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    }
    function relLum([r, g, b]) {
      return (
        0.2126 * srgbToLinear(r) +
        0.7152 * srgbToLinear(g) +
        0.0722 * srgbToLinear(b)
      );
    }
    function blend(top, bottom) {
      const a = top[3];
      return [
        top[0] * a + bottom[0] * (1 - a),
        top[1] * a + bottom[1] * (1 - a),
        top[2] * a + bottom[2] * (1 - a),
        1,
      ];
    }
    function effectiveBg(el) {
      // walk up until we accumulate full opacity. Treat background-image
      // (gradients/meshes) as a "stop" — if a parent has a non-none
      // background-image, we use its solid color stop fallback (cs.backgroundColor)
      // but flag the element as "over-image" so we know to investigate.
      let acc = [0, 0, 0, 0];
      let overImage = false;
      let cur = el;
      while (cur && cur instanceof Element) {
        const cs = getComputedStyle(cur);
        const bgi = cs.backgroundImage;
        if (bgi && bgi !== "none") overImage = true;
        const bg = parseColor(cs.backgroundColor);
        if (bg && bg[3] > 0) {
          acc = acc[3] === 0 ? bg : blend(acc, bg);
          if (acc[3] >= 0.999) return { bg: acc, overImage };
        }
        cur = cur.parentElement;
      }
      // Fall back to body bg if nothing opaque
      const bodyBg = parseColor(getComputedStyle(document.body).backgroundColor);
      if (bodyBg && bodyBg[3] > 0) return { bg: blend(acc, bodyBg), overImage };
      return { bg: [255, 255, 255, 1], overImage };
    }
    function contrast(a, b) {
      const la = relLum(a),
        lb = relLum(b);
      const [hi, lo] = la > lb ? [la, lb] : [lb, la];
      return (hi + 0.05) / (lo + 0.05);
    }

    const out = [];
    const all = document.querySelectorAll("body *");
    for (const el of all) {
      // Skip non-rendered
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) continue;
      const cs = getComputedStyle(el);
      if (cs.visibility === "hidden" || cs.display === "none") continue;
      if (cs.opacity === "0") continue;
      // Must have direct text content
      let hasText = false;
      for (const n of el.childNodes) {
        if (n.nodeType === 3 && n.textContent.trim().length > 0) {
          hasText = true;
          break;
        }
      }
      if (!hasText) continue;

      const fg = parseColor(cs.color);
      if (!fg) continue;
      const { bg, overImage } = effectiveBg(el);
      // composite fg over bg if alpha < 1
      const composedFg = fg[3] < 1 ? blend(fg, bg) : fg;
      const ratio = contrast(composedFg, bg);

      // Determine threshold: 18pt+ or 14pt+ bold = 3.0; else 4.5
      const sizePx = parseFloat(cs.fontSize);
      const weight = parseInt(cs.fontWeight, 10) || 400;
      const isLargeText =
        sizePx >= 24 || (sizePx >= 18.66 && weight >= 700);
      const threshold = isLargeText ? 3.0 : 4.5;

      if (ratio < threshold) {
        const text = (el.textContent || "").trim().slice(0, 60);
        const sel =
          (el.tagName.toLowerCase()) +
          (el.id ? "#" + el.id : "") +
          (el.className && typeof el.className === "string"
            ? "." + el.className.trim().split(/\s+/).slice(0, 2).join(".")
            : "");
        out.push({
          ratio: ratio.toFixed(2),
          threshold,
          fontSize: sizePx,
          weight,
          fg: `rgb(${composedFg.slice(0, 3).map((n) => Math.round(n)).join(",")})`,
          bg: `rgb(${bg.slice(0, 3).map((n) => Math.round(n)).join(",")})`,
          overImage,
          tag: sel,
          text,
        });
      }
    }
    return out;
  });

  await page.close();

  console.log(`\n========= ${s.name} ========= (${findings.length} below-threshold)`);
  // Group by selector + text snippet to dedupe
  const grouped = new Map();
  for (const f of findings) {
    const key = `${f.tag}::${f.text}::${f.fg}::${f.bg}`;
    if (!grouped.has(key)) grouped.set(key, { ...f, count: 0 });
    grouped.get(key).count++;
  }
  for (const [, f] of grouped) {
    console.log(
      `  ${f.ratio.padStart(5)}:1 (need ${f.threshold}) ${f.overImage ? "[gradient]" : "          "} ${f.tag}`,
    );
    console.log(
      `         fg ${f.fg} bg ${f.bg} ${f.fontSize}px w${f.weight} x${f.count}`,
    );
    console.log(`         "${f.text}"`);
  }
}
await browser.close();
