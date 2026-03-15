# Changelog

## [0.7.1](https://github.com/TimBeyer/clawctl/compare/v0.7.0...v0.7.1) (2026-03-15)

# [0.7.0](https://github.com/TimBeyer/clawctl/compare/v0.6.0...v0.7.0) (2026-03-15)


### Bug Fixes

* avoid hyphenated variable names in completion scripts ([8a8eccc](https://github.com/TimBeyer/clawctl/commit/8a8eccc2b52933040f3bf937a50c408ae7041694))
* escape handling in completion templates for dedent v1 ([ff37608](https://github.com/TimBeyer/clawctl/commit/ff3760835e26512e2a0b439e2e65fab2347908cc))
* hide completions command from tab completion suggestions ([0a1f91d](https://github.com/TimBeyer/clawctl/commit/0a1f91d4b7c6c27d1ea2dd83ce176c1a6f2124bd))
* remove update-oc from completions suggestions ([5395c2e](https://github.com/TimBeyer/clawctl/commit/5395c2e0f1adbada03409c2cc696824b6374e22d))
* restructure zsh completions to use _arguments -C with state ([436f5aa](https://github.com/TimBeyer/clawctl/commit/436f5aa6fa3d6a42f9135fb6b5cac8dd0acc86e3))
* suppress completion hints during eval and shell startup ([4e39a85](https://github.com/TimBeyer/clawctl/commit/4e39a85d28511867b194690389d55bcece821bb5))
* update openclaw subcommands from docs.openclaw.ai/cli ([57f0a77](https://github.com/TimBeyer/clawctl/commit/57f0a77571b3c666c623067ab83d6ae9ad9f16a6))
* zsh completion errors with _describe and variable scoping ([edb46cc](https://github.com/TimBeyer/clawctl/commit/edb46cc3c19b98eeda4ce9bb582280c9d1811dc7))


### Features

* add shell completions for bash and zsh ([2c77c9b](https://github.com/TimBeyer/clawctl/commit/2c77c9b8de22c1f561b1ead967ef1367e759679c))
* auto-refresh openclaw completion cache on VM commands ([f198b78](https://github.com/TimBeyer/clawctl/commit/f198b78249ee1f4784128a32714fc6ff4d944d6e))
* cache openclaw completions from VM for deep subcommand support ([a0476d2](https://github.com/TimBeyer/clawctl/commit/a0476d2f76ac34d1cedeacac79a2ffaac92664c3))

# [0.6.0](https://github.com/TimBeyer/clawctl/compare/v0.5.0...v0.6.0) (2026-03-13)


### Bug Fixes

* catch instance resolution error for clean error output ([e991978](https://github.com/TimBeyer/clawctl/commit/e9919780f425e34c2cbaceda9cb6d85db286923e))
* declare variadic args on openclaw command ([386ec20](https://github.com/TimBeyer/clawctl/commit/386ec20085fa94d357df53b9e2401a1e56e27e0f))
* handle shell -- pass-through args correctly ([04b75fb](https://github.com/TimBeyer/clawctl/commit/04b75fbd9ad28e4cedb1f040361dc1dc29861efd))


### Features

* add instance context, openclaw proxy, and shell pass-through ([9060f2d](https://github.com/TimBeyer/clawctl/commit/9060f2da4665955a1825a3a5525be38f0dd18265))

# [0.5.0](https://github.com/TimBeyer/clawctl/compare/v0.4.10...v0.5.0) (2026-03-13)


### Bug Fixes

* correct YAML indentation for extra mount entries ([73a29fc](https://github.com/TimBeyer/clawctl/commit/73a29fcbb34065f34e06a3026f0e52857c7db6d1))


### Features

* wire up extra mounts and add wizard home dir prompt ([cbf666a](https://github.com/TimBeyer/clawctl/commit/cbf666a669abd7ec9c85890282b93229b87d77ec)), closes [#13](https://github.com/TimBeyer/clawctl/issues/13)

## [0.4.10](https://github.com/TimBeyer/clawctl/compare/v0.4.9...v0.4.10) (2026-03-13)


### Bug Fixes

* resolve VM $HOME instead of passing literal ~ to limactl --workdir ([5ff50a5](https://github.com/TimBeyer/clawctl/commit/5ff50a5f04d855cc98b6fc1400a15ed8ce938382))

## [0.4.9](https://github.com/TimBeyer/clawctl/compare/v0.4.8...v0.4.9) (2026-03-12)


### Bug Fixes

* prevent false positive in install.sh PATH detection ([3958017](https://github.com/TimBeyer/clawctl/commit/3958017e14f98eaae737b471693b2af473745f3d))

## [0.4.8](https://github.com/TimBeyer/clawctl/compare/v0.4.7...v0.4.8) (2026-03-12)

## [0.4.7](https://github.com/TimBeyer/clawctl/compare/v0.4.6...v0.4.7) (2026-03-12)

## [0.4.6](https://github.com/TimBeyer/clawctl/compare/v0.4.5...v0.4.6) (2026-03-12)

## [0.4.5](https://github.com/TimBeyer/clawctl/compare/v0.4.4...v0.4.5) (2026-03-12)


### Bug Fixes

* merge build into release workflow to fix trigger ([5ee2aba](https://github.com/TimBeyer/clawctl/commit/5ee2abac6278cf9db1e2d1348da04d98b1ce1960))

## [0.4.4](https://github.com/TimBeyer/clawctl/compare/v0.4.3...v0.4.4) (2026-03-12)


### Bug Fixes

* trigger release build on release event instead of tag push ([c18f83d](https://github.com/TimBeyer/clawctl/commit/c18f83d3bd52b8a42bb2d48476cdbf7e90409f21))

## [0.4.3](https://github.com/TimBeyer/clawctl/compare/v0.4.2...v0.4.3) (2026-03-12)


### Bug Fixes

* build binary after version bump to fix version mismatch ([1acae58](https://github.com/TimBeyer/clawctl/commit/1acae587445ab6fe6bd5573f70096604fdcba102))

## [0.4.2](https://github.com/TimBeyer/clawctl/compare/v0.4.1...v0.4.2) (2026-03-12)


### Bug Fixes

* give Ink its own stdin via /dev/tty to keep process.stdin clean ([4afdd17](https://github.com/TimBeyer/clawctl/commit/4afdd17803f395b643bcb2a0baba6a8faa393a68))
* resolve double keypress during onboarding by using /dev/tty ([25a0285](https://github.com/TimBeyer/clawctl/commit/25a028516e2a70c413b307968f30fe79d4c9a1a0))
* revert /dev/tty approach, rely on readStop() for stdin cleanup ([6fd33cb](https://github.com/TimBeyer/clawctl/commit/6fd33cb076dc006161f3ee6bde47094a27abc523))
* use child_process.spawn with /dev/tty fds for interactive exec ([0abf2e2](https://github.com/TimBeyer/clawctl/commit/0abf2e24827464431c74aeba34bdcfbaef10b790))

## [0.4.1](https://github.com/TimBeyer/clawctl/compare/v0.4.0...v0.4.1) (2026-03-12)


### Bug Fixes

* install to ~/.local/bin by default instead of /usr/local/bin ([2232dac](https://github.com/TimBeyer/clawctl/commit/2232dace994076b2e8bfe33addb9645d46e0106a))

# [0.4.0](https://github.com/TimBeyer/clawctl/compare/v0.3.0...v0.4.0) (2026-03-12)


### Bug Fixes

* trim version output and use portable mktemp in install script ([7586a91](https://github.com/TimBeyer/clawctl/commit/7586a915ec598ca63c5901424cc312e7f463b66d))


### Features

* add curl-to-bash install script ([490531e](https://github.com/TimBeyer/clawctl/commit/490531e433ad8be0dfe4a9cd981e9bced23d6dd0))

# 0.3.0 (2026-03-12)


### Bug Fixes

* add permissions for commitlint workflow to read PR commits ([380a170](https://github.com/TimBeyer/clawctl/commit/380a170557c45641a0ce8f21da11e8f321e330aa))
* bump package json version ([b7a2131](https://github.com/TimBeyer/clawctl/commit/b7a2131248c35bc0e09fb7446677ebadfef41add))


### Features

* add CI/CD pipeline with PR checks and release automation ([54048b9](https://github.com/TimBeyer/clawctl/commit/54048b9998830cef69ac5b5a551010a49c394764))
* initial implementation of clawctl ([8b02577](https://github.com/TimBeyer/clawctl/commit/8b025775a02c8e7e6a0aaf4cfb526cfc9ea1ba4e))
