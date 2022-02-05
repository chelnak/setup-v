# setup-v

This action sets up a [vlang](https://vlang.io) environment for use in GitHub Actions.

## Inputs

| name | required | description | default |
|------|----------|-------------|---------|
| version | false | The version of vlang to download and set up. | `latest` |
| token | false | A token with at least repo scope. | `{{ github.token }}` |

## Usage

``` yaml
name: build

on:
  pull_request:
  push:
    branches:
      - main

jobs:
  build:
    runs-on: ubuntu-latest
    steps:

      - uses: azure/login@v1
        with:
          creds: ${{ secrets.AZURE_CREDENTIALS }}    

      - uses: chelnak/setup-v@v1
        with:
          version: 0.2.4
          token: {{ github.token }}
```

## Contributing

This action has been developed with node `v16`.

``` bash
# Install the dependencies
npm install

# Run tslint
npm lint

## Run tests
npm test
```

## Releasing

To create a realease you can run the following commands ensuring that you are on main:

``` bash
npm version "v1.0.0"
git push --follow-tags
```

Once the release has been created you will need to publish it by following the instructions [provided by GitHub](https://docs.github.com/en/actions/creating-actions/publishing-actions-in-github-marketplace).
