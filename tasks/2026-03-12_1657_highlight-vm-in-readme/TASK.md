# Highlight VM isolation in README

## Status: Resolved

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

- [x] Update hero tagline (lines 8-9)
- [x] Rewrite opening paragraphs (lines 14-22) into single VM-first block
- [x] Update closing CTA (lines 142-149)
- [x] Update Features list bullets to lead with isolation
- [x] Format check and commit

## Notes

- The current "Get an OpenClaw agent running in one command" doesn't differentiate
  from OpenClaw's own single-command installer.
- Dropped "No SSH / No YAML wrestling" — SSH isn't a pain point if you wouldn't
  have used a VM otherwise, and YAML is a Lima implementation detail.
- The subtitle should reinforce that the VM is invisible: you manage everything
  from the host.

## Outcome

Rewrote 4 areas of README.md to lead with VM isolation:

- **Hero tagline**: "Run OpenClaw agents in isolated VMs — managed entirely from your Mac"
- **Opener**: Merged two paragraphs into one VM-first block; Lima mentioned up front
- **Features list**: First two bullets now "Fully isolated" and "Zero VM wrangling" instead of "One-command setup" and "No SSH required"
- **Closing CTA**: "Your agent will be running in its own isolated VM in minutes"

Dropped "No SSH / No YAML wrestling" framing — those aren't pain points the target audience would have experienced without clawctl.
