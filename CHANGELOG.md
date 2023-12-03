## [2.0.6](https://github.com/prantlf/setup-v-action/compare/v2.0.5...v2.0.6) (2023-12-03)


### Bug Fixes

* Support different architecture suffixes introduced for macos ([2c88798](https://github.com/prantlf/setup-v-action/commit/2c8879836142a29d7f5262dec88c5ab10bbeba59))
* Update built files ([655d052](https://github.com/prantlf/setup-v-action/commit/655d05279e9b0d2baa0ecefa443b9b8db270639a))

## [2.0.5](https://github.com/prantlf/setup-v-action/compare/v2.0.4...v2.0.5) (2023-10-27)


### Bug Fixes

* Update built files ([f35f70d](https://github.com/prantlf/setup-v-action/commit/f35f70d9363653a4f6802e61c77cc9e0f54f2fff))

## [2.0.4](https://github.com/prantlf/setup-v-action/compare/v2.0.3...v2.0.4) (2023-10-27)


### Bug Fixes

* Add URL to the failed request error message ([3b31417](https://github.com/prantlf/setup-v-action/commit/3b3141703fcf81fb8dd07ed5470a76d0f7a1a043))

## [2.0.3](https://github.com/prantlf/setup-v-action/compare/v2.0.2...v2.0.3) (2023-10-27)


### Bug Fixes

* Wait 5-10s between failing network requet attempts ([3eb4749](https://github.com/prantlf/setup-v-action/commit/3eb47490cd2f658e68fbc4ad27fb702db2c5009d))

## [2.0.2](https://github.com/prantlf/setup-v-action/compare/v2.0.1...v2.0.2) (2023-10-21)


### Bug Fixes

* Support both tags X.Y.Z and vX.Y.Z ([9455628](https://github.com/prantlf/setup-v-action/commit/9455628ad89537a2af6b631ec61065b68920cfaf))

# Changes

## [2.0.1](https://github.com/prantlf/setup-v-action/compare/v2.0.0...v2.0.1) (2023-10-19)

### Bug Fixes

* Upgrade dependencies ([7c75831](https://github.com/prantlf/setup-v-action/commit/7c758317da80b56b3a9cf8600da0c747c265b3aa))

## [2.0.0](https://github.com/prantlf/setup-v-action/compare/v1.4.8...v2.0.0) (2023-10-19)

### Chores

* Bump Node.js version from 16 to 20 ([b102c1e](https://github.com/prantlf/setup-v-action/commit/b102c1ef05bb72c8959efd84f482b2a4284d7af3))

### BREAKING CHANGES

* Although I do not know what could break, because this action
runs with its own Node.js version, such change in the build environment might
break something unexpectedly. For example, Node.js prefers IPV6 to IPV4a since
17. However, there are no known problems or migration steps necessary.

## [1.4.8](https://github.com/prantlf/setup-v-action/compare/v1.4.7...v1.4.8) (2023-09-16)

### Bug Fixes

* Remove emergency logging ([d335abf](https://github.com/prantlf/setup-v-action/commit/d335abfd7def4daf9214a8080066221f67e2d210))

## [1.4.7](https://github.com/prantlf/setup-v-action/compare/v1.4.6...v1.4.7) (2023-09-16)

### Bug Fixes

* Execute make.bat on windows using spawn ([a22fc94](https://github.com/prantlf/setup-v-action/commit/a22fc94c13d66da1925134de83353092bd3aa7f8))

## [1.4.6](https://github.com/prantlf/setup-v-action/compare/v1.4.5...v1.4.6) (2023-09-16)

### Bug Fixes

* Call make.bat on windows ([fca2c43](https://github.com/prantlf/setup-v-action/commit/fca2c43d7cf1242d671c34d2bca722caf2f273ad))
* Move the whole downloaded v directory on windows ([2a79071](https://github.com/prantlf/setup-v-action/commit/2a7907156a433ca7c08b17601715d87765e574f1))

## [1.4.5](https://github.com/prantlf/setup-v-action/compare/v1.4.4...v1.4.5) (2023-06-14)

### Bug Fixes

* Fix dependency check ([b6c2e18](https://github.com/prantlf/setup-v-action/commit/b6c2e18484159ee76322ecc0a3b858d0af643a2c))

## [1.4.4](https://github.com/prantlf/setup-v-action/compare/v1.4.3...v1.4.4) (2023-06-14)

### Bug Fixes

* Look for the manifest in the workspace ([4c9489e](https://github.com/prantlf/setup-v-action/commit/4c9489e54799b3f229c954a665463a4b4e46af90))

## [1.4.3](https://github.com/prantlf/setup-v-action/compare/v1.4.2...v1.4.3) (2023-06-14)

### Bug Fixes

* Retry network requests if they fail ([71a508d](https://github.com/prantlf/setup-v-action/commit/71a508de215d5833eec5378f8e280f80e8b1f5ef))

## [1.4.2](https://github.com/prantlf/setup-v-action/compare/v1.4.1...v1.4.2) (2023-06-14)

### Bug Fixes

* Enable outputs ([ffc265b](https://github.com/prantlf/setup-v-action/commit/ffc265be7cf719c05f0dbd6865548178331d20d6))
* Simplify reading boolean inputs ([13fea1b](https://github.com/prantlf/setup-v-action/commit/13fea1bd67a546a3f3aba357eb199ef46a9847be))

## [1.4.1](https://github.com/prantlf/setup-v-action/compare/v1.4.0...v1.4.1) (2023-06-13)

### Bug Fixes

* Fix default values of boolean flags ([f8ba659](https://github.com/prantlf/setup-v-action/commit/f8ba6592228d3590a738958e513b66fbf5057fab))

# [1.4.0](https://github.com/prantlf/setup-v-action/compare/v1.3.0...v1.4.0) (2023-06-13)

### Features

* Allow specifying the token using inputs ([1838820](https://github.com/prantlf/setup-v-action/commit/1838820b648e009914d59cedf4fff01b46c506cc))
* Install module dependencies automatically ([54c865d](https://github.com/prantlf/setup-v-action/commit/54c865df9ffbba38e347c6ae28085ef96ae39a32))

# [1.3.0](https://github.com/prantlf/setup-v-action/compare/v1.2.3...v1.3.0) (2023-06-12)

### Features

* Build V from sources ([8bb9ac3](https://github.com/prantlf/setup-v-action/commit/8bb9ac34a14ec7a61b3318b9549fd47ba2984a66))

## [1.2.3](https://github.com/prantlf/setup-v-action/compare/v1.2.2...v1.2.3) (2023-06-12)

### Bug Fixes

* Do not rewrite compiler files ([6573527](https://github.com/prantlf/setup-v-action/commit/65735270d795986b6d86d9224946e144b77b1175))

## [1.2.2](https://github.com/prantlf/setup-v-action/compare/v1.2.1...v1.2.2) (2023-06-12)

### Bug Fixes

* Ensure files needed by the compiler ([34d5b11](https://github.com/prantlf/setup-v-action/commit/34d5b114b899ccc19068ed903b842d38fd668648))

## [1.2.1](https://github.com/prantlf/setup-v-action/compare/v1.2.0...v1.2.1) (2023-06-12)

### Bug Fixes

* Move the directory with the V compiler out of the repo ([fdeafc0](https://github.com/prantlf/setup-v-action/commit/fdeafc016240f951e8d9b346e7c88ece41806a4f))

# [1.2.0](https://github.com/prantlf/setup-v-action/compare/v1.1.2...v1.2.0) (2023-06-12)

### Features

* Add more logging ([2b1b717](https://github.com/prantlf/setup-v-action/commit/2b1b7178c8f3766d4009f6ac87f2bbc145a180c0))

## [1.1.2](https://github.com/prantlf/setup-v-action/compare/v1.1.1...v1.1.2) (2023-06-12)

### Bug Fixes

* Update build output ([a2e9a99](https://github.com/prantlf/setup-v-action/commit/a2e9a9967c53593a68647993c15617f42a596935))

## [1.1.1](https://github.com/prantlf/setup-v-action/compare/v1.1.0...v1.1.1) (2023-06-12)

### Bug Fixes

* Disable outputs temporarily ([4482ea7](https://github.com/prantlf/setup-v-action/commit/4482ea743b5e5d87fcecb72ed115913493b9e96a))

# [1.1.0](https://github.com/prantlf/setup-v-action/compare/v1.0.1...v1.1.0) (2023-06-12)

### Bug Fixes

* Fix a typo in action manifest ([31a2398](https://github.com/prantlf/setup-v-action/commit/31a2398dcf8eec13717ada1ee50e44d1ce30281d))

### Features

* Set an icon and colour ([5b17b6e](https://github.com/prantlf/setup-v-action/commit/5b17b6ed7233a9955750e38242208718294e15ee))

## [1.0.1](https://github.com/prantlf/setup-v-action/compare/v1.0.0...v1.0.1) (2023-06-12)

### Bug Fixes

* Rename the action to be unique ([4af5e85](https://github.com/prantlf/setup-v-action/commit/4af5e85a17e536be075ef322eca2278ee1ec5b11))

## 0.0.1 (2023-06-12)

Initial release
