import { exec, commandExists } from "../exec.js";
import { log } from "../output.js";
import { downloadFile } from "./curl.js";
import { ensureDir } from "./fs.js";
import { chmod, rename, rm } from "fs/promises";
import type { ProvisionResult } from "./types.js";

const OP_VERSION = "2.30.0";
const OP_DOWNLOAD_URL = (version: string) =>
  `https://cache.agilebits.com/dist/1P/op2/pkg/v${version}/op_linux_arm64_v${version}.zip`;

/** Check if 1Password CLI is installed. */
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
