import { readFile } from "fs/promises";
import { join } from "path";
import { PROJECT_MOUNT_POINT, PROVISION_CONFIG_FILE } from "@clawctl/types";
import type { ProvisionConfig } from "@clawctl/types";

const CONFIG_PATH = join(PROJECT_MOUNT_POINT, "data", PROVISION_CONFIG_FILE);

const DEFAULTS: ProvisionConfig = { onePassword: false, tailscale: false };

/** Read the provision config written by the host. Defaults to false if missing/malformed. */
export async function readProvisionConfig(): Promise<ProvisionConfig> {
  try {
    const raw = await readFile(CONFIG_PATH, "utf-8");
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    return DEFAULTS;
  }
}
