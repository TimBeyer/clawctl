# Highlight VM isolation in README

## Status: In Progress

## Scope

Update README messaging to lead with VM isolation as the main differentiator,
rather than "one command setup" which doesn't distinguish clawctl from
OpenClaw's own installer.

Does not cover changes to any other docs — just README.md.

## Plan

1. Rewrite hero tagline to lead with VM isolation
2. Merge opening paragraph and "under the hood" paragraph into one VM-first opener
3. Update closing CTA to echo the VM angle
4. Format check

## Steps

- [ ] Update hero tagline (lines 8-9)
- [ ] Rewrite opening paragraphs (lines 14-22) into single VM-first block
- [ ] Update closing CTA (lines 142-149)
- [ ] Format check and commit

## Notes

- The current "Get an OpenClaw agent running in one command" doesn't differentiate
  from OpenClaw's own single-command installer.
- Dropped "No SSH / No YAML wrestling" — SSH isn't a pain point if you wouldn't
  have used a VM otherwise, and YAML is a Lima implementation detail.
- The subtitle should reinforce that the VM is invisible: you manage everything
  from the host.

## Outcome

_To be written on completion._
