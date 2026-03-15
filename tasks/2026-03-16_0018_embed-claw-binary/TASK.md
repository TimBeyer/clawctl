# Fix `claw` binary bundling into `clawctl`

## Status: In Progress

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

- [ ] Create `claw-binary.ts`
- [ ] Update `provision.ts`
- [ ] Add re-export to `index.ts`
- [ ] Fix `build:release` script
- [ ] Commit task + plan
- [ ] Commit implementation
- [ ] Verify lint/format

## Notes

- `import.meta.dir` in a compiled Bun binary points to the binary's directory,
  not the source tree. The current relative path traversal breaks silently.
- Bun's embed assets feature returns the original path in dev mode and extracts
  to a temp location in compiled mode — no code changes needed for dev vs prod.
- Binary size will grow from ~64MB to ~160MB (claw is ~96MB compiled).

## Outcome

_To be written on resolution._
