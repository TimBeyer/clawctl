import dedent from "dedent";
import type { CapabilityContext, ProvisionResult } from "@clawctl/types";

const OP_VERSION = "2.30.0";
const OP_DOWNLOAD_URL = (version: string) =>
  `https://cache.agilebits.com/dist/1P/op2/pkg/v${version}/op_linux_arm64_v${version}.zip`;

/** Check if 1Password CLI is installed (real or wrapped). */
export async function isOpInstalled(ctx: CapabilityContext): Promise<boolean> {
  return ctx.commandExists("op");
}

/** Install 1Password CLI. */
export async function provisionOpCli(ctx: CapabilityContext): Promise<ProvisionResult> {
  try {
    if (await isOpInstalled(ctx)) {
      ctx.log("1Password CLI already installed");
      return { name: "op-cli", status: "unchanged" };
    }

    const home = process.env.HOME ?? "/root";
    const localBin = `${home}/.local/bin`;

    ctx.log("Installing 1Password CLI...");
    await ctx.fs.ensureDir(localBin);
    await ctx.net.downloadFile(OP_DOWNLOAD_URL(OP_VERSION), "/tmp/op.zip");
    await ctx.exec("unzip", ["-o", "/tmp/op.zip", "-d", "/tmp/op"], { quiet: true });
    await ctx.fs.rename("/tmp/op/op", `${localBin}/op`);
    await ctx.fs.chmod(`${localBin}/op`, 0o755);
    await ctx.fs.rm("/tmp/op", { recursive: true, force: true });
    await ctx.fs.rm("/tmp/op.zip", { force: true });

    ctx.log("1Password CLI installed");
    return { name: "op-cli", status: "installed" };
  } catch (err) {
    return { name: "op-cli", status: "failed", error: String(err) };
  }
}

/**
 * Install the op wrapper script. Moves the real `op` binary to `.op-real`
 * and writes the wrapper in its place. Idempotent — skips if already wrapped.
 * Conditional — only installs if op is available.
 */
export async function provisionOpWrapper(ctx: CapabilityContext): Promise<ProvisionResult> {
  try {
    const home = process.env.HOME ?? "/root";
    const opPath = `${home}/.local/bin/op`;
    const opRealPath = `${home}/.local/bin/.op-real`;

    if (!(await isOpInstalled(ctx))) {
      return { name: "op-wrapper", status: "unchanged", detail: "op not installed" };
    }

    // Check if already wrapped
    try {
      await ctx.fs.stat(opRealPath);
      ctx.log("op wrapper already installed");
      return { name: "op-wrapper", status: "unchanged" };
    } catch {
      // .op-real doesn't exist — need to wrap
    }

    ctx.log("Installing op wrapper...");
    await ctx.fs.rename(opPath, opRealPath);
    await ctx.fs.writeFile(
      opPath,
      dedent`
        #!/bin/sh
        TOKEN_FILE="\${HOME}/.openclaw/secrets/op-token"
        if [ -f "$TOKEN_FILE" ]; then
          export OP_SERVICE_ACCOUNT_TOKEN=$(cat "$TOKEN_FILE")
        fi
        exec "\${HOME}/.local/bin/.op-real" "$@"
      `,
    );
    await ctx.fs.chmod(opPath, 0o755);

    ctx.log("op wrapper installed");
    return { name: "op-wrapper", status: "installed" };
  } catch (err) {
    return { name: "op-wrapper", status: "failed", error: String(err) };
  }
}

/**
 * Install exec-approvals.json for the 1Password CLI.
 *
 * This file is clawctl-managed — it sets the per-agent exec policy that
 * the OpenClaw gateway intersects with `tools.exec.*` config. Defaults
 * mirror clawctl's trusted-operator trust model: `security=full` so the
 * agent can exec freely. The op pattern is kept in the allowlist as
 * forward-compatible documentation: if the operator later flips to
 * restrictive mode (security=allowlist) via `openclaw approvals` or
 * by editing this file, op still works without them remembering to
 * re-add it.
 *
 * Earlier versions of this capability wrote `security=deny` /
 * `agents.main.security=allowlist` defaults, which combined with
 * recent upstream policy-intersection rules (per-agent override beats
 * config request) silently blocked all exec on a fresh install. We
 * now own this file in the permissive direction; operators who want
 * lock-down customize via `openclaw approvals` after bootstrap.
 *
 * Conditional — only installs if op is available.
 */
export async function provisionExecApprovals(ctx: CapabilityContext): Promise<ProvisionResult> {
  try {
    if (!(await isOpInstalled(ctx))) {
      return { name: "exec-approvals", status: "unchanged", detail: "op not installed" };
    }

    const home = process.env.HOME ?? "/root";
    const configDir = `${home}/.openclaw`;
    const path = `${configDir}/exec-approvals.json`;
    const content = JSON.stringify(
      {
        version: 1,
        defaults: {
          security: "full",
          ask: "off",
          askFallback: "full",
        },
        agents: {
          main: {
            security: "full",
            ask: "off",
            allowlist: [{ pattern: "~/.local/bin/op" }],
          },
        },
      },
      null,
      2,
    );

    // Check if already up to date
    try {
      const existing = await ctx.fs.readFile(path, "utf-8");
      if (existing === content) {
        ctx.log("exec-approvals already configured");
        return { name: "exec-approvals", status: "unchanged" };
      }
    } catch {
      // File doesn't exist — will create
    }

    await ctx.fs.mkdir(configDir, { recursive: true });
    await ctx.fs.writeFile(path, content);
    ctx.log("exec-approvals configured for op");
    return { name: "exec-approvals", status: "installed" };
  } catch (err) {
    return { name: "exec-approvals", status: "failed", error: String(err) };
  }
}
