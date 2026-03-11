# Add "Show Process Logs" Toggle to Installer UI

## Status: Resolved

## Scope

Add a `v` key toggle that switches between the clean spinner view and a detailed
process log view during long-running operations (VM creation, Lima install,
provisioning, credential validation).

Does NOT cover: persistent log files, configurable key bindings, log level filtering.

## Plan

1. Create `useVerboseMode` hook with `useInput` toggle on `v` key
2. Add `execWithLogs` to `exec.ts` for streaming subprocess output via callback
3. Update `lima.ts` and `homebrew.ts` with `onLine` callback variants
4. Create `ProcessOutput` component (spinner-only vs spinner+logs)
5. Wire verbose mode into App and step components via React context
6. Add global hint bar showing toggle state

## Steps

- [x] Create `src/hooks/use-verbose-mode.ts`
- [x] Add `execWithLogs` to `src/lib/exec.ts`
- [x] Add streaming variants to `src/lib/lima.ts`
- [x] Add streaming variant to `src/lib/homebrew.ts`
- [x] Create `src/components/process-output.tsx`
- [x] Create verbose context in `src/app.tsx`
- [x] Update `src/steps/create-vm.tsx` to use streaming + ProcessOutput
- [x] Update `src/steps/host-setup.tsx` to use streaming + ProcessOutput
- [x] Update `src/steps/provision-status.tsx` to use streaming + ProcessOutput
- [x] Update `src/steps/credentials.tsx` to use streaming + ProcessOutput
- [x] Run type check (passes) and tests (no test files exist yet)

## Notes

- Used a `useProcessLogs` hook with ref-based mutable buffer + tick counter to
  avoid stale closure issues with streaming callbacks inside useEffect. The ref
  ensures `addLine` always appends to the current array, and the tick state
  triggers re-renders so the UI updates in real-time.
- `VerboseContext` (React context) propagates verbose state from App to all steps,
  avoiding prop drilling.
- The `v` key toggle works globally via `useInput` at the App level. During text
  input phases (e.g. op-token entry), Ink's TextInput captures keystrokes so
  there's no conflict.
- Hint bar only shows during process-heavy steps (host-setup, create-vm,
  provision, credentials), not during form/welcome/finish steps.

## Outcome

All planned functionality delivered. New files: `use-verbose-mode.ts`,
`verbose-context.ts`, `use-process-logs.ts`, `process-output.tsx`. Modified:
`exec.ts`, `lima.ts`, `homebrew.ts`, `app.tsx`, and all four step components.
TypeScript compiles cleanly.
