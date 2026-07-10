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

## [2.2.1] - 2024-01-05

### Security

- Dependency maintenance: bumped `axios` (1.4.0 → 1.6.0), `@babel/traverse`,
  `semver`, and `tough-cookie`/`@azure/ms-rest-js` to clear Dependabot alerts.

## [2.2.0] - 2023-07-05

### Changed

- Maintenance release (dependency and `dist` refresh).

## [2.1.9] - 2023-04-11

### Changed

- Dependency upgrades (including `xml2js` 0.4.23 → 0.5.0) and a refreshed
  `dist` build.

## [2.1.8] - 2023-01-02

### Security

- Bumped vulnerable dependencies: `follow-redirects`, `node-fetch`,
  `decode-uri-component`, `minimist`, `ansi-regex`, `jsdom`, `json5`,
  `minimatch`, and `@actions/core` (1.2.6 → 1.9.1).

## [2.1.7] - 2021-12-09

### Changed

- Use a different delimiter when building the translation map so keys
  containing the previous separator are handled correctly (#36).

### Fixed

- Fixes #32.

## [2.1.6] - 2021-08-04

### Fixed

- Assorted bug fixes and improved logging.

## [2.1.5] - 2021-07-28

### Fixed

- Fix an issue with file names containing four segments.

## [2.1.4] - 2021-05-20

### Added

- JSON parser and `.json` file support.

### Fixed

- Fix batching bug (#18).

## [2.1.3] - 2021-02-22

### Changed

- Maintenance release.

## [2.1.2] - 2021-02-18

### Fixed

- Fixes #15.

## [2.1.1] - 2020-12-02

### Fixed

- Fix the generated step summary.

## [2.1.0] - 2020-12-01

### Added

- Support for additional resource file formats beyond `.resx`: `.ini`,
  `.po`, `.restext`, and `.xliff`.

## [2.0.4] - 2020-11-17

### Changed

- Maintenance release.

## [2.0.3] - 2020-11-15

### Fixed

- Fixes a batching bug and other related issues.

## [2.0.2] - 2020-11-12

### Added

- File filtering to limit excessive translations.
- Batching of the translate API call to avoid rate limiting.

## [2.0.1] - 2020-11-12

### Added

- New action outputs: `has-new-translations`, `summary-title`, and
  `summary-details`.

### Fixed

- Fix a bug where an `error` was logged but the action failure was not set.

## [2.0.0] - 2020-11-06

### Added

- First official, fully functional and verified release.

## [1.0.1] - 2020-11-05

### Changed

- Build release.

## [1.0.0] - 2020-11-05

### Added

- Initial release of the Azure AI Translator resource action (`.resx`
  support).

## [0.0.x] - 2020-10-31

### Added

- Initial prototype pre-releases (tags `0.01`–`0.09`).

[Unreleased]: https://github.com/IEvangelist/resource-translator/compare/v3.0.2...HEAD
[3.0.2]: https://github.com/IEvangelist/resource-translator/compare/v3.0.1...v3.0.2
[3.0.1]: https://github.com/IEvangelist/resource-translator/compare/v3.0.0...v3.0.1
[3.0.0]: https://github.com/IEvangelist/resource-translator/compare/v2.2.1...v3.0.0
[2.2.1]: https://github.com/IEvangelist/resource-translator/compare/v2.2.0...v2.2.1
[2.2.0]: https://github.com/IEvangelist/resource-translator/compare/v2.1.9...v2.2.0
[2.1.9]: https://github.com/IEvangelist/resource-translator/compare/v2.1.8...v2.1.9
[2.1.8]: https://github.com/IEvangelist/resource-translator/compare/v2.1.7...v2.1.8
[2.1.7]: https://github.com/IEvangelist/resource-translator/compare/v2.1.6...v2.1.7
[2.1.6]: https://github.com/IEvangelist/resource-translator/compare/v2.1.5...v2.1.6
[2.1.5]: https://github.com/IEvangelist/resource-translator/compare/v2.1.4...v2.1.5
[2.1.4]: https://github.com/IEvangelist/resource-translator/compare/v2.1.3...v2.1.4
[2.1.3]: https://github.com/IEvangelist/resource-translator/compare/v2.1.2...v2.1.3
[2.1.2]: https://github.com/IEvangelist/resource-translator/compare/v2.1.1...v2.1.2
[2.1.1]: https://github.com/IEvangelist/resource-translator/compare/v2.1.0...v2.1.1
[2.1.0]: https://github.com/IEvangelist/resource-translator/compare/v2.0.4...v2.1.0
[2.0.4]: https://github.com/IEvangelist/resource-translator/compare/v2.0.3...v2.0.4
[2.0.3]: https://github.com/IEvangelist/resource-translator/compare/v2.0.2...v2.0.3
[2.0.2]: https://github.com/IEvangelist/resource-translator/compare/v2.0.1...v2.0.2
[2.0.1]: https://github.com/IEvangelist/resource-translator/compare/v2...v2.0.1
[2.0.0]: https://github.com/IEvangelist/resource-translator/compare/v1.0.1...v2
[1.0.1]: https://github.com/IEvangelist/resource-translator/compare/v1...v1.0.1
[1.0.0]: https://github.com/IEvangelist/resource-translator/compare/0.09...v1
[0.0.x]: https://github.com/IEvangelist/resource-translator/releases/tag/0.01
