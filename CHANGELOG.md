# Changelog

# [0.23.0](https://github.com/TimBeyer/clawctl/compare/v0.22.1...v0.23.0) (2026-05-13)


### Bug Fixes

* **one-password:** write permissive exec-approvals defaults ([a9cdc18](https://github.com/TimBeyer/clawctl/commit/a9cdc183047b07cfbb8237ff1f74a10443b9832b))
* **types:** add stringList field type for array-valued config fields ([1c03594](https://github.com/TimBeyer/clawctl/commit/1c035949268d3200244514a1a49187ef35bb4359))


### Features

* **host-core:** apply trusted-operator security defaults on bootstrap ([3783704](https://github.com/TimBeyer/clawctl/commit/3783704d6d171a6334470897cff36967e28e5a80))
* **host-core:** set commands.ownerAllowFrom from channel allowFrom ([c505d95](https://github.com/TimBeyer/clawctl/commit/c505d951c274f983e14a272f83ad347f78e5f546))

## [0.22.1](https://github.com/TimBeyer/clawctl/compare/v0.22.0...v0.22.1) (2026-05-13)


### Bug Fixes

* **host-core:** gate first-run-only steps in bootstrapOpenclaw ([6ed53cf](https://github.com/TimBeyer/clawctl/commit/6ed53cfae70f2ec4df973b30b9072eaea175906c))
* **host-core:** handle provider switch in patchAuthProfiles ([504ca0a](https://github.com/TimBeyer/clawctl/commit/504ca0a92c64f0f41f4a5cd26e4253cc81922400))

# [0.22.0](https://github.com/TimBeyer/clawctl/compare/v0.21.0...v0.22.0) (2026-04-07)


### Bug Fixes

* wizard only emits channel config when enabled is toggled on ([4785cda](https://github.com/TimBeyer/clawctl/commit/4785cda14f1111e3ed99672cca050d84c0a0fc7b))


### Features

* add ChannelDef system and channels/openclaw config keys ([fe7374f](https://github.com/TimBeyer/clawctl/commit/fe7374fbc21c08029cbce40ca3e3e840682b5127))
* add group headers to wizard (Infrastructure, Channels, Identity) ([8e1fe40](https://github.com/TimBeyer/clawctl/commit/8e1fe40b6bbbac7e5c3154e7364471af638c33fb))
* add toggle field type and enabled toggle to all channels ([ba8d4af](https://github.com/TimBeyer/clawctl/commit/ba8d4afed2557c59f44cf2fe2960db92635c0af0))
* channel schema validation and telegram migration ([657206a](https://github.com/TimBeyer/clawctl/commit/657206ab5801854e3996b41424cb758226373781))
* generic channel bootstrap loop and openclaw passthrough ([3fa9563](https://github.com/TimBeyer/clawctl/commit/3fa956390ef4bb5ed33e99418da1f3387b54a1c0))

# [0.21.0](https://github.com/TimBeyer/clawctl/compare/v0.20.0...v0.21.0) (2026-04-01)


### Features

* add adding-cli-commands skill ([c58456d](https://github.com/TimBeyer/clawctl/commit/c58456d8f41f6103b2a3367d21db9c868235ba2a))
* add mount command to README and shell completions ([9f6bbfc](https://github.com/TimBeyer/clawctl/commit/9f6bbfc3c4dbe936e2f37af709e8f9c2cb322f67))

# [0.20.0](https://github.com/TimBeyer/clawctl/compare/v0.19.1...v0.20.0) (2026-04-01)


### Bug Fixes

* correct broken symlinks in agent skills references ([055581b](https://github.com/TimBeyer/clawctl/commit/055581b2e28c122878d0a4be6a04904d11bcca9f))
* drop [name] positional from mount add/remove ([f316b5b](https://github.com/TimBeyer/clawctl/commit/f316b5b88a796df8cd253c05a2ad5c723319d2f8))
* show help on missing args for mount subcommands ([a6f1082](https://github.com/TimBeyer/clawctl/commit/a6f1082774e96da66e8664f2c8cfa0e79cf5c763))


### Features

* add clawctl mount command (list/add/remove) ([ededf7c](https://github.com/TimBeyer/clawctl/commit/ededf7c8b708b690e676e3042147ed54e037b61c))
* add readMounts/writeMounts to VMDriver interface ([01f5a46](https://github.com/TimBeyer/clawctl/commit/01f5a46e5cb7a65fdf6d89345f44cb47021c1741))

## [0.19.1](https://github.com/TimBeyer/clawctl/compare/v0.19.0...v0.19.1) (2026-04-01)

# [0.19.0](https://github.com/TimBeyer/clawctl/compare/v0.18.0...v0.19.0) (2026-03-22)


### Bug Fixes

* exclude .astro/ generated files from ESLint ([e8f469a](https://github.com/TimBeyer/clawctl/commit/e8f469a359fdb8f0bac1952bb21d0c09852aae4f))


### Features

* migrate docs-site from React+Vite SPA to Astro ([288f630](https://github.com/TimBeyer/clawctl/commit/288f63023cac2f05f3f41ce04c6cd857926f4ab5))

# [0.18.0](https://github.com/TimBeyer/clawctl/compare/v0.17.1...v0.18.0) (2026-03-22)


### Bug Fixes

* fix recording scripts and add website cast files ([5dc370d](https://github.com/TimBeyer/clawctl/commit/5dc370dfb4f7cfd819275e59f3055e3c4fcbe09a))
* recording and website polish ([2517772](https://github.com/TimBeyer/clawctl/commit/25177725f8c73ea867e41323a4861a465398a9d9))
* use consistent terminal size across all demo recordings ([03cc4b8](https://github.com/TimBeyer/clawctl/commit/03cc4b8e38b68ba17d7afd19aea97ff0f3e6606a))


### Features

* add CI workflows for demo recording and E2E testing ([93d1b8f](https://github.com/TimBeyer/clawctl/commit/93d1b8f3b42d78ea422002f3ab8f8d8becb953b6))
* integrate asciinema player into docs-site ([192b270](https://github.com/TimBeyer/clawctl/commit/192b2705a8b71d53eb9f05a377f5e0adc0aa604c))
* refactor demo recording into multi-demo framework ([03447b3](https://github.com/TimBeyer/clawctl/commit/03447b3763563cb3598f9480ae103c86e4b90bf1))

## [0.17.1](https://github.com/TimBeyer/clawctl/compare/v0.17.0...v0.17.1) (2026-03-19)


### Bug Fixes

* add loop extension to demo GIF ([fa8a486](https://github.com/TimBeyer/clawctl/commit/fa8a486fabb99635b50ae8cb2c2345799e38695c))

# [0.17.0](https://github.com/TimBeyer/clawctl/compare/v0.16.0...v0.17.0) (2026-03-19)


### Bug Fixes

* remove redundant text around demo GIF, widen recording ([f251fd0](https://github.com/TimBeyer/clawctl/commit/f251fd002c2767a1b56678da88c3f035fb1ced5d))
* restore instance context and completions as visible sections ([3fe4c80](https://github.com/TimBeyer/clawctl/commit/3fe4c80b1e73d5b351efe8c2fcb9a7aaa7daea04))


### Features

* add demo GIF to original README ([2175480](https://github.com/TimBeyer/clawctl/commit/21754807e3884d0609aba045860217f2aa6dc4f1))
* add demo GIF to README with automated recording pipeline ([8e994ff](https://github.com/TimBeyer/clawctl/commit/8e994ff965d928f3e1e8e56338c056ed90ebef57))
* polish README with nav bar, callout, and tighter quickstart ([d7022c4](https://github.com/TimBeyer/clawctl/commit/d7022c4747225d605f1f43b208caf7e43998487a))
* slim down Commands section in README ([8a4ba0f](https://github.com/TimBeyer/clawctl/commit/8a4ba0f3d52a350f36fb0fec08e14bbe60008bcc))
* tighten README structure and remove update note ([5ff7eac](https://github.com/TimBeyer/clawctl/commit/5ff7eac10898ddc6457ddfe0832f4fc253ec74d6))

# [0.16.0](https://github.com/TimBeyer/clawctl/compare/v0.15.0...v0.16.0) (2026-03-18)


### Bug Fixes

* don't clear pendingClawUpdate when migrate fails ([4c7f61f](https://github.com/TimBeyer/clawctl/commit/4c7f61ff31ef79aefc01a2310f3bee2ac3a5b690))
* move semver to host-core, add preAction error handling, set clawVersion ([9650088](https://github.com/TimBeyer/clawctl/commit/9650088e47824fc7ff61f5ece9e1fa5ab059c20b))
* skip self-update in dev mode ([1a2764a](https://github.com/TimBeyer/clawctl/commit/1a2764af725d4246c996df20887e20eb9c0f5c54))


### Features

* add claw migrate command for capability migrations ([fc4f4b1](https://github.com/TimBeyer/clawctl/commit/fc4f4b18f11ed78a00a81e4f304034d19f5b089b))
* add clawctl update command and pre-command hook ([57114d7](https://github.com/TimBeyer/clawctl/commit/57114d77bab06b5ea15c8988e8af323846056e14))
* add host-core update infrastructure ([5e9e324](https://github.com/TimBeyer/clawctl/commit/5e9e32461b3ff2a7ab460ba429d5c82f06ea4dbc))
* apply pending claw update on instance start ([64b659a](https://github.com/TimBeyer/clawctl/commit/64b659a393a57e64be53243a8668e3c26a34fc94))

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
