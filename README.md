# Setup V Build

[![Latest version](https://img.shields.io/npm/v/setup-v-action) ![Dependency status](https://img.shields.io/librariesio/release/npm/setup-v-action)
](https://www.npmjs.com/package/setup-v-action)

GitHub action for setting up a V environment by downloading and unpacking or building the V compiler to the PATH. The minimum supported version of Node.js is 16.

* Convenient version specification - `master`, `weekly`, `latest`, `X.Y.Z`, `<git hash>`.
* Downloading an unpacking binaries (if available) preferred to building from sources.
* Caching already unpacked or built versions.
* Automatic installation of module dependencies.

## Usage

Install V from the most recent weekly release with the help of a cache:

```yml
- uses: prantlf/setup-v-action@v1
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

Install V from the most recent commit to the `master` branch with the help of a cache:

```yml
- uses: prantlf/setup-v-action@v1
  with:
    version: master
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

Test against multiple versions of V using a matrix strategy:

```yml
jobs:
  test:
    strategy:
      matrix:
        v-version: ["latest", "weekly", "master"]

    steps:
    - uses: actions/checkout@v3
    - uses: prantlf/setup-v-action@v1
      with:
        version: ${{ matrix.v-version }}
      env:
        GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
    - run: v test .
```

## Inputs

The following parameters can be specified using the `with` object:

### version

Type: `String`<br>
Default: `weekly`

One of the following values is supported:

* `master` - built from the most recent commit to the `master` branch
* `weekly` - downloaded from the most recent weekly release (default)
* `latest` - downloaded from the most recent (semantic) version release
* `X.Y.Z` - downloaded from a specific (semantic) version release
* `<git hash>` - built from a specific commit

### use-cache

Type: `Boolean`<br>
Default: `true`

Set to `false` to ignore the cache and always download and install or build. The default is `true`.

### force-build

Type: `Boolean`<br>
Default: `false`

Set to `true` to build V from sources although the binary archive is available. The default is `false`.

### install-dependencies

Type: `Boolean`<br>
Default: `true`

Set to `false` to skip installation of dependencies from `v.mod`.

### token

Type: `Boolean`<br>
Default: `${{ github.token }}`

Authorization token to inspect releases and commits in the `vlang/v` repository. Either a GitHub personal access token or the GitHub workflow token. If not provided, ythe environment variable `GITHUB_TOKEN` will be used as a fallback.

## Outputs

The following parameters can be accessed by the `github` context:

### version

Type: `String`<br>

The version string returned by `v -V`, for example: `V 0.3.4 692624b`.

### bin-path

Type: `String`<br>

The directory with the V compiler.

### v-bin-path

Type: `String`<br>

The path to the V compiler executable.

### used-cache

Type: `Boolean`<br>

Indicate if the cache was hit (`true`) or not (`false`) during the installation.

### was-built

Type: `Boolean`<br>

Indicate if V was built from sources (`true`) or downloaded as a binary (`false`).

## TODO

This is a work in progress.

* Install module dependencies.
* Avoid the explicitly needed GITHUB_TOKEN.

## License

Copyright (C) 2023 Ferdinand Prantl

Licensed under the [MIT License].

[MIT License]: http://en.wikipedia.org/wiki/MIT_License
