import { readFile } from "fs/promises";
import { join } from "path";
import { PROJECT_MOUNT_POINT, PROVISION_CONFIG_FILE } from "@clawctl/types";
import type { ProvisionConfig } from "@clawctl/types";

const CONFIG_PATH = join(PROJECT_MOUNT_POINT, "data", PROVISION_CONFIG_FILE);

const DEFAULTS: ProvisionConfig = { capabilities: {} };

/** Read the provision config written by the host. */
export async function readProvisionConfig(): Promise<ProvisionConfig> {
  try {
    const raw = await readFile(CONFIG_PATH, "utf-8");
    const parsed = JSON.parse(raw);
    return { ...DEFAULTS, ...parsed };
  } catch {
    return DEFAULTS;
  }
}
