# Fix `claw` binary bundling into `clawctl`

## Status: Resolved

## Scope

Embed the `claw` guest CLI binary into the compiled `clawctl` executable using
Bun's `import ... with { type: "file" }` asset embedding. This makes the release
binary self-contained — no sibling `dist/claw` file needed.

**Out of scope**: multi-binary VM assets, cross-platform builds.

## Plan

1. Create `packages/host-core/src/claw-binary.ts` — isolated module with the
   embedded file import.
2. Update `packages/host-core/src/provision.ts` — replace `import.meta.dir`
   path resolution with the embedded import.
3. Export `clawPath` from `packages/host-core/src/index.ts`.
4. Fix `build:release` in root `package.json` to build `claw` first.

## Steps

- [x] Create `claw-binary.ts`
- [x] Update `provision.ts`
- [x] Add re-export to `index.ts`
- [x] Fix `build:release` script
- [x] Commit task + plan
- [x] Commit implementation
- [x] Verify lint/format

## Notes

- `import.meta.dir` in a compiled Bun binary points to the binary's directory,
  not the source tree. The current relative path traversal breaks silently.
- Bun's embed assets feature returns the original path in dev mode and extracts
  to a temp location in compiled mode — no code changes needed for dev vs prod.
- Binary size will grow from ~64MB to ~160MB (claw is ~96MB compiled).

## Outcome

All four changes delivered as planned:

1. **`claw-binary.ts`** — isolated module with `import ... with { type: "file" }` for the claw binary
2. **`provision.ts`** — removed `import.meta.dir` + `resolve` path hack, uses `clawPath` from the embedded import; cleaned up unused `resolve` import
3. **`index.ts`** — re-exports `clawPath` for consumers that need to reference or override
4. **`package.json`** — `build:release` now runs `build:claw` first so the asset exists at bundle time

Lint and format pass clean. No changes needed to callers (`headless.ts`, `create-vm.tsx`) since they pass `undefined` for `clawBinaryPath` and get the default.
