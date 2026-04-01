# TODO

Ideas and future work. Not prioritised — just a place to capture things
so they don't get lost.

---

- [x] **Remove home directory mount as default** _(done: e770d69)_

- [x] **Auto-commit mechanism for inner openclaw changes** _(done: v0.9.0)_
      Implemented as the checkpoint system: `claw checkpoint --message "reason"`
      writes a signal file to `data/.checkpoint-request`; the host daemon's
      `checkpoint-watch` task detects it, runs `git add data/ && git commit`,
      and removes the file. The checkpoint capability also installs a skill
      into the workspace so the agent knows how to use it.

- [x] **Headless / preconfigured provisioning (skip the wizard)** _(done: 14b93d1)_

- [x] **Instance registry — track all created openclaws** _(done: v0.4.0)_

- [x] **Host-side CLI proxy for openclaw commands** _(done: `clawctl openclaw` / `clawctl oc`)_
      Proxies any `openclaw` subcommand into the VM. Also added `clawctl shell -- <cmd>`
      for arbitrary commands, and instance context resolution (`-i` flag, env var,
      `.clawctl` file, global context) so you don't have to type the instance name.

- [ ] **Pre-installed tooling — web browsing, dev tools, etc.**
      Ship the VM with useful software beyond the bare minimum so openclaw
      can do more out of the box. Candidates:
  - **Playwright + Chromium** — web browsing, scraping, screenshots.
    `npx playwright install --with-deps chromium` installs the browser
    and all system deps on Ubuntu. Gives the agent eyes on the web.
  - **git** — already there via apt, but worth confirming config
  - **Python 3** — scripting, data analysis, many MCP servers need it
  - **Docker** — if the agent needs to run containers (heavy, maybe opt-in)
  - **ffmpeg** — media processing if the agent handles audio/video
    Consider: which of these should be always-on vs opt-in during the
    wizard or via config. Playwright + Chromium is the highest value
    add — web access is a core capability gap right now.

- [ ] **Automate manual post-setup steps** _(partially done)_
      Some items are now handled by the bootstrap flow; others remain.
  - [x] **Sandbox disabled** — wizard option, bootstrap sets
    `agents.defaults.sandbox.mode off` when configured
  - [x] **Workspace on shared mount** — bootstrap sets
    `agents.defaults.workspace /mnt/project/data/workspace`
  - [ ] **Docker permissions** — add the openclaw user to the docker group
    so the agent can run containers without sudo
  - [ ] **Headless Chromium** — install and configure so the agent can
    browse. Overlaps with the pre-installed tooling item above.
  - [ ] **Heartbeat security reviews** — configure periodic security
    review tasks. Needs investigation into how openclaw schedules
    these (cron? built-in scheduler?).

- [ ] **Post-provision setup commands for optional services**
      Allow configuring 1Password, Tailscale, etc. on an already-running VM.
      Right now these are only offered during the wizard — if you skip them,
      there's no easy way to add them later. Something like:
  - `clawctl setup 1password <vm>` — prompt for service account token,
    inject into the daemon environment
  - `clawctl setup tailscale <vm>` — prompt for auth key, run
    `tailscale up` inside the VM
  - `clawctl setup docker <vm>` — install docker, add user to group
    These reuse the same provisioning logic from the wizard steps but
    can target an existing instance.

- [ ] **Manage mount points after VM creation**
      Currently mounts are only configurable at create time via `config.mounts`.
      After that, the only way to add or remove a mount is editing
      `~/.lima/<vm>/lima.yaml` directly and restarting. clawctl should own this:
  - `clawctl mount add <vm> <host-path> --mount-point <guest-path> [--writable]`
  - `clawctl mount remove <vm> <guest-path>`
  - `clawctl mount list <vm>`
  Under the hood: edit the Lima yaml and restart the VM. Lima doesn't
  support hot-adding mounts, so a restart is required — the command should
  warn and confirm. Also update `clawctl.json` so the mount survives a
  future rebuild.

- [x] **`clawctl restart` with health verification** _(done: v0.4.0)_

