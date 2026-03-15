import type { VMDriver, OnLine } from "./drivers/types.js";
import { findSecretRefs, setNestedValue } from "@clawctl/types";

// Re-export pure functions for convenience
export type { SecretRef, ResolvedSecretRef } from "@clawctl/types";
export { findSecretRefs, hasOpRefs, resolveEnvRefs, getNestedValue, setNestedValue } from "@clawctl/types";

/**
 * Resolve op:// references by calling `op read` in the VM via shellExec.
 * OP_SERVICE_ACCOUNT_TOKEN must already be in the VM environment (step 5).
 * Returns a deep-cloned config with op:// values replaced.
 */
export async function resolveOpRefs(
  driver: VMDriver,
  vmName: string,
  obj: Record<string, unknown>,
  onLine?: OnLine,
): Promise<Record<string, unknown>> {
  const clone = structuredClone(obj);
  const refs = findSecretRefs(clone).filter((r) => r.scheme === "op");
  if (refs.length === 0) return clone;

  onLine?.(`Resolving ${refs.length} op:// reference${refs.length > 1 ? "s" : ""}...`);

  const results = await Promise.all(
    refs.map(async (ref) => {
      const result = await driver.exec(vmName, `op read "${ref.reference}"`);
      if (result.exitCode !== 0) {
        throw new Error(
          `Failed to resolve '${ref.path.join(".")}' (${ref.reference}): ${result.stderr.trim()}`,
        );
      }
      return { ref, value: result.stdout.trim() };
    }),
  );

  for (const { ref, value } of results) {
    setNestedValue(clone, ref.path, value);
  }
  return clone;
}
