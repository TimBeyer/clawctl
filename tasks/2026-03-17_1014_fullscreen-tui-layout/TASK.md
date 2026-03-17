# Fullscreen TUI Layout

## Status: Resolved

## Scope

Make every TUI phase fill the terminal using Ink's flexbox layout. Each phase
owns the entire screen, expanding areas (logs, forms) use all available space,
and help text is pinned to the bottom.

Covers: PrereqCheck, ConfigBuilder, ProvisionMonitor, CompletionScreen,
ConfigReview, and the App root. Does not cover headless mode.

## Plan

1. New `useTerminalSize` hook — wraps `useStdout()`, returns `{ rows, columns }`
2. App root gets `height={rows}` on the outer Box
3. Each phase component gets `flexGrow={1}` to fill the screen
4. LogOutput / ProcessOutput get `flexGrow={1}` to expand into available space
5. Sidebar gets `flexGrow={1}` to stretch vertically in two-column layouts
6. Help text / keybinding hints pinned to bottom via spacers
7. ProvisionMonitor computes `maxLines` dynamically from `rows`

## Steps

- [x] Create `hooks/use-terminal-size.ts`
- [x] Update `app.tsx` — root `height={rows}`, remove `[v]` hint (moved to PrereqCheck)
- [x] Update `log-output.tsx` — `flexGrow={1}`, `overflow="hidden"`
- [x] Update `process-output.tsx` — `flexGrow={1}` on outer Box
- [x] Update `sidebar.tsx` — `flexGrow={1}` on outer Box
- [x] Update `prereq-check.tsx` — fullscreen layout, absorb `[v]` hint, spacer
- [x] Update `config-builder.tsx` — fullscreen two-pane layout, pinned keybindings
- [x] Update `provision-monitor.tsx` — fullscreen, dynamic `maxLines`
- [x] Update `completion-screen.tsx` — fullscreen with spacer
- [x] Update `config-review.tsx` — `flexGrow={1}`, spacer before hints
- [x] Verify no type errors in CLI package

## Outcome

All 10 files updated. Every phase now fills the terminal:

- **App root**: `height={rows}` from `useTerminalSize` hook constrains the
  entire tree to the terminal height. Removed the `[v]` hint (now in PrereqCheck).
- **PrereqCheck**: `flexGrow={1}` fills height, spacer pushes `[v]` hint to bottom.
  When installing, ProcessOutput expands to fill available space.
- **ConfigBuilder**: Outer Box is `flexGrow={1}` (horizontal), left pane's form area
  gets `flexGrow={1}` with `overflow="hidden"`, keybinding hints pinned at bottom.
  Sidebar stretches to match via `flexGrow={1}`. Same for review sub-phase.
- **ProvisionMonitor**: `flexGrow={1}` column layout. Log viewer expands to fill
  remaining space with dynamically computed `maxLines` based on `rows`. When logs
  hidden, spacer fills the gap. Help text pinned at bottom.
- **CompletionScreen**: Content at top, `flexGrow={1}` spacer pushes content up.
- **ConfigReview**: `flexGrow={1}` outer Box, spacer before keybinding hints.
- **LogOutput**: `flexGrow={1}` + `overflow="hidden"` so it fills its container.
- **ProcessOutput**: `flexGrow={1}` so it expands when used inside PrereqCheck.

No new type errors in the CLI package. Pre-existing errors in vm-cli and
host-core packages are unrelated.

## Notes

- `useTerminalSize` falls back to 24×80 if stdout dimensions aren't available.
  It listens for `resize` events and triggers re-render.
- The `maxLines` calculation in ProvisionMonitor accounts for header border (3),
  stage list, visible steps (capped at 5), log border (3), and help text (1).
  Minimum is 3 lines to avoid collapsing completely on tiny terminals.
- The error phase in App also gets a spacer to fill the screen.
