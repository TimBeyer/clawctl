# Add `clawctl-dev` development shim

## Status: Resolved

## Scope

Add a small shell wrapper (`bin/clawctl-dev`) that can be symlinked onto PATH
so developers can run `clawctl-dev` from anywhere instead of typing
`bun ./create-openclaw-vm/bin/cli.tsx`. Document the setup in CLAUDE.md.

Does **not** cover: CI integration, auto-install scripts, or changes to the
compiled binary workflow.

## Plan

1. Create `bin/clawctl-dev` shell script that resolves its real location and
   execs `bun cli.tsx` with forwarded args.
2. Add a "Dev Setup" section to CLAUDE.md with symlink instructions.
3. Verify the script works from project root and via symlink.

## Steps

- [x] Create `bin/clawctl-dev` script
- [x] Make it executable
- [x] Add dev setup docs to CLAUDE.md
- [x] Verify it works

## Notes

## Outcome

- Created `bin/clawctl-dev` — a 4-line bash wrapper that resolves symlinks and
  execs `bun cli.tsx` with forwarded args.
- Added "Dev Setup" section to CLAUDE.md with symlink instructions.
- Verified: `./bin/clawctl-dev --help` works from project root.
