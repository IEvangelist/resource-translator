# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

## [3.0.2] - 2026-07-10

### Fixed

- **Translator requests now actually pin `api-version=3.0` on the wire.** The
  SDK (`@azure-rest/ai-translation-text` v2) only honors the client-level
  `apiVersion` option when a credential argument is passed to `createClient`.
  The action authenticates per-request via headers (no credential — to avoid
  the SDK's `Ocp-Apim-Subscription-Region: undefined` bug for regionless
  resources), so that option was silently dropped and every request defaulted
  to a preview `api-version`. That preview `/translate` contract rejected the
  request body with HTTP 400 (error code 400074, "The body of the request is
  not valid JSON"), breaking all `@v3` consumers. The action now pins
  `api-version=3.0` on the query string for both `/translate` and
  `/languages`. This completes the fix started in 3.0.1 (which corrected the
  request-body shape but did not, on its own, resolve the failure). Regression
  introduced in 3.0.0 by the Azure AI Translator SDK migration.

## [3.0.1] - 2026-07-10

### Fixed

- **Translator `/translate` request body is now a bare JSON array.** The
  `POST /translate` call was wrapping the payload as `{ inputs: [...] }`; the
  v3.0 REST contract requires a bare array of `{ text }` items. On its own
  this change did not restore translations — see 3.0.2 for the `api-version`
  fix that actually resolves the HTTP 400 (error code 400074). Regression
  introduced in 3.0.0 by the Azure AI Translator SDK migration.

## [3.0.0] - 2026-07-08

### Changed

- **Translator client now uses the official Azure SDK.** Replaced the
  hand-rolled `axios`-based REST client with
  [`@azure-rest/ai-translation-text`](https://www.npmjs.com/package/@azure-rest/ai-translation-text)
  on top of `@azure/core-rest-pipeline`. Retries on 408/429/5xx, auth
  header injection, error envelope parsing, and request/response typing
  are now handled by the SDK. Public action behaviour and inputs are
  unchanged. Net bundle size dropped ~280 KB after dropping `axios`.

### Added

- New action inputs: `include`, `exclude`, `configPath`, `categoryId`,
  `apiVersion`, `dryRun`, `failOnError`, plus advanced Translator request
  knobs `textType`, `profanityAction`, `profanityMarker`, and
  `allowFallback`.
- **Resilience inputs:** `maxRetries` and `retryBackoffMs` control the
  retry-on-transient-status loop. Honors Azure's `Retry-After` header
  exactly when present; otherwise jittered exponential backoff capped
  at `retryBackoffMs`. Closes #46.
- **Placeholder protection:** `protectPlaceholders` (on by default) and
  `customPlaceholderPatterns` shield i18next/Mustache `{{name}}`,
  ES `${var}`, .NET `{0}`/`{0:N2}`, printf `%s`/`%1$s` and HTML
  entities from translation. Tightens #16.
- **Per-key opt-out:** `noTranslatePatterns` glob-matches parser-level
  keys (JSON dotted path, RESX `name`, PO `msgid`, XLIFF unit `id`,
  INI/restext key) and skips them in the Translator request, preserving
  the source value verbatim. Closes #35.
- Optional repository configuration via `.github/resource-translator.yml`
  (action inputs always win over repo config).
- Source locale is now always forwarded to Translator as `from=<locale>`
  so short strings aren't autodetected.
- Post-translation glossary support for fixed term overrides.
- Step summary emitted via `core.summary` in addition to outputs.
- Astro + Tailwind v4 docs site at `docs/`, deployed to GitHub Pages.
- **Translations showcase**: `/translations` page that renders the docs
  site's i18n source in every Azure-supported locale, plus a new
  `translate-docs` workflow that dogfoods this action on its own docs
  whenever `docs/src/content/i18n/messages.en.json` changes. Source of
  truth for supported locales is `docs/src/data/azure-locales.json`.
- Dependabot auto-merge workflow for green minor/patch updates, with
  explicit ignore rules for `@actions/{core,github,glob}` ESM majors so
  the CommonJS bundle stays runnable.
- CodeQL JS/TS scanning on PRs and weekly.
- CI matrix across Ubuntu, Windows, macOS × Node 20/22/24.
- `SECURITY.md`, `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, plus issue + PR
  templates.

### Changed

- Bumped action runtime from `node16` to `node24` (BREAKING).
- Replaced `@vercel/ncc` with `esbuild` for the bundler.
- Pinned `@actions/*` to last-CommonJS majors during the ecosystem's ESM
  transition (no security delta).
- Modernised `tsconfig` (ES2022, additional strict flags).
- Migrated to ESLint 9 flat config + Prettier + EditorConfig.
- Bumped `eslint` and `@eslint/js` to v10, `globals` to v17, docs
  `typescript` to v6 to match root, and the workflow GitHub Actions
  `actions/checkout@v7`, `actions/upload-pages-artifact@v5`,
  `peter-evans/create-pull-request@v8`, `softprops/action-gh-release@v3`,
  `dependabot/fetch-metadata@v3`.
- Modernised major dependencies: `@azure-rest/ai-translation-text` v2,
  `js-yaml` v5, `@types/node` v26 (root); `astro` v7 wired through the
  first-party `@tailwindcss/vite` plugin, plus `tar`, `vite`, `esbuild`,
  and `ws` security bumps (docs). Clears every outstanding Dependabot
  update.
- Refreshed the docs landing page with a custom translation logo, a
  vibrant indigo→fuchsia→amber palette, Lucide icons, view transitions,
  Expressive Code-rendered code samples, and a self-hosted Inter font.
- Polished docs UX with a collapsible sidebar, a mobile drawer with
  `inert` background + skip-link, larger base type, AA-tuned gradient
  headings, `cursor: pointer` on every interactive element, per-format
  spec links + examples, and Catppuccin Expressive Code themes that
  match the brand palette.
- **Docs accessibility (WCAG 2.1 AA pass):** logo glyphs (`A` / `文`)
  rendered as paths instead of inline `<text>` so they no longer fail
  axe color-contrast against gradient stops; the floating Back to top
  button uses `inert` while hidden (instead of a stale `aria-hidden`
  toggle that left the natively-focusable button tabbable);
  `formats.astro` section IDs renamed to `format-<id>` to avoid colliding
  with auto-generated heading IDs; three locale cards now declare
  BCP-47-valid `lang` attributes via a new optional `bcp47` field on
  `azure-locales.json` (`nya→ny`, `lug→lg`, `run→rn`); duplicate
  `Documentation` landmark labels disambiguated between the sidebar and
  the footer; every data table on `inputs` and `configuration` now has a
  screen-reader-only `<caption>`; and the homepage no longer renders the
  sidebar drawer toggle (which would otherwise leak a labelled-but-hidden
  form field). Verified end-to-end with a new `npm run audit:a11y`
  pa11y harness (`docs/scripts/a11y-audit.mjs`, axe + htmlcs runners).
- **Inline code styling:** docs prose `<code>` now wears the warm/amber
  theme accent (warm-700 on a soft warm-tinted chip in light mode,
  warm-300 in dark) — distinct from the brand→accent palette used for
  links and headings, so inline code is visually punctuated without
  competing with link affordances.

### Removed

- Unused dependencies: `@actions/cache`, `@actions/io`,
  `@actions/tool-cache`, `uuid`, `uuidv4`.

### Security

- Resolved all outstanding Dependabot security alerts across the root and
  docs lockfiles (`js-yaml`, `@babel/core`, `tar`, `vite`, `esbuild`, `ws`);
  `npm audit` now reports 0 vulnerabilities in both workspaces.

## [2.0.6]

See git history for releases prior to v3.

[Unreleased]: https://github.com/IEvangelist/resource-translator/compare/v3.0.0...HEAD
[3.0.0]: https://github.com/IEvangelist/resource-translator/compare/v2.0.6...v3.0.0
[2.0.6]: https://github.com/IEvangelist/resource-translator/releases/tag/v2.0.6
