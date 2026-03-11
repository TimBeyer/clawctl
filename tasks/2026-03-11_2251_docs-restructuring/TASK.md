# Documentation Restructuring

## Status: Resolved

## Scope

Restructure the README and docs so each audience has a clear path:

- **New users**: README → Getting Started → integration guides
- **Headless/CI users**: README → Headless Mode → Config Reference
- **Contributors**: README → Architecture → internals

Extract the ~200-line config reference and headless mode sections from README
into standalone docs. Rewrite README as a concise landing page. Add a getting
started guide and consolidated troubleshooting doc. Rename `generated-project.md`
→ `project-directory.md`.

This is a restructuring, not a rewrite. Content is moved and reorganized —
not substantially rewritten.

**Out of scope**: Changing content in unchanged docs (architecture, cli-wizard-flow,
vm-provisioning, 1password-setup, tailscale-setup, snapshots-and-rebuilds, testing).

## Plan

1. Extract config reference from README → `docs/config-reference.md`
2. Extract headless mode from README → `docs/headless-mode.md`
3. Rewrite README as a landing page (~120–150 lines)
4. Create `docs/getting-started.md`
5. Rename `generated-project.md` → `project-directory.md` + update links
6. Create `docs/troubleshooting.md`
7. Cross-link pass across all modified docs

## Steps

- [x] Create `docs/config-reference.md` (extracted from README lines 105–307)
- [x] Create `docs/headless-mode.md` (extracted from README lines 93–104)
- [x] Rewrite `README.md` as landing page
- [x] Create `docs/getting-started.md`
- [x] Rename `generated-project.md` → `project-directory.md`
- [x] Update all references to old filename
- [x] Create `docs/troubleshooting.md`
- [x] Cross-link pass
- [x] Verify: all links resolve, format check passes, README under 160 lines

## Notes

- No references to `generated-project.md` existed in other docs (only task files),
  so the rename required no link updates beyond the README and new docs.
- Prettier reformatted one table in config-reference.md (column widths) — no
  content change.

## Outcome

Delivered all 7 planned changes:

- **`docs/config-reference.md`** — extracted all schema tables, examples, secret
  references, and example config links from README (lines 105–307)
- **`docs/headless-mode.md`** — expanded README headless section into a guide with
  pipeline description, examples, and CI tips
- **`README.md`** — rewritten as 126-line landing page with value proposition,
  categorized docs index, and reading paths per audience
- **`docs/getting-started.md`** — guided walkthrough: prerequisites, wizard steps,
  what gets created, verification, next steps
- **`docs/project-directory.md`** — renamed from `generated-project.md`, title updated
- **`docs/troubleshooting.md`** — consolidated troubleshooting from vm-provisioning
  and tailscale-setup plus new sections for prerequisites, VM creation, onboarding,
  and dashboard access
- **Cross-links** — all internal links verified, format check passes
