// Run pa11y (axe + htmlcs) against every built page in dist/ and dump a
// JSON report we can iterate through. Used during the WCAG AA fix-up; not
// wired into CI yet.
//
// Usage:
//   npm run build                                  # produce dist/
//   npx http-server dist -p 8765 -s --silent &     # serve dist/ statically
//   npm run audit:a11y                             # writes a11y-report.json
//
// Override the origin via A11Y_ORIGIN if you serve on a different port.
import pa11y from "pa11y";
import { readdirSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const ORIGIN = process.env.A11Y_ORIGIN ?? "http://127.0.0.1:8765";
const DIST = "dist";

function* walk(dir) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) yield* walk(full);
    else if (entry === "index.html") yield full;
  }
}

const pages = [...walk(DIST)]
  .map((p) =>
    p
      .replaceAll("\\", "/")
      .replace(/^dist/, "")
      .replace(/\/index\.html$/, "/")
      .replace(/^$/, "/"),
  )
  .filter((p) => !p.startsWith("/pagefind"));

const seen = new Set();
const urls = pages.filter((p) => (seen.has(p) ? false : seen.add(p)));

const results = [];
for (const url of urls) {
  const full = ORIGIN + url;
  process.stderr.write(`auditing ${full}\n`);
  try {
    const r = await pa11y(full, {
      runners: ["axe", "htmlcs"],
      standard: "WCAG2AA",
      timeout: 60000,
      includeNotices: false,
      includeWarnings: true,
    });
    results.push({ url, issues: r.issues });
  } catch (err) {
    results.push({ url, error: String(err) });
  }
}

const total = results.reduce((n, r) => n + (r.issues?.length ?? 0), 0);
const errorCount = results.reduce(
  (n, r) =>
    n + (r.issues?.filter((i) => i.type === "error").length ?? 0),
  0,
);

writeFileSync(
  "a11y-report.json",
  JSON.stringify({ origin: ORIGIN, total, errorCount, results }, null, 2),
);
process.stderr.write(
  `\n${urls.length} pages audited — ${total} issues (${errorCount} errors).\n`,
);