- [x] **In-place upgrades** _(done: v0.16.0)_
      Implemented as `clawctl update`: checks for new releases, downloads
      and self-replaces the host binary, then pushes the new `claw` binary
      to all running VMs and runs `claw migrate` for capability migrations.
      Stopped VMs get a `pendingClawUpdate` flag and are updated on next start.

- [ ] **Skill portability — make clawctl aware of the skills convention**
      Openclaw already has a natural convention: each skill lives in
      `skills/<name>/` with a `SKILL.md` manifest and `scripts/` dir.
      TOOLS.md documents environment-specific notes and references skills.
      The agent is already producing this structure organically (e.g.
      `skills/sixt-rental/SKILL.md` + `scripts/sixt-search.js`).

  What clawctl should add:
  - `clawctl skills list <vm>` — scan `data/workspace/skills/` and
    list installed skills (name + summary from SKILL.md)
  - `clawctl skills export <vm> <skill>` — tar up a skill directory
    (excluding node_modules) for transplanting
  - `clawctl skills import <vm> <skill.tar.gz>` — drop into another
    instance, run dependency install
  - Ensure `node_modules/` dirs are .gitignored in the workspace
  - Per-skill `package.json` / `requirements.txt` so deps are isolated
    and reproducible — skills should be self-contained enough to lift
    out and drop in elsewhere

  We should NOT dictate the convention in BOOTSTRAP.md or impose our
  own structure — openclaw already has TOOLS.md and SKILL.md patterns.
  Clawctl just needs to understand and work with what's already there.

  Longer term: skill sharing between instances, maybe a registry.

- [x] **VM-side CLI (`claw`) — agent tooling inside the VM** _(done: v0.8.0)_
      Implemented as `@clawctl/vm-cli`. Commands: `claw provision <phase>`,
      `claw doctor`, `claw checkpoint`, `claw migrate`. Built with
      `bun build --compile` for linux-arm64, deployed into VM at
      `/usr/local/bin/claw`. All commands return structured JSON. Host calls
      claw via `limactl shell` instead of raw bash strings.
  - [ ] **`claw create skill`** — scaffold a new skill directory (not yet implemented)

- [ ] **Adopt native OpenClaw installations into a clawctl VM**
      Many users have OpenClaw running natively on their machine. `clawctl adopt`
      would create a VM that takes over an existing native installation:
  - Detect the native OpenClaw data dirs (state, config, workspace)
  - Create a new VM with mounts pointing at the existing data
  - Provision the VM (idempotent — packages already installed natively
    get skipped)
  - Stop the native daemon, start the VM-based one
  - Optionally move data into the clawctl project directory layout

  This is the general-purpose version of the one-off migration done for
  the original Klaus VM (which was adopted from a pre-clawctl Lima setup).
  The native case is harder because data paths vary and the native daemon
  must be stopped cleanly.

---

## Longer horizon

- [ ] **Portable instance state — clean separation of identity from compute**
      Design the `data/` directory so it contains _everything_ needed to
      reconstruct a running openclaw on a fresh VM: config, conversation
      history, identity files, workspace, credentials. If a VM dies, you
      point a new one at the same `data/` dir and it comes back as the same
      agent. This is already partially true (config + workspace are mounted)
      but needs to be deliberate and complete — audit what openclaw stores
      outside the mount and make sure nothing essential lives only inside the
      VM. Think of `data/` as the "soul" and the VM as disposable hardware.

- [ ] **VM snapshots for full-state rollback**
      Lima supports VM snapshots. Snapshot before upgrades or risky config
      changes, roll back if things break. Complements git-based `data/`
      history — git covers agent state, snapshots cover VM-level state
      (installed packages, system config, anything outside the mount).
      Lower priority than getting git-based persistence solid first.

- [ ] **Firecracker backend for hosted / SaaS deployment**
      Replace Lima with Firecracker microVMs for a multi-tenant hosted
      offering. The provisioning scripts are already plain Linux — the main
      work is: a control plane API, a Firecracker VM lifecycle manager,
      networking (tap devices or overlay), and attaching persistent storage
      (block devices or network filesystem) in place of virtiofs mounts.
      Portable instance state (above) is a prerequisite — it's what makes
      migration and recovery possible. Firecracker's fast boot (~125ms)
      also opens up interesting options like cold-starting VMs on demand
      rather than keeping them running 24/7.
