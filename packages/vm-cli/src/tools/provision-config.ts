import { readFile } from "fs/promises";
import { join } from "path";
import { PROJECT_MOUNT_POINT, PROVISION_CONFIG_FILE } from "@clawctl/types";
import type { ProvisionConfig } from "@clawctl/types";

const CONFIG_PATH = join(PROJECT_MOUNT_POINT, "data", PROVISION_CONFIG_FILE);

const DEFAULTS: ProvisionConfig = { capabilities: {} };

/** Read the provision config written by the host. Translates old boolean flags. */
export async function readProvisionConfig(): Promise<ProvisionConfig> {
  try {
    const raw = await readFile(CONFIG_PATH, "utf-8");
    const parsed = JSON.parse(raw);

    // Backwards compat: translate old boolean flags to capabilities map
    if (!parsed.capabilities) {
      parsed.capabilities = {};
      if (parsed.onePassword) parsed.capabilities["one-password"] = true;
      if (parsed.tailscale) parsed.capabilities["tailscale"] = true;
    }

    return { ...DEFAULTS, ...parsed };
  } catch {
    return DEFAULTS;
  }
}
