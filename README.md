# 🌐 Resource translator

A GitHub action that uses Azure Cognitive Services Translator to generate .resx resource files given a source .resx file.

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
    - '**.resx' # only take action when *.resx files change

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

      # Use the resource translator to automatically translate resource files
      - name: Resource translator
        uses: IEvangelist/resource-translator@v1.0.3
        with:
          # The Azure Cognitive Services translator resource subscription key
          subscriptionKey: ${{ secrets.AZURE_TRANSLATOR_SUBSCRIPTION_KEY }}
          # The Azure Cognitive Services translator resource endpoint.
          endpoint: ${{ secrets.AZURE_TRANSLATOR_ENDPOINT }}
          # (Optional) The Azure Cognitive Services translator resource region. This is optional when using a global translator resource.
          region: ${{ secrets.AZURE_TRANSLATOR_REGION }}
          # The source locale (i.e.; 'en'), used to create the glob pattern for which resource (**/*.en.resx) files to use as input
          sourceLocale: 'en'

      - name: Create pull request
        uses: peter-evans/create-pull-request@v3.4.1
```
