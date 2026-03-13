# TODO

Ideas and future work. Not prioritised — just a place to capture things
so they don't get lost.

---

- [x] **Remove home directory mount as default** _(done: e770d69)_

- [ ] **Auto-commit mechanism for inner openclaw changes**
      The agent inside the VM writes to `data/` (configs, workspace files,
      etc.) but can't commit — git runs on the host. We need a way for the
      inner openclaw to request a commit. Rough idea: the agent writes a
      file like `data/.git-request` containing the commit message; a `fs`
      watcher on the host picks it up, stages `data/`, commits with that
      message, and removes the request file. Could be a long-running
      background process or integrated into the CLI's manage mode.

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

- [ ] **Automate manual post-setup steps**
      Things currently done by hand after onboarding that should be part of
      the provisioning flow. Based on real usage:
  - **Docker permissions** — add the openclaw user to the docker group
    so the agent can run containers without sudo
  - **Sandbox disabled** — for trusted single-user setups, disable the
    openclaw sandbox. Needs a config set during post-onboard setup.
    Should probably be a wizard option ("trusted environment?") since
    it's a security trade-off.
  - **Workspace on shared mount** — already done (we set
    `agents.defaults.workspace` to `/mnt/project/data/workspace`)
  - **Headless Chromium** — install and configure so the agent can
    browse. Overlaps with the pre-installed tooling item above.
  - **Heartbeat security reviews** — configure periodic security
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

- [x] **`clawctl restart` with health verification** _(done: v0.4.0)_

- [ ] **In-place upgrades**
      When openclaw ships a new version, update the VM without rebuilding.
      Re-run the idempotent provisioning scripts, restart the daemon. State
      survives because it lives in `data/`. A simple
      `clawctl upgrade <name>` command.

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

- [ ] **VM-side CLI (`claw`) — agent tooling inside the VM**
      Split the tooling into two CLIs: `clawctl` (host, VM lifecycle) and
      `claw` (VM-side, agent tooling). Separate packages in a monorepo,
      sharing code but independently built.

  `claw` owns everything that happens _inside_ the VM:
  - `claw bootstrap` — post-onboarding setup (daemon install, config set,
    workspace init). Replaces the imperative shell commands in `bin/cli.tsx`.
  - `claw doctor` — health checks beyond `openclaw doctor` (mount
    verification, env vars, PATH, service status).
  - `claw create skill` — scaffold a new skill directory with SKILL.md,
    scripts/, package.json in the right structure.
  - `claw update` — self-update the VM-side CLI (pulled from host mount
    or downloaded).
  - Future: any agent-facing commands (skill management, config, etc.)

  **How it gets there:** Built at provisioning time (`bun build --compile`),
  copied into the VM during provisioning. `clawctl upgrade` rebuilds and
  pushes the new binary.

  **Host→VM interface:** `clawctl` calls `claw` commands inside the VM
  instead of raw `bash -lc` strings. `claw` returns structured output
  (JSON or exit codes) so the host can parse reliably. This replaces the
  current pattern of regex-parsing shell output.

  **What this subsumes:** The host-side CLI proxy (`clawctl openclaw` / `oc`)
  already exists. With `claw` on the VM side, it would become
  `clawctl oc <command>` → `limactl shell ... claw <command>`. The proxy
  logic is just dispatch, `claw` does the real work.

  **Naming rationale:** `clawctl` = control plane (host), `claw` = the
  tool itself (VM). Short and natural for interactive use inside the VM.

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
