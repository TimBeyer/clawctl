# Changelog

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
