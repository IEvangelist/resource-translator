# 🌐 Machine Translator

[![GitHub Marketplace](https://img.shields.io/badge/Marketplace-Machine%20Translator-blue.svg?colorA=24292e&colorB=0366d6&style=flat&longCache=true&logo=data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAA4AAAAOCAYAAAAfSC3RAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAM6wAADOsB5dZE0gAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAAERSURBVCiRhZG/SsMxFEZPfsVJ61jbxaF0cRQRcRJ9hlYn30IHN/+9iquDCOIsblIrOjqKgy5aKoJQj4O3EEtbPwhJbr6Te28CmdSKeqzeqr0YbfVIrTBKakvtOl5dtTkK+v4HfA9PEyBFCY9AGVgCBLaBp1jPAyfAJ/AAdIEG0dNAiyP7+K1qIfMdonZic6+WJoBJvQlvuwDqcXadUuqPA1NKAlexbRTAIMvMOCjTbMwl1LtI/6KWJ5Q6rT6Ht1MA58AX8Apcqqt5r2qhrgAXQC3CZ6i1+KMd9TRu3MvA3aH/fFPnBodb6oe6HM8+lYHrGdRXW8M9bMZtPXUji69lmf5Cmamq7quNLFZXD9Rq7v0Bpc1o/tp0fisAAAAASUVORK5CYII=)](https://github.com/marketplace/actions/machine-translator)

A GitHub Action that automatically creates machine-translated PRs of translation files. Supported file formats include:

- *.ini*
- *.po*
- *.restext*
- *.resx*
- *.xliff*
- *.json*

## Usage

```yml
# This is a basic workflow to help you get started with Actions
name: Create translation pull request

# Controls when the action will run. Triggers the workflow on push or pull request
# events but only for the main branch
on:
  push:
    branches: [ main ]
    paths:
    - '**.ini'       # INI-based, key value pair file format
    - '**.po'        # Portable Object file format
    - '**.restext'   # INI-based, key value pair file format
    - '**.resx'      # XML-based (resource) translation file format, .NET
    - '**.xliff'     # XML-based translation file format, version 2
    - '**.json'      # JSON-based, key value pair file format

# GitHub automatically creates a GITHUB_TOKEN secret to use in your workflow.
env:
  GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}

# A workflow run is made up of one or more jobs that can run sequentially or in parallel
jobs:
  # This workflow contains a single job called "build"
  build:
    # The type of runner that the job will run on
    runs-on: ubuntu-latest

    # Steps represent a sequence of tasks that will be executed as part of the job
    steps:
      # Checks-out your repository under $GITHUB_WORKSPACE, so your job can access it
      - uses: actions/checkout@v2

      # Use the machine-translator to automatically translate resource files
      - name: Machine Translator
        id: translator
        uses: IEvangelist/resource-translator@v2.1.1
        with:
          # The source locale (for example, 'en') used to create the glob pattern
          # for which resource (**/*.en.resx) files to use as input
          sourceLocale: 'en'
          # The Azure Cognitive Services translator resource subscription key
          subscriptionKey: ${{ secrets.AZURE_TRANSLATOR_SUBSCRIPTION_KEY }}
          # The Azure Cognitive Services translator resource endpoint.
          endpoint: ${{ secrets.AZURE_TRANSLATOR_ENDPOINT }}
          # (Optional) The Azure Cognitive Services translator resource region.
          # This is optional when using a global translator resource.
          region: ${{ secrets.AZURE_TRANSLATOR_REGION }}
          # (Optional) Locales to translate to, otherwise all possible locales
          # are targeted. Requires double quotes.
          toLocales: '["es","fr","de"]'

      - name: create-pull-request
        uses: peter-evans/create-pull-request@v3.4.1
        if: ${{ steps.translator.outputs.has-new-translations }} == 'true'
        with:
          title: '${{ steps.translator.outputs.summary-title }}'
          commit-message: '${{ steps.translator.outputs.summary-details }}'
```

### Inputs

| Required | Input name        | Example                                            |
|----------|-------------------|----------------------------------------------------|
| Yes      | `sourceLocale`    | `'en'`                                             |
| Yes      | `subscriptionKey` | `'c571d5d8xxxxxxxxxxxxxxxxxx56bac3'`               |
| Yes      | `endpoint`        | `'https://api.cognitive.microsofttranslator.com/'` |
| No       | `region`          | `'canadacentral'`                                  |
| No       | `toLocales`       | `'"es,de,fr"'` or `'["es","de","fr"]'`             |

For more information, see [GitHub Action using inputs](https://docs.github.com/en/free-pro-team@latest/actions/learn-github-actions/finding-and-customizing-actions#using-inputs-and-outputs-with-an-action).

### Outputs

| Input name             | Description                                                                       |
|------------------------|-----------------------------------------------------------------------------------|
| `has-new-translations` | A `boolean` value indicating whether or not new translations have been generated. |
| `summary-title`        | A general summary title of the translations when they occur. Ideal for PR titles. |
| `summary-details`      | A detailed summary, formatted in Markdown. Ideal for PR message.                  |

For more information, see [GitHub Action outputs](https://docs.github.com/en/free-pro-team@latest/actions/creating-actions/metadata-syntax-for-github-actions#outputs).
