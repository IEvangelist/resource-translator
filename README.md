# 🌐 Resource Translator

<!-- ALL-CONTRIBUTORS-BADGE:START - Do not remove or modify this section -->
[![All Contributors](https://img.shields.io/badge/all_contributors-7-orange.svg?style=flat-square)](#contributors-)
<!-- ALL-CONTRIBUTORS-BADGE:END -->

[![GitHub Marketplace](https://img.shields.io/badge/Marketplace-Resource%20Translator-blue.svg?colorA=24292e&colorB=0366d6&style=flat&longCache=true&logo=data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAA4AAAAOCAYAAAAfSC3RAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAM6wAADOsB5dZE0gAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAAERSURBVCiRhZG/SsMxFEZPfsVJ61jbxaF0cRQRcRJ9hlYn30IHN/+9iquDCOIsblIrOjqKgy5aKoJQj4O3EEtbPwhJbr6Te28CmdSKeqzeqr0YbfVIrTBKakvtOl5dtTkK+v4HfA9PEyBFCY9AGVgCBLaBp1jPAyfAJ/AAdIEG0dNAiyP7+K1qIfMdonZic6+WJoBJvQlvuwDqcXadUuqPA1NKAlexbRTAIMvMOCjTbMwl1LtI/6KWJ5Q6rT6Ht1MA58AX8Apcqqt5r2qhrgAXQC3CZ6i1+KMd9TRu3MvA3aH/fFPnBodb6oe6HM8+lYHrGdRXW8M9bMZtPXUji69lmf5Cmamq7quNLFZXD9Rq7v0Bpc1o/tp0fisAAAAASUVORK5CYII=)](https://github.com/marketplace/actions/machine-translator)
[![ci](https://github.com/IEvangelist/resource-translator/actions/workflows/ci.yml/badge.svg)](https://github.com/IEvangelist/resource-translator/actions/workflows/ci.yml)
[![CodeQL](https://github.com/IEvangelist/resource-translator/actions/workflows/codeql.yml/badge.svg)](https://github.com/IEvangelist/resource-translator/actions/workflows/codeql.yml)
[![docs](https://img.shields.io/badge/docs-ievangelist.github.io%2Fresource--translator-1f3a8a)](https://ievangelist.github.io/resource-translator/)

A GitHub Action that opens machine-translated pull requests for resource files
in your repository. Choose one translation **provider** per run — **Azure AI
Translator** (default), **AWS Translate**, or **Google Cloud Translation** — behind
a single, unified API surface. Each provider is driven by its official SDK
([`@azure-rest/ai-translation-text`](https://www.npmjs.com/package/@azure-rest/ai-translation-text),
[`@aws-sdk/client-translate`](https://www.npmjs.com/package/@aws-sdk/client-translate),
[`@google-cloud/translate`](https://www.npmjs.com/package/@google-cloud/translate)),
with built-in retry/throttling — no hand-rolled HTTP clients.

> [!NOTE]
> **Fully backward compatible.** `provider` defaults to `azure`, so existing
> workflows keep working unchanged — no edits required.

Supported formats: `.resx`, `.xliff`, `.po`, `.json`, `.ini`, `.restext`.

## Smart change detection

The action defaults to provider-independent smart change detection. It keeps a
compact, deterministic state manifest at `.github/resource-translator-state.json`
and uses parser keys plus source-value hashes to translate only keys that are
new, missing from a target file, changed in the source locale, or affected by
translation-setting changes. Unchanged target values are reused, and manual
target-file edits are preserved and logged.

Commit the state manifest so future runs have a reliable baseline. Set
`changeDetection: disabled` (or `false`) to restore the legacy behavior of
translating every eligible key on every run, or set `statePath` to move the
manifest.

If you already have localized target files and want to avoid the initial full
retranslation, run once with `snapshotOnly: true`. Snapshot mode does not call
Azure, AWS, or Google and does not write target resource files; it creates the
state manifest from existing source/target files, then future smart runs only
translate changed or missing keys.

## 📚 Documentation

**Everything lives on the docs site:**
**[ievangelist.github.io/resource-translator](https://ievangelist.github.io/resource-translator/)**

- 📘 [Getting started](https://ievangelist.github.io/resource-translator/getting-started)
- 🌐 [Translation providers](https://ievangelist.github.io/resource-translator/providers) — Azure, AWS, and Google setup
- ⚙️ [Configuration](https://ievangelist.github.io/resource-translator/configuration) — repo config, glossary, tone & industry
- 🧾 [Inputs & outputs](https://ievangelist.github.io/resource-translator/inputs)
- 📑 [File formats](https://ievangelist.github.io/resource-translator/formats)
- 🍳 [Recipes](https://ievangelist.github.io/resource-translator/recipes)
- ❓ [FAQ](https://ievangelist.github.io/resource-translator/faq)

## 🚀 Quick start

```yml
name: translate

on:
  push:
    branches: [main]
    paths:
      - "**/*.en.resx"
      - "**/*.en.json"

permissions:
  contents: write
  pull-requests: write

jobs:
  translate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5

      - id: translator
        uses: IEvangelist/resource-translator@v3
        with:
          sourceLocale: en
          provider: |
            azure:
              subscriptionKey: ${{ secrets.AZURE_TRANSLATOR_SUBSCRIPTION_KEY }}
              endpoint: ${{ secrets.AZURE_TRANSLATOR_ENDPOINT }}
              region: ${{ secrets.AZURE_TRANSLATOR_REGION }}
          toLocales: '["es","fr","de"]'

      - if: steps.translator.outputs.has-new-translations == 'true'
        uses: peter-evans/create-pull-request@v7
        with:
          branch: machine-translation
          title: ${{ steps.translator.outputs.summary-title }}
          body: ${{ steps.translator.outputs.summary-details }}
          labels: localization
```

For all inputs, repo config, glossary, tone/industry control, and recipes, see
the **[full docs](https://ievangelist.github.io/resource-translator/)**.

## 🌐 Translation providers

Pick **one** provider per run via the `provider` input (defaults to `azure`).
For cleaner workflows, `provider` can be a nested YAML block with that
provider's credentials and native behavior settings; the older flat inputs still
work and override values inside the block. The
[providers docs](https://ievangelist.github.io/resource-translator/providers)
include dedicated Azure, AWS, and Google sections with links to the official
vendor docs.

| Provider | `provider` value | SDK | Credentials |
| --- | --- | --- | --- |
| Azure AI Translator | `azure` (default) | `@azure-rest/ai-translation-text` | `subscriptionKey`, `endpoint`, `region?` |
| AWS Translate | `aws` | `@aws-sdk/client-translate` | OIDC/default chain, or `awsAccessKeyId` + `awsSecretAccessKey`; `awsRegion` |
| Google Cloud Translation | `google` | `@google-cloud/translate` | `googleApiKey` **or** `googleCredentials` (service-account JSON) |

> [!IMPORTANT]
> Locale codes differ per provider (e.g. Simplified Chinese is `zh-Hans` on
> Azure, `zh` on AWS, `zh-CN` on Google). Codes pass through as-is and drive the
> output file names, so pick `toLocales` values your chosen provider supports.

### AWS Translate (OIDC — recommended)

```yml
permissions:
  id-token: write # for aws-actions/configure-aws-credentials OIDC
  contents: write
  pull-requests: write

jobs:
  translate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5

      - uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: arn:aws:iam::123456789012:role/gh-actions-translate
          aws-region: us-east-1

      - id: translator
        uses: IEvangelist/resource-translator@v3
        with:
          provider: |
            aws:
              region: us-east-1 # or rely on AWS_REGION from the step above
              formality: FORMAL
              brevity: true
          sourceLocale: en
          toLocales: '["es","fr","de"]'
```

To use static keys instead of OIDC, drop the `configure-aws-credentials` step and
add `accessKeyId` / `secretAccessKey` (via secrets) to the nested `aws` block, or
use the equivalent flat inputs.

### Google Cloud Translation

```yml
jobs:
  translate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5

      - id: translator
        uses: IEvangelist/resource-translator@v3
        with:
          provider: |
            google:
              # Provide EITHER a service-account JSON credential...
              credentials: ${{ secrets.GCP_TRANSLATE_CREDENTIALS }}
              # ...OR an API key:
              # apiKey: ${{ secrets.GCP_TRANSLATE_API_KEY }}
              model: nmt
          sourceLocale: en
          toLocales: '["es","fr","de"]'
```

Provider-specific intent specifiers are mapped where an equivalent exists:
`textType` → Google `format`; `profanityAction` (`Marked`/`Deleted`) → AWS
profanity masking. `categoryId`, `apiVersion`, `profanityMarker`, and
`allowFallback` are Azure-only and ignored by the other providers.

Provider-native knobs are also available: AWS supports `formality`, `brevity`,
`terminologyNames`, and `parallelDataNames`; Google supports `model`,
`apiEndpoint`, and `autoRetry`.

## 🔗 Project links

- 🔄 [Changelog](./CHANGELOG.md)
- 🔐 [Security policy](./SECURITY.md)
- 🤝 [Contributing](./CONTRIBUTING.md)
- 📜 [Code of conduct](./CODE_OF_CONDUCT.md)

## ✨ Contributors

Thanks goes to these wonderful people ([emoji key](https://allcontributors.org/docs/en/emoji-key)):

<!-- ALL-CONTRIBUTORS-LIST:START - Do not remove or modify this section -->
<!-- prettier-ignore-start -->
<!-- markdownlint-disable -->
<table>
  <tbody>
    <tr>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/vs-savelich"><img src="https://avatars.githubusercontent.com/u/22545114?v=4?s=100" width="100px;" alt="vs-savelich"/><br /><sub><b>vs-savelich</b></sub></a><br /><a href="https://github.com/IEvangelist/resource-translator/commits?author=vs-savelich" title="Code">💻</a> <a href="https://github.com/IEvangelist/resource-translator/commits?author=vs-savelich" title="Tests">⚠️</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/yevgen-nykytenko"><img src="https://avatars.githubusercontent.com/u/15048651?v=4?s=100" width="100px;" alt="Yevgen Nykytenko"/><br /><sub><b>Yevgen Nykytenko</b></sub></a><br /><a href="https://github.com/IEvangelist/resource-translator/issues?q=author%3Ayevgen-nykytenko" title="Bug reports">🐛</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://finterjobs.com"><img src="https://avatars.githubusercontent.com/u/869?v=4?s=100" width="100px;" alt="Peter Rekdal Khan-Sunde"/><br /><sub><b>Peter Rekdal Khan-Sunde</b></sub></a><br /><a href="https://github.com/IEvangelist/resource-translator/issues?q=author%3Apeters" title="Bug reports">🐛</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://timheuer.com/blog/"><img src="https://avatars.githubusercontent.com/u/4821?v=4?s=100" width="100px;" alt="Tim Heuer"/><br /><sub><b>Tim Heuer</b></sub></a><br /><a href="https://github.com/IEvangelist/resource-translator/issues?q=author%3Atimheuer" title="Bug reports">🐛</a> <a href="#ideas-timheuer" title="Ideas, Planning, & Feedback">🤔</a> <a href="https://github.com/IEvangelist/resource-translator/pulls?q=is%3Apr+reviewed-by%3Atimheuer" title="Reviewed Pull Requests">👀</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/tompatib"><img src="https://avatars.githubusercontent.com/u/16067575?v=4?s=100" width="100px;" alt="Tibor Tompa"/><br /><sub><b>Tibor Tompa</b></sub></a><br /><a href="#ideas-tompatib" title="Ideas, Planning, & Feedback">🤔</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://ml-software.ch"><img src="https://avatars.githubusercontent.com/u/4151467?v=4?s=100" width="100px;" alt="Matteo"/><br /><sub><b>Matteo</b></sub></a><br /><a href="https://github.com/IEvangelist/resource-translator/commits?author=Franklin89" title="Code">💻</a> <a href="https://github.com/IEvangelist/resource-translator/commits?author=Franklin89" title="Tests">⚠️</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://mas.to/@csharpfritz"><img src="https://avatars.githubusercontent.com/u/78577?v=4?s=100" width="100px;" alt="Jeffrey T. Fritz"/><br /><sub><b>Jeffrey T. Fritz</b></sub></a><br /><a href="https://github.com/IEvangelist/resource-translator/commits?author=csharpfritz" title="Documentation">📖</a></td>
    </tr>
  </tbody>
</table>

<!-- markdownlint-restore -->
<!-- prettier-ignore-end -->

<!-- ALL-CONTRIBUTORS-LIST:END -->

This project follows the [all-contributors](https://github.com/all-contributors/all-contributors) specification. Contributions of any kind welcome!
