# CLI Wizard Flow

The CLI walks through 8 steps sequentially. Each step is a self-contained React (Ink) component that calls `onComplete` when finished.

## Step 1: Welcome (Prerequisite Check)

**Component**: `src/steps/welcome.tsx`
**Step indicator**: Step 1/8

Checks three prerequisites automatically on mount:

1. **macOS detected** -- `os.platform() === "darwin"`. Also checks `os.arch()` for arm64.
2. **Homebrew installed** -- `which brew` via `commandExists()`.
3. **Lima installed** -- `limactl --version` via `getLimaVersion()`.

Each check displays a green checkmark or red X.

**Flow logic**:

- If macOS and Homebrew are present but Lima is missing: advance to Step 3 (Host Setup) to install Lima.
- If macOS and Homebrew and Lima are all present: skip to Step 2 (Configure).
- If macOS or Homebrew is missing: the wizard stops. The user must install the missing prerequisite manually.

**Error handling**: Missing macOS or Homebrew is a hard stop -- the wizard cannot proceed. Missing Lima is recoverable (installed in Step 3).

## Step 2: Configure

**Component**: `src/steps/configure.tsx`
**Step indicator**: Step 2/8

Prompts the user for five values, one at a time:

| Field             | Default                   | Notes                                                        |
| ----------------- | ------------------------- | ------------------------------------------------------------ |
| Project directory | `~/openclaw-vms/my-agent` | Where generated files go. `~` is expanded to `os.homedir()`. |
| VM name           | `openclaw`                | Used as the Lima instance name (`limactl shell <name>`)      |
| CPUs              | `4`                       | Passed to lima.yaml `cpus`                                   |
| Memory            | `8GiB`                    | Passed to lima.yaml `memory`                                 |
| Disk              | `50GiB`                   | Passed to lima.yaml `disk`                                   |

Each field shows its default value, which the user can accept by pressing Enter or overwrite by typing.

Completed fields show with a green checkmark above the current prompt.

**Error handling**: No validation currently -- values are accepted as entered. Invalid values will surface as errors during VM creation in Step 4.

## Step 3: Host Setup (Install Lima)

**Component**: `src/steps/host-setup.tsx`
**Step indicator**: Step 3/8

This step only appears if Lima was not found in Step 1. It runs `brew install lima` via the `installLima()` function in `src/lib/homebrew.ts`.

**Flow logic**:

- If Lima is already installed (step was reached via fallback), it auto-advances after 300ms.
- Otherwise, runs `brew install lima`, captures the installed version, and advances to Configure.

**Error handling**: If `brew install lima` fails, the error message is displayed in red. The wizard stops -- Lima is required.

## Step 4: Create VM

**Component**: `src/steps/create-vm.tsx`
**Step indicator**: Step 4/8

This is the longest step. It runs through four phases:

### Phase 1: Project Setup

- Creates `projectDir/data/` directory with `mkdir -p`.

### Phase 2: Generate Files

- Generates `lima.yaml` from `VMConfig` using `generateLimaYaml()`.
- Generates provisioning scripts from TypeScript templates (held in memory, not written to host).
- Initializes a git repository with a `.gitignore` and initial commit.

### Phase 3: Create VM

- Checks if a VM with the given name already exists (`limactl list --json`).
- If it exists, skips creation with a message.
- If it does not exist, runs `limactl create --name <name> --tty=false <lima.yaml>`.
- This downloads the Ubuntu 24.04 arm64 cloud image (first run) and boots the VM.
- Deploys provisioning scripts into the VM at `/tmp/clawctl-provision/` via `shellExec` heredocs.
- Timeout: 600 seconds (10 minutes).

A spinner and log output are shown during VM creation.

**Error handling**: Any phase failure displays the error and halts the wizard. Common failures:

- Directory creation permissions
- `limactl create` timeout (slow network, large image download)
- Provisioning script failures inside the VM
- Script deployment failures (VM not reachable)

## Step 5: Provision Status (Verification)

**Component**: `src/steps/provision-status.tsx`
**Step indicator**: Step 5/8

Verifies that the provisioning scripts installed everything correctly by running checks inside the VM via `limactl shell`:

1. **Node.js 22** -- `node --version` must contain `v22`.
2. **Tailscale** -- `tailscale --version` must succeed.
3. **Homebrew** -- `brew --version` must succeed.
4. **1Password CLI** -- `op --version` must succeed.

Each check shows a status icon: pending (dimmed circle), running (cyan spinner), done (green check), or error (red X with message).

**Error handling**: Individual check failures are shown but do not block advancement. The wizard proceeds to credentials even if some checks fail -- the user can fix provisioning issues later.

## Step 6: Credentials

**Component**: `src/steps/credentials.tsx`
**Step indicator**: Step 6/8

Two optional sub-steps, each with a Y/n prompt:

### 1Password Setup

- Asks "Set up 1Password now? [Y/n]"
- If yes: prompts for `OP_SERVICE_ACCOUNT_TOKEN` (input masked with asterisks)
- Validates the token by running `op whoami --format json` inside the VM with the token set
- On success: persists the token to `~/.openclaw/credentials/op-token` (chmod 600) and appends the export to `~/.bashrc`
- On failure: shows error, returns to token input

### Tailscale Setup

- Asks "Set up Tailscale now? [Y/n]"
- If yes: runs `sudo tailscale up --accept-dns=false` inside the VM
- On success: queries `tailscale status --json` to show the assigned DNS name
- Both steps can be skipped with 'n' and configured manually later

**Error handling**: Token validation failures return the user to the input prompt. Tailscale connection errors are displayed but the wizard proceeds to finish.

## Step 7: OpenClaw Onboarding

**Component**: `src/steps/onboard.tsx`
**Step indicator**: Step 7/8

Prompts the user to start interactive onboarding or skip it:

- **[Enter]** -- Exits the Ink app with an `OnboardResult`. The create command then runs `openclaw onboard --skip-daemon` interactively inside the VM via `execInteractive()`. After onboarding, it installs the gateway daemon, configures the tools profile and workspace, and extracts the gateway token.
- **[s]** -- Skips onboarding. The user can run it later manually inside the VM.

If onboarding succeeds and a `BOOTSTRAP.md` exists in the workspace, the CLI also launches the agent's first conversation via `openclaw tui`.

**Error handling**: Onboarding failures are reported with retry instructions. The instance is still registered regardless.

## Step 8: Finish

**Component**: `src/steps/finish.tsx`
**Step indicator**: Step 8/8

Displays a summary with next steps and exits the Ink app with a `FinishResult`:

If onboarding was completed:

```
# Access dashboard
http://localhost:18789

# Enter the VM
clawctl shell <vmName>
```

If onboarding was skipped:

```
# Run OpenClaw onboarding inside the VM
clawctl shell <vmName> -- openclaw onboard --install-daemon

# Enter the VM
clawctl shell <vmName>
```

The Finish component calls `useApp().exit()` with the VM name and project directory, which the create command uses to register the instance and write `clawctl.json`.
