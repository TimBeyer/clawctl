import * as homebrew from "../../tools/homebrew.js";
import * as opCli from "../../tools/op-cli.js";
import { ensurePath } from "../../tools/shell-profile.js";
import { log } from "../../output.js";
import type { ProvisionResult } from "../../tools/types.js";
import type { ProvisionStage } from "./stages.js";

async function provisionShellProfile(): Promise<ProvisionResult> {
  try {
    await ensurePath("$HOME/.local/bin");
    log("      Shell profile configured");
    return { name: "shell-profile", status: "installed" };
  } catch (err) {
    return { name: "shell-profile", status: "failed", error: String(err) };
  }
}

export const toolsStage: ProvisionStage = {
  name: "tools",
  phase: "provision-tools",
  steps: [
    { name: "homebrew", label: "Homebrew", run: () => homebrew.provision() },
    { name: "op-cli", label: "1Password CLI", run: () => opCli.provision() },
    { name: "shell-profile", label: "Shell profile", run: provisionShellProfile },
  ],
};
