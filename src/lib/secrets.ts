/**
 * Secret reference detection and resolution.
 *
 * Supports two URI schemes:
 * - `env://VAR_NAME` — resolved from the host process.env at config-load time
 * - `op://vault/item/field` — resolved in the VM via `op read` after 1Password setup
 */
import type { VMDriver, OnLine } from "../drivers/types.js";

const OP_REF = /^op:\/\/.+\/.+\/.+$/;
const ENV_REF = /^env:\/\/([A-Za-z_][A-Za-z0-9_]*)$/;

export interface SecretRef {
  path: string[];
  reference: string;
  scheme: "op" | "env";
}

/** A SecretRef paired with its resolved plaintext value. */
export interface ResolvedSecretRef extends SecretRef {
  resolvedValue: string;
}

/** Recursively find all secret references in a config object. */
export function findSecretRefs(obj: Record<string, unknown>, prefix: string[] = []): SecretRef[] {
  const refs: SecretRef[] = [];
  for (const [key, value] of Object.entries(obj)) {
    const path = [...prefix, key];
    if (typeof value === "string") {
      if (OP_REF.test(value)) {
        refs.push({ path, reference: value, scheme: "op" });
      } else if (ENV_REF.test(value)) {
        refs.push({ path, reference: value, scheme: "env" });
      }
    } else if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      refs.push(...findSecretRefs(value as Record<string, unknown>, path));
    }
  }
  return refs;
}

/** Does this config have any unresolved op:// references? */
export function hasOpRefs(obj: Record<string, unknown>): boolean {
  return findSecretRefs(obj).some((r) => r.scheme === "op");
}

/**
 * Resolve env:// references from host process.env (synchronous).
 * Returns a deep-cloned config with env:// values replaced.
 * Throws if a referenced env var is not set or empty.
 */
export function resolveEnvRefs(obj: Record<string, unknown>): Record<string, unknown> {
  const clone = structuredClone(obj);
  const refs = findSecretRefs(clone).filter((r) => r.scheme === "env");
  for (const ref of refs) {
    const match = ENV_REF.exec(ref.reference);
    if (!match) continue;
    const varName = match[1];
    const value = process.env[varName];
    if (!value) {
      throw new Error(
        `env://${varName} referenced at '${ref.path.join(".")}' but ${varName} is not set or empty`,
      );
    }
    setNestedValue(clone, ref.path, value);
  }
  return clone;
}

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

/** Get a value at a nested path in an object. */
export function getNestedValue(obj: Record<string, unknown>, path: string[]): unknown {
  let current: unknown = obj;
  for (const key of path) {
    if (typeof current !== "object" || current === null) return undefined;
    current = (current as Record<string, unknown>)[key];
  }
  return current;
}

/** Set a value at a nested path in an object. */
function setNestedValue(obj: Record<string, unknown>, path: string[], value: unknown): void {
  let current: Record<string, unknown> = obj;
  for (let i = 0; i < path.length - 1; i++) {
    current = current[path[i]] as Record<string, unknown>;
  }
  current[path[path.length - 1]] = value;
}
