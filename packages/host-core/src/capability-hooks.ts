/**
 * Host-side setup hooks for capabilities.
 *
 * Unlike CapabilityDef hooks (which run inside the VM via claw), these run
 * on the host after VM provisioning. They handle things like token validation,
 * authentication flows, and service connections that require host-side access.
 *
 * Each hook is registered by capability name. The headless pipeline iterates
 * over enabled capabilities and runs their host hooks in registration order.
 */

import type { HostSetupResult } from "@clawctl/types";
import type { VMDriver } from "./drivers/types.js";
import { setupOnePassword, setupTailscale } from "./credentials.js";
import type { InstanceConfig } from "@clawctl/types";

export interface HostCapabilityHook {
  /** Capability name this hook belongs to. */
  capabilityName: string;
  /** Stage name for the headless progress UI. */
  stageName: string;
  /** Human-readable label shown during provisioning. */
  stageLabel: string;
  /** The setup function. */
  run: (
    config: Record<string, unknown>,
    driver: VMDriver,
    vmName: string,
    onLine?: (message: string) => void,
  ) => Promise<HostSetupResult>;
}

/** Registry of host-side capability setup hooks. */
const HOST_HOOKS: HostCapabilityHook[] = [
  {
    capabilityName: "one-password",
    stageName: "onepassword",
    stageLabel: "Setting up 1Password",
    run: async (config, driver, vmName, onLine) => {
      const token = config.serviceAccountToken as string | undefined;
      if (!token) {
        return { success: false, error: "No service account token provided" };
      }
      const result = await setupOnePassword(driver, vmName, token, onLine);
      if (result.valid) {
        return { success: true, detail: `Token validated (${result.account})` };
      }
      return { success: false, error: result.error };
    },
  },
  {
    capabilityName: "tailscale",
    stageName: "tailscale",
    stageLabel: "Connecting to Tailscale",
    run: async (config, driver, vmName, onLine) => {
      const authKey = config.authKey as string | undefined;
      if (!authKey) {
        return { success: false, error: "No auth key provided" };
      }
      const result = await setupTailscale(driver, vmName, authKey, onLine);
      if (result.connected) {
        return { success: true, detail: `Connected as ${result.hostname}` };
      }
      return { success: false, error: result.error };
    },
  },
];

/**
 * Get host hooks for capabilities that are enabled in the config.
 * Returns hooks in registration order, filtered to enabled capabilities.
 */
export function getHostHooksForConfig(config: InstanceConfig): HostCapabilityHook[] {
  const caps = config.capabilities ?? {};
  return HOST_HOOKS.filter((hook) => hook.capabilityName in caps);
}

/**
 * Get the capability-specific config for a host hook from the InstanceConfig.
 */
export function getCapabilityConfig(
  config: InstanceConfig,
  capabilityName: string,
): Record<string, unknown> {
  const capConfig = config.capabilities?.[capabilityName];
  if (typeof capConfig === "object") return capConfig;
  return {};
}
