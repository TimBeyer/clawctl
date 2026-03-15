export const PROJECT_MOUNT_POINT = "/mnt/project";
export const GATEWAY_PORT = 18789;
export const CHECKPOINT_REQUEST_FILE = ".checkpoint-request";
export const CLAW_BIN_PATH = "/usr/local/bin/claw";

/**
 * Ordered lifecycle phases for a VM instance.
 * Each phase implies all previous phases are complete.
 */
export const LIFECYCLE_PHASES = [
  "vm-created",
  "provision-system",
  "provision-tools",
  "provision-openclaw",
  "bootstrap",
] as const;

export type LifecyclePhase = (typeof LIFECYCLE_PHASES)[number];

/** Returns true if `reached` is at or past the `required` phase. */
export function phaseReached(reached: LifecyclePhase, required: LifecyclePhase): boolean {
  return LIFECYCLE_PHASES.indexOf(reached) >= LIFECYCLE_PHASES.indexOf(required);
}
