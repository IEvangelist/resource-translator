# Contributing

Thanks for your interest in `resource-translator`! Bug reports, feature
requests, and pull requests are all welcome.

## Code of Conduct

By participating in this project you agree to abide by the
[Code of Conduct](./CODE_OF_CONDUCT.md).

## Local development

Requirements:

- **Node.js 24+** (matches the Actions runtime; 20 and 22 also work for
  development).
- **npm 10+** (ships with Node 24).

```sh
git clone https://github.com/IEvangelist/resource-translator
cd resource-translator
npm install
npm run verify   # lint + format:check + test + build
```

Useful scripts:

| Script              | What it does                                        |
|---------------------|-----------------------------------------------------|
| `npm run lint`      | ESLint 9 (flat config) over `src/` and `__tests__/` |
| `npm run format`    | Run Prettier                                        |
| `npm test`          | Jest with coverage thresholds                       |
| `npm run build`     | Type-check + bundle to `dist/resource-translator/`  |

## Making a change

1. Fork the repository and create a feature branch.
2. Add or update tests under `__tests__/`. Tests must remain offline-safe
   (no live HTTP); use `jest.mock("@azure-rest/ai-translation-text")` and
   `jest.mock("@actions/github")` patterns already in the suite.
3. Run `npm run verify` and make sure it passes.
4. Run `npm run build` so `dist/resource-translator/index.js` is in sync
   with your source changes. The CI `dist-check` workflow will fail PRs
   that forget this step.
5. Open a pull request from your fork. The CI matrix runs on
   Ubuntu/Windows/macOS × Node 20/22/24.

## Adding a new resource format

1. Drop a fixture under `__tests__/data/`.
2. Implement the `TranslationFileParser` interface (`parseFrom`,
   `toFileFormatted`, `applyTranslations`, `toTranslatableTextMap`).
3. Register the parser in `src/persistence/translation-file-parser-factory.ts`.
4. Add the file extension to `translationFileSchemes` in
   `src/io/translation-file-finder.ts`.
5. Write tests for parse → format and apply-translations round-trips.
6. Update the docs site (`docs/src/pages/formats.astro`) and `README.md`.

## Coverage thresholds

`jest.config.ts` enforces minimum coverage. New code should keep
`statements` and `lines` above **78%**, `branches` above **65%**, and
`functions` above **90%**. If a change unavoidably drops a metric, raise
the floor with corresponding new tests rather than lowering the threshold.

## Commit style

We don't enforce a specific convention, but **clear imperative subjects** with a
short prefix (`feat:`, `fix:`, `docs:`, `chore:`, `test:`, `ci:`) are appreciated
and make `CHANGELOG.md` curation easier.

## Releasing

See [RELEASING.md](./RELEASING.md) for the release process. Most contributors
won't need this — the maintainer cuts releases.
