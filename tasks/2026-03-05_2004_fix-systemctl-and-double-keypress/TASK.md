# Fix: systemctl --user failure + double keypress in onboarding

## Status: Resolved

## Scope

Bugs that occur after VM creation during the onboarding phase:

1. **systemctl --user failure** — `openclaw onboard --install-daemon` fails at the
   gateway service step with "systemctl is-enabled unavailable."

2. **Double keypress** — Every key must be pressed twice during the onboarding wizard.

3. **Dashboard URL wrong** — Hardcoded as port 3000 but gateway runs on 18789.

Does NOT cover: any changes to the OpenClaw onboarding wizard itself.

## Plan

1. Rewrite `src/templates/installers/systemd-linger.ts` with robust user detection
   and verification (no silent failures).
2. Workaround the openclaw `daemon install` bug by pre-creating a stub service unit.
3. Fix double keypress with SSH-level PTY allocation + stdin cleanup.
4. Fix dashboard port (3000 → 18789) everywhere.

## Steps

- [x] Rewrite systemd-linger.ts with proper user detection and linger verification
- [x] Fix cli.tsx: reset stdin raw mode after Ink exits
- [x] Fix cli.tsx: wrap onboarding command with `script` for remote PTY allocation
- [x] Investigate actual root causes after first round of fixes failed
- [x] Create gateway-service-stub.ts provisioning step
- [x] Fix dashboard port: DASHBOARD_PORT=3000 → GATEWAY_PORT=18789
- [x] Update finish.tsx, cli.tsx, lima-yaml.ts, constants.ts
- [x] Round 2: remove `script -qc` (caused hang), use `SSH="ssh -tt"` for PTY
- [x] Commit

## Notes

- **Original diagnosis was partially wrong.** The linger fix was correct (made the
  script robust) but linger WAS working — it wasn't the cause of the systemctl error.

- **systemctl root cause**: Openclaw's `daemon install` command checks
  `systemctl --user is-enabled openclaw-gateway.service` and treats ANY non-zero
  exit as "systemctl unavailable" — including exit 1 (disabled) and exit 4 (not-found).
  This is a bug in openclaw, not in our provisioning. Verified by:
  - Confirming `systemctl --user` works fine in the VM (`Linger=yes`, session running)
  - Creating a stub unit → still fails (exit 1 = "disabled" also treated as unavailable)
  - Enabling the stub → succeeds (exit 0 = "enabled" passes the check)
  - Then `openclaw daemon install --force` works and replaces the stub with the real service

- **Double keypress: three rounds of investigation.**
  1. `process.stdin.setRawMode(false)` alone — didn't fix it
  2. `script -qc` inside VM allocates a remote PTY (`/dev/pts/0`), but SSH channel
     itself is still non-PTY. Double keypress persisted. Also caused hang after
     command completion (`script` waits for the PTY to close).
  3. `SSH="ssh -tt"` forces PTY allocation at the SSH level. Confirmed with
     `SSH="ssh -tt" limactl shell openclaw tty` → `/dev/pts/0` vs `not a tty`
     without it. Lima shell-splits `$SSH` (verified by setting `SSH="echo test"`
     and observing the split args in output). This gives the remote process a proper
     terminal from SSH's perspective, which is what the prompt library needs.

- **Dashboard port**: Gateway runs on 18789 (openclaw default), not 3000. Port 3000
  was never correct. Verified `curl localhost:18789` returns 200 from the gateway.

## Outcome

1. **systemd-linger.ts**: Made robust with `$SUDO_USER` + `/etc/passwd` UID fallback
   and linger file verification.

2. **gateway-service-stub.ts**: New provisioning step that pre-creates and enables
   a stub `openclaw-gateway.service` unit. Workaround for the openclaw bug where
   `daemon install` rejects any non-zero exit from `systemctl --user is-enabled`.

3. **cli.tsx double keypress + hang**: Removed `script -qc` (caused hang, wrong
   layer for PTY). Instead, set `SSH="ssh -tt"` in env to force SSH-level PTY
   allocation. Also clean up Ink's stdin (`removeAllListeners()`, `pause()`,
   `setRawMode(false)`) before spawning the subprocess.

4. **Port fix**: `DASHBOARD_PORT = 3000` → `GATEWAY_PORT = 18789` in constants.ts.
   Updated lima-yaml.ts port forwarding, cli.tsx dashboard URL, finish.tsx dashboard URL.

All 12 existing tests pass.
