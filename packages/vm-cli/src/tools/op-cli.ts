import dedent from "dedent";
import { exec, commandExists } from "../exec.js";
import { log } from "../output.js";
import { downloadFile } from "./curl.js";
import { ensureDir } from "./fs.js";
import { chmod, rename, rm, stat, writeFile, mkdir } from "fs/promises";
import type { ProvisionResult } from "./types.js";

const OP_VERSION = "2.30.0";
const OP_DOWNLOAD_URL = (version: string) =>
  `https://cache.agilebits.com/dist/1P/op2/pkg/v${version}/op_linux_arm64_v${version}.zip`;

/** Check if 1Password CLI is installed (real or wrapped). */
export async function isInstalled(): Promise<boolean> {
  return commandExists("op");
}

/** Install 1Password CLI. Returns a ProvisionResult. */
export async function provision(): Promise<ProvisionResult> {
  try {
    if (await isInstalled()) {
      log("1Password CLI already installed");
      return { name: "op-cli", status: "unchanged" };
    }

    const home = process.env.HOME ?? "/root";
    const localBin = `${home}/.local/bin`;

    log("Installing 1Password CLI...");
    await ensureDir(localBin);
    await downloadFile(OP_DOWNLOAD_URL(OP_VERSION), "/tmp/op.zip");
    await exec("unzip", ["-o", "/tmp/op.zip", "-d", "/tmp/op"], { quiet: true });
    await rename("/tmp/op/op", `${localBin}/op`);
    await chmod(`${localBin}/op`, 0o755);
    await rm("/tmp/op", { recursive: true, force: true });
    await rm("/tmp/op.zip", { force: true });

    log("1Password CLI installed");
    return { name: "op-cli", status: "installed" };
  } catch (err) {
    return { name: "op-cli", status: "failed", error: String(err) };
  }
}

/**
 * Wrapper script that makes `op` work in OpenClaw's exec environment.
 *
 * The exec tool doesn't source ~/.profile, so OP_SERVICE_ACCOUNT_TOKEN is not
 * available. This wrapper reads the token from the secrets file (already
 * persisted by credentials setup) and execs the real binary.
 */
function opWrapperContent(): string {
  return dedent`
    #!/bin/sh
    TOKEN_FILE="\${HOME}/.openclaw/secrets/op-token"
    if [ -f "$TOKEN_FILE" ]; then
      export OP_SERVICE_ACCOUNT_TOKEN=$(cat "$TOKEN_FILE")
    fi
    exec "\${HOME}/.local/bin/.op-real" "$@"
  `;
}

/**
 * Install the op wrapper script. Moves the real `op` binary to `.op-real`
 * and writes the wrapper in its place. Idempotent — skips if already wrapped.
 * Conditional — only installs if op is available.
 */
export async function provisionOpWrapper(): Promise<ProvisionResult> {
  try {
    const home = process.env.HOME ?? "/root";
    const opPath = `${home}/.local/bin/op`;
    const opRealPath = `${home}/.local/bin/.op-real`;

    // Check if op is installed at all
    if (!(await isInstalled())) {
      return { name: "op-wrapper", status: "unchanged", detail: "op not installed" };
    }

    // Check if already wrapped
    try {
      await stat(opRealPath);
      log("op wrapper already installed");
      return { name: "op-wrapper", status: "unchanged" };
    } catch {
      // .op-real doesn't exist — need to wrap
    }

    log("Installing op wrapper...");
    await rename(opPath, opRealPath);
    await writeFile(opPath, opWrapperContent());
    await chmod(opPath, 0o755);

    log("op wrapper installed");
    return { name: "op-wrapper", status: "installed" };
  } catch (err) {
    return { name: "op-wrapper", status: "failed", error: String(err) };
  }
}

/**
 * Exec-approvals config that pre-allowlists the `op` CLI.
 *
 * Gates `op` behind `ask: on-miss` — the user must approve the first
 * invocation, then subsequent calls are allowed automatically.
 */
function execApprovalsContent(): string {
  const config = {
    version: 1,
    defaults: {
      security: "deny",
      ask: "on-miss",
      askFallback: "deny",
    },
    agents: {
      main: {
        security: "allowlist",
        ask: "on-miss",
        allowlist: [
          {
            pattern: "~/.local/bin/op",
          },
        ],
      },
    },
  };

  return JSON.stringify(config, null, 2);
}

/**
 * Install exec-approvals.json for the 1Password CLI.
 * Conditional — only installs if op is available.
 */
export async function provisionExecApprovals(): Promise<ProvisionResult> {
  try {
    if (!(await isInstalled())) {
      return { name: "exec-approvals", status: "unchanged", detail: "op not installed" };
    }

    const home = process.env.HOME ?? "/root";
    const configDir = `${home}/.openclaw`;
    const path = `${configDir}/exec-approvals.json`;
    const content = execApprovalsContent();

    // Check if already up to date
    try {
      const { readFile } = await import("fs/promises");
      const existing = await readFile(path, "utf-8");
      if (existing === content) {
        log("exec-approvals already configured");
        return { name: "exec-approvals", status: "unchanged" };
      }
    } catch {
      // File doesn't exist — will create
    }

    await mkdir(configDir, { recursive: true });
    await writeFile(path, content);
    log("exec-approvals configured for op");
    return { name: "exec-approvals", status: "installed" };
  } catch (err) {
    return { name: "exec-approvals", status: "failed", error: String(err) };
  }
}
