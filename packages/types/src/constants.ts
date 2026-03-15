export const PROJECT_MOUNT_POINT = "/mnt/project";
export const GATEWAY_PORT = 18789;
export const CHECKPOINT_REQUEST_FILE = ".checkpoint-request";
export const CLAW_BIN_PATH = "/usr/local/bin/claw";

/**
 * Ordered lifecycle phases for a VM instance.
 * Each phase implies all previous phases are complete.
 *
 * Used by:
 * - Provision stages (ProvisionStage.phase) to declare which phase they fulfill.
 * - Doctor checks (DoctorCheck.availableAfter) to declare when they're expected
 *   to pass. `claw doctor --after <phase>` computes whether a failing check is
 *   a warning (phase not yet reached) or an error (should have passed by now).
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
