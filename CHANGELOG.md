# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

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
  `actions/checkout@v6`, `actions/upload-pages-artifact@v5`,
  `peter-evans/create-pull-request@v8`, `softprops/action-gh-release@v3`,
  `dependabot/fetch-metadata@v3`.
- Refreshed the docs landing page with a custom translation logo, a
  vibrant indigo→fuchsia→amber palette, Lucide icons, view transitions,
  Expressive Code-rendered code samples, and a self-hosted Inter font.
- Polished docs UX with a collapsible sidebar, a mobile drawer with
  `inert` background + skip-link, larger base type, AA-tuned gradient
  headings, `cursor: pointer` on every interactive element, per-format
  spec links + examples, and Catppuccin Expressive Code themes that
  match the brand palette.

### Removed

- Unused dependencies: `@actions/cache`, `@actions/io`,
  `@actions/tool-cache`, `uuid`, `uuidv4`.

### Security

- Resolved all `npm audit` advisories (now 0 vulnerabilities).

## [2.0.6]

See git history for releases prior to v3.

[Unreleased]: https://github.com/IEvangelist/resource-translator/compare/v2.0.6...HEAD
[2.0.6]: https://github.com/IEvangelist/resource-translator/releases/tag/v2.0.6
