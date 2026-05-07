// Direct axe-core color-contrast scan via puppeteer. Tests both light + dark
// themes and both mobile + desktop viewports so we don't miss conditional
// elements pa11y's single-pass scan skips.
//
// Usage (assumes http-server already running):
//   node scripts/contrast-scan.mjs <path>
//   node scripts/contrast-scan.mjs /            # default
//
// Reads from A11Y_ORIGIN (default http://127.0.0.1:8765). Prints a report and
// exits 0 either way.
import puppeteer from "puppeteer";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const axeSource = readFileSync(
  join(__dirname, "../node_modules/axe-core/axe.min.js"),
  "utf8",
);

const ORIGIN = process.env.A11Y_ORIGIN ?? "http://127.0.0.1:8765";
const PATH = process.argv[2] ?? "/";
const URL = ORIGIN + PATH;

const SCENARIOS = [
  { name: "light @ 1280x900", width: 1280, height: 900, dark: false },
  { name: "dark  @ 1280x900", width: 1280, height: 900, dark: true },
  { name: "light @ 390x844", width: 390, height: 844, dark: false },
  { name: "dark  @ 390x844", width: 390, height: 844, dark: true },
];

const browser = await puppeteer.launch({ headless: true });
const all = [];
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
  await page.evaluate((src) => eval(src), axeSource);
  const result = await page.evaluate(async () => {
    return await window.axe.run(document, {
      runOnly: { type: "rule", values: ["color-contrast"] },
      resultTypes: ["violations", "incomplete"],
    });
  });
  await page.close();
  for (const v of [...result.violations, ...result.incomplete]) {
    for (const node of v.nodes) {
      all.push({
        scenario: s.name,
        kind: result.violations.includes(v) ? "VIOLATION" : "INCOMPLETE",
        impact: node.impact,
        target: node.target.join(" >> "),
        summary: (node.failureSummary || "(no failure summary)").trim(),
        html: node.html.length > 220 ? node.html.slice(0, 220) + "…" : node.html,
      });
    }
  }
}
await browser.close();

console.log(`scanned ${URL}`);
const violations = all.filter((v) => v.kind === "VIOLATION");
const incomplete = all.filter((v) => v.kind === "INCOMPLETE");
console.log(
  `scenarios: ${SCENARIOS.length}, violations: ${violations.length}, incomplete: ${incomplete.length}\n`,
);
for (const v of all) {
  console.log(`[${v.scenario}] ${v.kind} ${v.impact ?? "?"}`);
  console.log(`  target: ${v.target}`);
  console.log(`  html:   ${v.html}`);
  console.log(`  ${v.summary.replace(/\n/g, "\n  ")}`);
  console.log();
}
