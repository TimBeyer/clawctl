# README Marketing Review

## Status: Resolved

## Scope

Review and rewrite the README.md to better serve as a landing page that engages
the target audience. Focus on making clawctl seem serious, fun, and most
importantly easy to use.

**Not in scope**: Changes to other documentation files, adding screenshots or
demo GIFs, changing actual CLI behavior.

## Plan

1. Rewrite the hero/intro section to lead with the pain point and payoff
2. Reorder sections for momentum (Install → Quickstart → What happens)
3. Add a scannable Features section
4. Punch up "What happens" to lead with the outcome
5. Consolidate redundant Commands/After setup sections
6. Separate user vs. contributor content
7. Add a closing CTA
8. Adjust tone throughout: confident, outcome-focused, slightly playful

## Steps

- [x] Rewrite README.md with all marketing improvements
- [x] Run format/lint checks
- [ ] Commit and push

## Notes

- The current README is technically accurate but reads like internal docs
- Key insight: leads with _how_ (Lima, vz, virtiofs) instead of _why_ (easy, no SSH, reproducible)
- "What happens" section buries the exciting outcome (dashboard at localhost:18789) at the bottom
- "After setup" section is redundant with the command table
- Development section targets contributors, not users — should be at the bottom
- Decided against extracting to CONTRIBUTING.md since that's a larger structural change; instead moving dev content to the bottom with a clear "Contributing" header

## Outcome

Rewrote README.md with all planned marketing improvements:

- Replaced technical intro with pain-point-first messaging
- Added "Under the hood" paragraph for the technically curious
- Folded Prerequisites into a single line under Install
- Renamed "What happens" to "What you get" and led with the outcome
- Added a scannable Features section (8 bullet points)
- Consolidated Commands + After setup into one section
- Moved Development to a "Contributing" section at the bottom
- Moved Internals docs links under Contributing
- Flattened Documentation section (removed Guides/Internals split)
- Added closing CTA with install + create commands
- Adjusted tone throughout to be confident, outcome-focused, and approachable

Deferred: status badges (needs CI pipeline URLs and license choice first).
