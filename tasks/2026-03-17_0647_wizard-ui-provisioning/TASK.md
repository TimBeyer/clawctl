# Wizard UI → Config-First TUI with Headless Provisioning

## Status: In Progress

## Scope

Replace the 9-step interactive wizard with a config-building TUI that produces an `InstanceConfig` and delegates to the existing headless pipeline. This unifies two code paths into one, covers the full schema, and provides a better UX.

**In scope:**
- Two-pane TUI (form + contextual sidebar)
- Collapsible sections for all InstanceConfig fields
- Inline Zod validation per field/section
- Review screen with validation summary
- Provisioning progress monitor (Ink-based, wrapping headless pipeline)
- Completion screen with URLs and next steps
- Cleanup of old wizard steps

**Out of scope:**
- Changing headless pipeline logic
- New capabilities
- Interactive Tailscale login (require auth key)

## Plan

1. Add `HeadlessCallbacks` and `runHeadlessFromConfig()` to headless.ts
2. Build TUI components: FormField, FormSection, Sidebar, ConfigReview, ProvisionMonitor, CompletionScreen
3. Build ConfigBuilder step (main form orchestrator)
4. Rewrite App.tsx (4-phase flow) and create.ts (unified path)
5. Delete old wizard steps and unused code

## Steps

- [ ] Create task directory and TASK.md
- [ ] Phase 1: Callbacks on headless pipeline
- [ ] Phase 2: TUI components
- [ ] Phase 3: ConfigBuilder step
- [ ] Phase 4: App.tsx and create.ts rewrite
- [ ] Phase 5: Cleanup old steps
- [ ] Validate: lint, format, tests
- [ ] Commit and push

## Notes

- `ink-select-input` v6 already in package.json but unused — will use for provider type, tailscale mode
- Existing Zod schemas in `packages/types/src/schemas/` can be reused directly for inline validation
- The headless pipeline already handles all provisioning stages including bootstrap — the wizard's post-exit block in create.ts is redundant

## Outcome

(To be filled on completion)
