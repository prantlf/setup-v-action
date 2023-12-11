# Setup V (Vlang) Build

[![Latest version](https://img.shields.io/npm/v/setup-v-action) ![Dependency status](https://img.shields.io/librariesio/release/npm/setup-v-action)](https://www.npmjs.com/package/setup-v-action)

GitHub action for setting up a V build environment by downloading and unpacking the V compiler or building it from sources.

* Simple syntax with defaults according to the best performance and practices.
* Convenient version specification - `master`, `weekly`, `latest`, `X.Y.Z`, `<commit hash>`.
* Downloading an unpacking pre-built binaries is preferred to building from sources.
* An already unpacked or built version is cached to speed up the build pipeline.
* Automatic installation of module dependencies from `v.mod`.
* GitHub workflow token is used by default.

## Usage

Install V from the most recent weekly release:

```yml
- uses: prantlf/setup-v-action@v2
```

Test against multiple versions of V using the matrix strategy:

```yml
jobs:
  test:
    strategy:
      matrix:
        v-version: ["latest", "weekly", "master"]

    steps:
    - uses: actions/checkout@v4
    - uses: prantlf/setup-v-action@v2
      with:
        version: ${{ matrix.v-version }}
    - run: v test .
```

If you want to install module dependencies from `v.mod` automatically, run this action after checking out the sources.

## Inputs

The following parameters can be specified using the `with` object:

### version

Type: `String`<br>
Default: `weekly`

One of the following values is supported:

* `master` - built from the most recent commit to the `master` branch
* `weekly` - downloaded from the most recent weekly release (default)
* `latest` - downloaded from the most recent (semantic) version release
* `vX.Y.Z` or `X.Y.Z` - downloaded from a specific (semantic) version release
* `<commit hash>` - built from a specific commit

The default - `weekly` should work the best by using the most recent development version. V is still in rapid development and the `latest` might be too limiting. Once V becomes mature, the default will change and th elist of available values probably as well.

### use-cache

Type: `Boolean`<br>
Default: `true`

Set to `false` to ignore the cache and always perform the full installation, either by downloading and unpacking a binary, or by downloading sources and building. The default is `true`.

### force-build

Type: `Boolean`<br>
Default: `false`

Set to `true` to always build V from sources, even if the binary archive is available. The default is `false`.

### install-dependencies

Type: `Boolean`<br>
Default: `true`

Set to `false` to prevent module dependencies from `v.mod` from being installed automatically. The default is `true`.

### global-dependencies

Type: `Boolean`<br>
Default: `true`

Set to `false` to install module dependencies from `v.mod` to `./modules` instead of to `~/.vmodules`.

### token

Type: `String`<br>
Default: `${{ github.token }}`

Authorization token to inspect releases and commits in the `vlang/v` repository. Either a GitHub personal access token or the GitHub workflow token. If not provided, the environment variable `GITHUB_TOKEN` will be used as a fallback. And if even that is not set, the GitHub workflow token from the action-execution context will be used as default.

## Outputs

The following parameters can be accessed by the `github` context:

### version

Type: `String`<br>

The actually installed version of V, as returned by `v -V`, for example: `V 0.3.4 692624b`.

### bin-path

Type: `String`<br>

The complete path to the directory with the V compiler.

### v-bin-path

Type: `String`<br>

The complete path to the V compiler executable.

### used-cache

Type: `Boolean`<br>

A boolean value indicating if the installation succeeded from the cache.

### was-built

Type: `Boolean`<br>

A boolean value indicating if the V compiler was built from sources.

## License

Copyright (C) 2023 Ferdinand Prantl

Licensed under the [MIT License].

[MIT License]: http://en.wikipedia.org/wiki/MIT_License
