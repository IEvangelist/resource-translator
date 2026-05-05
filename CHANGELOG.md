# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added

- New action inputs: `include`, `exclude`, `configPath`, `categoryId`,
  `apiVersion`, `dryRun`, `failOnError`.
- Optional repository configuration via `.github/resource-translator.yml`
  (action inputs always win over repo config).
- Post-translation glossary support for fixed term overrides.
- Step summary emitted via `core.summary` in addition to outputs.
- Astro + Tailwind v4 docs site at `docs/`, deployed to GitHub Pages.
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
- Refreshed the docs landing page with a custom translation logo, a
  vibrant indigo→fuchsia→amber palette, Lucide icons, view transitions,
  Expressive Code-rendered code samples, and a self-hosted Inter font.

### Removed

- Unused dependencies: `@actions/cache`, `@actions/io`,
  `@actions/tool-cache`, `uuid`, `uuidv4`.

### Security

- Resolved all `npm audit` advisories (now 0 vulnerabilities).

## [2.0.6]

See git history for releases prior to v3.

[Unreleased]: https://github.com/IEvangelist/resource-translator/compare/v2.0.6...HEAD
[2.0.6]: https://github.com/IEvangelist/resource-translator/releases/tag/v2.0.6
