# Changelog

# [0.15.0](https://github.com/TimBeyer/clawctl/compare/v0.14.0...v0.15.0) (2026-03-17)


### Bug Fixes

* exit cleanly on ctrl-c before provisioning starts ([dc3ef08](https://github.com/TimBeyer/clawctl/commit/dc3ef08ae7ddc281fe92eddf654e1035955cad1d))
* match focus list order to visual render order in ConfigBuilder ([e5e03c9](https://github.com/TimBeyer/clawctl/commit/e5e03c944ad4bd4ed77ecac34a86fdce545c2b21))


### Features

* add unified CapabilityConfigDef with typed paths and Zod derivation ([043b2e3](https://github.com/TimBeyer/clawctl/commit/043b2e3325e3c654c74fad0002d4751b5658d61e))
* data-driven host-side capability setup hooks ([848162e](https://github.com/TimBeyer/clawctl/commit/848162ef8f6042859f05de5f03907a5dfcbd5203))
* dynamic TUI form rendering from capability configDef ([2acac14](https://github.com/TimBeyer/clawctl/commit/2acac1409a3b4e35774ff6b070b183549b89f5a7))
* wire capability config validation and normalization ([60ee944](https://github.com/TimBeyer/clawctl/commit/60ee9448812a71bf299455ff8b3f79f4ad0147ff))

# [0.14.0](https://github.com/TimBeyer/clawctl/compare/v0.13.0...v0.14.0) (2026-03-17)


### Bug Fixes

* correct flag position in oc subcommands ([5f44774](https://github.com/TimBeyer/clawctl/commit/5f44774b74966d7bf4f80770fa8da5491a6d1277))
* include instance name in next-steps commands ([d0364e9](https://github.com/TimBeyer/clawctl/commit/d0364e90913f23a9a7112906cff0aec017a50c9c))
* lint and format issues ([94d5dd0](https://github.com/TimBeyer/clawctl/commit/94d5dd0b47f4efe25f460eb4211b91b7786d0be1))
* process hangs after successful config-driven deploy ([2ff4842](https://github.com/TimBeyer/clawctl/commit/2ff4842b4839bd8c1ffaac75ced48fe2d43aff6e))
* provision monitor stages overflow and steps header scrolling ([f2f6db3](https://github.com/TimBeyer/clawctl/commit/f2f6db311d18705c52c362f0e16611ec2a1bb81b))
* stable 50/50 column split for stages and steps ([8ffdef4](https://github.com/TimBeyer/clawctl/commit/8ffdef4d19128e686a4c28a6cbaa7d4cc8aa6099))
* suggest oc tui instead of oc dashboard in next steps ([143a1c2](https://github.com/TimBeyer/clawctl/commit/143a1c266a6d46c636eb31805c4bdf3721940239))
* use dynamic flexbox sizing for stages column ([98cbf31](https://github.com/TimBeyer/clawctl/commit/98cbf31cef5ab824090fd39e4e77e8cc2f428373))
* widen stages column from 32 to 44 chars ([364338f](https://github.com/TimBeyer/clawctl/commit/364338fcc74e6e4039c8c8b130bbd6fdbdae5318))


### Features

* fullscreen TUI layout, config-driven TUI mode, --plain flag ([ded9e5f](https://github.com/TimBeyer/clawctl/commit/ded9e5fa6174fae90d467f5e5fbfc3e95952cbcc))
* replace wizard with config-first TUI and unified headless pipeline ([baaadc7](https://github.com/TimBeyer/clawctl/commit/baaadc74f1cdc8a8a268d292f2e0b979be2dc956))

# [0.13.0](https://github.com/TimBeyer/clawctl/compare/v0.12.0...v0.13.0) (2026-03-16)


### Bug Fixes

* address PR review feedback ([80fd26d](https://github.com/TimBeyer/clawctl/commit/80fd26d7ba4fab204e407d81974a5c8dee10c0a2))
* resolve lint and formatting issues in docs site ([74ff947](https://github.com/TimBeyer/clawctl/commit/74ff94787404a1f6dcc9e5cfe3708e3a3ecaa879))


### Features

* add GitHub Pages docs site skeleton (Vite + React + Tailwind) ([9641ec9](https://github.com/TimBeyer/clawctl/commit/9641ec931289046e76ee92cdd2bbf751a8e4169b))
* add landing page for docs site ([d2a368c](https://github.com/TimBeyer/clawctl/commit/d2a368cade40247a0a0cb4ced5497129ef6a5a0e))

# [0.12.0](https://github.com/TimBeyer/clawctl/compare/v0.11.2...v0.12.0) (2026-03-16)


### Bug Fixes

* only run daemon tasks for Running instances ([14a239c](https://github.com/TimBeyer/clawctl/commit/14a239cbd4244ece2bc136a698abd8b8fdbe4c21))
* remove extra space in daemon log level formatting ([654a294](https://github.com/TimBeyer/clawctl/commit/654a29409dc8d905cd92312c04a7b8549a65df50))


### Features

* add @clawctl/daemon package with background process management ([460467f](https://github.com/TimBeyer/clawctl/commit/460467f1a6fcf8a1194deceb6d86114a8cdaf0a8))
* per-instance daemon task config overrides ([45528c5](https://github.com/TimBeyer/clawctl/commit/45528c51b322ac06c67f9e18167f3787a46b4e33))
* show build hash in daemon status output ([cabac73](https://github.com/TimBeyer/clawctl/commit/cabac73a30e66842755dca34601930e1707073e3))
* show dev mode indicator in daemon status ([a720b70](https://github.com/TimBeyer/clawctl/commit/a720b7034d8a5af0b450e567165f94ecd83d8cb8))
* use content hash for daemon staleness detection ([6092925](https://github.com/TimBeyer/clawctl/commit/6092925c60102478a8f8d340944a21130e370a12))
* write default daemon.json on first run ([47a82f5](https://github.com/TimBeyer/clawctl/commit/47a82f5d0430b35eb894d44a994b3311ff71c24b))

## [0.11.2](https://github.com/TimBeyer/clawctl/compare/v0.11.1...v0.11.2) (2026-03-16)

## [0.11.1](https://github.com/TimBeyer/clawctl/compare/v0.11.0...v0.11.1) (2026-03-16)


### Bug Fixes

* eliminate double commandExists calls in doctor checks ([5b41eac](https://github.com/TimBeyer/clawctl/commit/5b41eac783c3c138ad7d61d179ee94bb9c748dad))
* use index-based result tracking in capability runner ([188dbb9](https://github.com/TimBeyer/clawctl/commit/188dbb9203568671c22da8cd3c7b6d9326b11d6d))

# [0.11.0](https://github.com/TimBeyer/clawctl/compare/v0.10.0...v0.11.0) (2026-03-16)


### Features

* add agent skills for developer documentation ([453ccdb](https://github.com/TimBeyer/clawctl/commit/453ccdb82803a38a316b062cd4872879eac72c52))

# [0.10.0](https://github.com/TimBeyer/clawctl/compare/v0.9.1...v0.10.0) (2026-03-16)


### Bug Fixes

* move AGENTS.md writes to bootstrap phase hook ([03ead54](https://github.com/TimBeyer/clawctl/commit/03ead545c7951ca3762ee04ec8467346b191a506))


### Features

* implement capability extension system ([584e0cc](https://github.com/TimBeyer/clawctl/commit/584e0cc24450465157e1c45c6d5347a5bf281800))
* wire host-side, delete old files, add tests for capability system ([792ff42](https://github.com/TimBeyer/clawctl/commit/792ff42abd866abd3251eae86dfc4a1bb0d8b942))

## [0.9.1](https://github.com/TimBeyer/clawctl/compare/v0.9.0...v0.9.1) (2026-03-15)


### Bug Fixes

* drop --minify and --bytecode from clawctl builds ([694677d](https://github.com/TimBeyer/clawctl/commit/694677dbc578fec9d06cf07c606fdfbeb9928ebe))
* embed claw binary into clawctl using Bun asset imports ([3ced543](https://github.com/TimBeyer/clawctl/commit/3ced543638d95cf9492301655ef23985b6b783b8))
* materialize embedded claw binary to temp file for limactl ([504d96b](https://github.com/TimBeyer/clawctl/commit/504d96bfdd7a707e95d546a78ede2cb2a00997b9))
* use --format=esm to enable all production build flags ([941d3d1](https://github.com/TimBeyer/clawctl/commit/941d3d1e97a6dab4eab995924cd10dd925ac80ce)), closes [oven-sh/bun#14412](https://github.com/oven-sh/bun/issues/14412)
* use inline sourcemaps for compiled binaries ([1b584c7](https://github.com/TimBeyer/clawctl/commit/1b584c7812994eb0faf6dd7a79390b508859cf0e))

# [0.9.0](https://github.com/TimBeyer/clawctl/compare/v0.8.0...v0.9.0) (2026-03-15)


### Bug Fixes

* remove nested .git after onboard, add checkpoint agent skill ([30623c0](https://github.com/TimBeyer/clawctl/commit/30623c0355d7b15079abc35dd8757410311ce849))
* wrap openclaw tui so Ctrl-C doesn't skip AGENTS.md patch ([b7940ae](https://github.com/TimBeyer/clawctl/commit/b7940ae7b043fbdb7da5e6e3fcd05a7c153e5ed9))


### Features

* add checkpoint rules to AGENTS.md via managed section ([be950ba](https://github.com/TimBeyer/clawctl/commit/be950baa9fd3c6dcc6552e711f122207a80e5940))
* host writes provision.json to gate optional tool installation ([4111961](https://github.com/TimBeyer/clawctl/commit/4111961d9928e93b14680d5a316beb7352063a1d))
* reorder wizard — collect credentials before VM creation ([1f4d05d](https://github.com/TimBeyer/clawctl/commit/1f4d05d91930cc5644231316435ee0c25dd9c352))

# [0.8.0](https://github.com/TimBeyer/clawctl/compare/v0.7.1...v0.8.0) (2026-03-15)


### Bug Fixes

* deploy claw binary via driver.copy instead of mount ([382e5dc](https://github.com/TimBeyer/clawctl/commit/382e5dc3018dccb513628b9f71a988db5d6e6149))
* remove bun from doctor PATH checks, make post-bootstrap checks warn-only ([40ca77a](https://github.com/TimBeyer/clawctl/commit/40ca77a7d17556af11c022f2e861dafe552a42f1))
* verify step treats doctor warnings as fatal errors ([39ec9e5](https://github.com/TimBeyer/clawctl/commit/39ec9e5a7c9c4274939accd500ce4a66e130f024))


### Features

* add @clawctl/vm-cli package with claw CLI ([6585407](https://github.com/TimBeyer/clawctl/commit/65854071498a8fe8bce0dc1309cea601c72e06bf))
* auto-build claw binary in clawctl-dev ([e557f53](https://github.com/TimBeyer/clawctl/commit/e557f53b0f245c3fd5b99d4dc034d64237c19a83))
* clean up VM on Ctrl+C / SIGTERM during creation ([f75633d](https://github.com/TimBeyer/clawctl/commit/f75633daa7dac5f3d065490745f3c36f98c56ac6))
* introduce tool abstraction layer for vm-cli provision commands ([ffb72fe](https://github.com/TimBeyer/clawctl/commit/ffb72fe2d6bb1ec539dade836851282eca3049d8))
* stream subprocess output from claw provision commands ([77dcc5a](https://github.com/TimBeyer/clawctl/commit/77dcc5a6e27aa11ad0ae3aaa116e29e52d99d0d0))
* structured provisioning stages with lifecycle-based doctor warnings ([1ebdcb6](https://github.com/TimBeyer/clawctl/commit/1ebdcb62e2f756b322e9af1bb0c5ea0f8235d7e8))
* wire claw into host-side provisioning and add watch command ([9f500e6](https://github.com/TimBeyer/clawctl/commit/9f500e6ef8af27fcff607ebd0db16eb31e5089c0))

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
