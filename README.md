# 🌐 Resource Translator

<!-- ALL-CONTRIBUTORS-BADGE:START - Do not remove or modify this section -->
[![All Contributors](https://img.shields.io/badge/all_contributors-7-orange.svg?style=flat-square)](#contributors-)
<!-- ALL-CONTRIBUTORS-BADGE:END -->

[![GitHub Marketplace](https://img.shields.io/badge/Marketplace-Resource%20Translator-blue.svg?colorA=24292e&colorB=0366d6&style=flat&longCache=true&logo=data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAA4AAAAOCAYAAAAfSC3RAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAM6wAADOsB5dZE0gAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAAERSURBVCiRhZG/SsMxFEZPfsVJ61jbxaF0cRQRcRJ9hlYn30IHN/+9iquDCOIsblIrOjqKgy5aKoJQj4O3EEtbPwhJbr6Te28CmdSKeqzeqr0YbfVIrTBKakvtOl5dtTkK+v4HfA9PEyBFCY9AGVgCBLaBp1jPAyfAJ/AAdIEG0dNAiyP7+K1qIfMdonZic6+WJoBJvQlvuwDqcXadUuqPA1NKAlexbRTAIMvMOCjTbMwl1LtI/6KWJ5Q6rT6Ht1MA58AX8Apcqqt5r2qhrgAXQC3CZ6i1+KMd9TRu3MvA3aH/fFPnBodb6oe6HM8+lYHrGdRXW8M9bMZtPXUji69lmf5Cmamq7quNLFZXD9Rq7v0Bpc1o/tp0fisAAAAASUVORK5CYII=)](https://github.com/marketplace/actions/machine-translator)
[![ci](https://github.com/IEvangelist/resource-translator/actions/workflows/ci.yml/badge.svg)](https://github.com/IEvangelist/resource-translator/actions/workflows/ci.yml)
[![CodeQL](https://github.com/IEvangelist/resource-translator/actions/workflows/codeql.yml/badge.svg)](https://github.com/IEvangelist/resource-translator/actions/workflows/codeql.yml)
[![docs](https://img.shields.io/badge/docs-ievangelist.github.io%2Fresource--translator-1f3a8a)](https://ievangelist.github.io/resource-translator/)

A GitHub Action that opens machine-translated pull requests for resource files
in your repository, powered by **Azure AI Translator**. Supported file formats:

- `*.ini` — INI-style key/value config
- `*.po` — gettext Portable Object
- `*.restext` — INI-style MUI text
- `*.resx` — .NET resource files (XML)
- `*.xliff` — XLIFF 2.0 (XML)
- `*.json` — flat or nested JSON

> **Full documentation:** **https://ievangelist.github.io/resource-translator/**

## Quick start

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

env:
  GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}

jobs:
  translate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5

      - id: translator
        uses: IEvangelist/resource-translator@v3
        with:
          sourceLocale: en
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

## Inputs

| Required | Input             | Example                                            |
|----------|-------------------|----------------------------------------------------|
| Yes      | `sourceLocale`    | `en`                                               |
| Yes      | `subscriptionKey` | `${{ secrets.AZURE_TRANSLATOR_SUBSCRIPTION_KEY }}` |
| Yes      | `endpoint`        | `https://api.cognitive.microsofttranslator.com/`   |
| No       | `region`          | `canadacentral`                                    |
| No       | `toLocales`       | `'["es","de","fr"]'` or `"es,de,fr"`               |
| No       | `include`         | newline-separated globs to include                 |
| No       | `exclude`         | newline-separated globs to skip                    |
| No       | `configPath`      | `.github/resource-translator.yml`                  |
| No       | `categoryId`      | Azure Custom Translator category id                |
| No       | `apiVersion`      | Translator REST API version (default `3.0`)       |
| No       | `dryRun`          | `true` to skip writing files                       |
| No       | `failOnError`     | `false` to soft-fail on errors                     |

For repo-level defaults you can also drop a `.github/resource-translator.yml`
file. See **[Configuration](https://ievangelist.github.io/resource-translator/configuration)**.

## Outputs

| Output                 | Description                                                                  |
|------------------------|------------------------------------------------------------------------------|
| `has-new-translations` | `'true'` when one or more new translations were generated.                   |
| `summary-title`        | Short summary suitable for a PR title.                                       |
| `summary-details`      | Markdown body suitable for a PR description or job summary.                  |

## Documentation

- 📘 [Getting started](https://ievangelist.github.io/resource-translator/getting-started)
- ⚙️ [Configuration](https://ievangelist.github.io/resource-translator/configuration)
- 🧾 [Inputs & outputs](https://ievangelist.github.io/resource-translator/inputs)
- 📑 [File formats](https://ievangelist.github.io/resource-translator/formats)
- 🍳 [Recipes](https://ievangelist.github.io/resource-translator/recipes)
- ❓ [FAQ](https://ievangelist.github.io/resource-translator/faq)
- 🔄 [Changelog](./CHANGELOG.md)
- 🔐 [Security policy](./SECURITY.md)
- 🤝 [Contributing](./CONTRIBUTING.md)

## Contributors ✨

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
