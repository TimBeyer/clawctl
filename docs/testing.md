# Testing Strategy

## Test Layers

| Layer               | Speed   | What                                  | Runs when         |
| ------------------- | ------- | ------------------------------------- | ----------------- |
| Lint + format       | ms      | Code style, type errors               | Every commit      |
| Template unit tests | ms      | Generator output, `bash -n`           | `bun test`        |
| Parsing unit tests  | ms      | Token extraction, version parsing     | `bun test`        |
| VM provisioning     | ~5 min  | Scripts run on real Ubuntu VM         | `bun run test:vm` |
| Snapshot-based      | ~30s    | Clone golden VM, test from checkpoint | Future            |
| Stub openclaw       | seconds | Fake openclaw binary, test CLI flow   | Future            |
| Full e2e            | 10+ min | Complete wizard → onboard → verify    | Manual            |

## Running Tests

### Unit tests (fast)

```bash
bun test
```

Runs all `*.test.ts` files under `src/`. Covers template generators and parsing logic.

### Linting & formatting

```bash
bun run lint           # ESLint — catch errors and bad patterns
bun run format:check   # Prettier — check formatting consistency
bun run format         # Prettier — auto-fix formatting
```

### VM provisioning tests (slow)

```bash
bun run test:vm
```

Requires Lima installed on the host. Creates (or reuses) a `clawctl-test` VM
and verifies provisioning outcomes: commands exist, services are enabled,
PATH is correct.

The tests are gated by the `CLAWCTL_VM_TESTS=1` env var and won't run
during normal `bun test`.

## Adding Tests for New Templates

When you add a new template generator:

1. Add an entry to the `bashGenerators` array in
   `src/templates/templates.test.ts`:

   ```typescript
   ["generateMyScript", generateMyScript, ["expected-content", "keywords"]],
   ```

2. This automatically tests:
   - Starts with `#!/bin/bash` and `set -euo pipefail`
   - Contains your expected content strings
   - Passes `bash -n` syntax validation

3. If the template takes parameters, add a dedicated `describe` block
   (see `generateLimaYaml` for an example).

## Future: Golden VM Snapshots

The idea: maintain a pre-provisioned VM snapshot that can be cloned in
~30 seconds instead of provisioning from scratch (~5 min).

To create a golden snapshot:

1. Run full provisioning on a fresh VM
2. Stop the VM
3. Save it as a template: `limactl snapshot create clawctl-golden`
4. Tests clone from this snapshot instead of creating from scratch

This requires Lima snapshot support and a workflow for keeping the
golden image up to date when provisioning scripts change.

## Future: Stub OpenClaw Binary

For testing the CLI flow without a real OpenClaw installation:

1. Create a fake `openclaw` binary that:
   - Responds to `--version` with a version string
   - Responds to `onboard` by writing expected config files and exiting 0
   - Responds to `doctor` with exit 0
   - Responds to `daemon install/start/restart` with exit 0
   - Responds to `config set` with exit 0

2. Place it on PATH before the real binary in tests

3. This enables testing the full CLI wizard flow in seconds without
   VM or network access.
