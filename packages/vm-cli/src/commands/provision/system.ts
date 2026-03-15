import * as apt from "../../tools/apt.js";
import * as node from "../../tools/node.js";
import * as systemd from "../../tools/systemd.js";
import * as tailscale from "../../tools/tailscale.js";
import { readProvisionConfig } from "../../tools/provision-config.js";
import type { ProvisionResult } from "../../tools/types.js";
import type { ProvisionStage } from "./stages.js";

const APT_PACKAGES = ["build-essential", "git", "curl", "unzip", "jq", "ca-certificates", "gnupg"];

async function provisionTailscale(): Promise<ProvisionResult> {
  const config = await readProvisionConfig();
  if (!config.tailscale) {
    return {
      name: "tailscale",
      status: "unchanged",
      detail: "tailscale disabled in provision config",
    };
  }
  return tailscale.provision();
}

export const systemStage: ProvisionStage = {
  name: "system",
  phase: "provision-system",
  steps: [
    { name: "apt-packages", label: "APT packages", run: () => apt.ensure(APT_PACKAGES) },
    { name: "nodejs", label: "Node.js", run: () => node.provision() },
    { name: "systemd-linger", label: "systemd linger", run: () => systemd.provisionLinger() },
    { name: "tailscale", label: "Tailscale", run: provisionTailscale },
  ],
};
