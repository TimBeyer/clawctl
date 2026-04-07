/**
 * Zod schema derivation from CapabilityConfigDef field definitions.
 *
 * Capabilities declare their config via `configDef` — field definitions
 * that describe type, required, options, etc. This module derives Zod
 * schemas from those definitions so validation works without hand-written
 * Zod code in each capability.
 */

import { z } from "zod";
import type {
  CapabilityConfigDef,
  CapabilityConfigField,
  CapabilityDef,
  ChannelDef,
} from "@clawctl/types";

// ---------------------------------------------------------------------------
// Path resolution utilities
// ---------------------------------------------------------------------------

/** Split a config path into key parts. */
function pathToParts(path: string): string[] {
  if (path.startsWith("/")) {
    // JSON Pointer: "/auth/key" → ["auth", "key"]
    return path.slice(1).split("/");
  }
  // Plain key: "authKey" → ["authKey"]
  return [path];
}

/**
 * Resolve a config path (plain key or JSON Pointer) against an object.
 * - "authKey"     → obj.authKey
 * - "/auth/key"   → obj.auth.key
 */
export function getByPath(obj: Record<string, unknown>, path: string): unknown {
  const parts = pathToParts(path);
  let current: unknown = obj;
  for (const part of parts) {
    if (current == null || typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

/**
 * Set a value at a config path in an object, creating intermediaries.
 * - "authKey"     → obj.authKey = value
 * - "/auth/key"   → obj.auth.key = value (creates obj.auth if needed)
 */
export function setByPath(obj: Record<string, unknown>, path: string, value: unknown): void {
  const parts = pathToParts(path);
  let current = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    if (!(part in current) || typeof current[part] !== "object" || current[part] == null) {
      current[part] = {};
    }
    current = current[part] as Record<string, unknown>;
  }
  current[parts[parts.length - 1]] = value;
}

// ---------------------------------------------------------------------------
// Schema derivation
// ---------------------------------------------------------------------------

/** Derive a Zod schema for a single field. */
function deriveFieldSchema(field: CapabilityConfigField): z.ZodTypeAny {
  let schema: z.ZodTypeAny;

  switch (field.type) {
    case "text":
    case "password": {
      schema = field.required ? z.string().min(1) : z.string();
      break;
    }
    case "toggle": {
      schema = z.boolean();
      break;
    }
    case "select": {
      const values = (field.options ?? []).map((o: { label: string; value: string }) => o.value);
      if (values.length >= 2) {
        schema = z.enum(values as [string, string, ...string[]]);
      } else if (values.length === 1) {
        schema = z.literal(values[0]);
      } else {
        schema = z.string();
      }
      break;
    }
    default:
      schema = z.string();
  }

  if (field.defaultValue != null) {
    schema = schema.default(field.defaultValue);
  }

  if (!field.required) {
    schema = schema.optional();
  }

  return schema;
}

interface SchemaTree {
  [key: string]: z.ZodTypeAny | SchemaTree;
}

/** Recursively convert a tree of schemas/sub-trees into a Zod shape. */
function treeToZodShape(tree: SchemaTree): Record<string, z.ZodTypeAny> {
  const shape: Record<string, z.ZodTypeAny> = {};
  for (const [key, value] of Object.entries(tree)) {
    if (value instanceof z.ZodType) {
      shape[key] = value;
    } else {
      // Sub-tree → nested z.object
      shape[key] = z.object(treeToZodShape(value));
    }
  }
  return shape;
}

/**
 * Derive a Zod object schema from a CapabilityConfigDef's field definitions.
 *
 * Flat fields produce a flat z.object. Nested JSON Pointer paths produce
 * nested z.object structures.
 */
export function deriveConfigSchema(configDef: CapabilityConfigDef): z.ZodTypeAny {
  // Build a tree of schemas from field paths
  const tree: SchemaTree = {};

  for (const field of configDef.fields) {
    const parts = pathToParts(field.path as string);
    const fieldSchema = deriveFieldSchema(field);

    if (parts.length === 1) {
      tree[parts[0]] = fieldSchema;
    } else {
      // Nested: build intermediate objects
      let current: SchemaTree = tree;
      for (let i = 0; i < parts.length - 1; i++) {
        if (!(parts[i] in current) || current[parts[i]] instanceof z.ZodType) {
          current[parts[i]] = {};
        }
        current = current[parts[i]] as SchemaTree;
      }
      current[parts[parts.length - 1]] = fieldSchema;
    }
  }

  // Convert the tree to nested z.object schemas
  const zodShape = treeToZodShape(tree);
  let schema: z.ZodTypeAny = z.object(zodShape);

  if (configDef.refine) {
    const refineFn = configDef.refine;
    schema = (schema as z.ZodTypeAny).refine(
      (val: unknown) => refineFn(val as Record<string, unknown>) === null,
      {
        message: "Cross-field validation failed",
      },
    );
  }

  return schema;
}

/**
 * Build a composed Zod schema for the entire `capabilities` config section.
 *
 * For each capability with a configDef, the schema is derived and keyed by
 * capability name. Each capability value can be either `true` (enabled with
 * defaults) or a config object matching its derived schema.
 * Unknown capability keys are allowed with a permissive schema.
 */
export function buildCapabilitiesSchema(capabilities: CapabilityDef[]): z.ZodTypeAny {
  const knownShapes: Record<string, z.ZodTypeAny> = {};

  for (const cap of capabilities) {
    if (cap.configDef) {
      const objSchema = deriveConfigSchema(cap.configDef);
      // Allow true (enabled with defaults) or a config object
      knownShapes[cap.name] = z.union([z.literal(true), objSchema]).optional();
    }
  }

  if (Object.keys(knownShapes).length === 0) {
    // No capabilities with configDef — use permissive schema
    return z
      .record(z.string(), z.union([z.literal(true), z.record(z.string(), z.unknown())]))
      .optional();
  }

  // Known capabilities get strict validation; unknown keys are allowed permissively
  return z
    .object(knownShapes)
    .catchall(z.union([z.literal(true), z.record(z.string(), z.unknown())]))
    .optional();
}

/**
 * Build a composed Zod schema for the `channels` config section.
 *
 * Known channels get strict validation (derived from ChannelDef fields)
 * with .passthrough() to allow extra fields we don't model. Unknown
 * channel keys are allowed permissively.
 */
export function buildChannelsSchema(channels: ChannelDef[]): z.ZodTypeAny {
  const knownShapes: Record<string, z.ZodTypeAny> = {};

  for (const ch of channels) {
    if (ch.configDef.fields.length > 0) {
      const objSchema = deriveConfigSchema(ch.configDef);
      // .passthrough() allows extra fields beyond the essential ones we model
      const passthrough = objSchema instanceof z.ZodObject ? objSchema.passthrough() : objSchema;
      knownShapes[ch.name] = passthrough.optional();
    } else {
      // Channels with no required fields (e.g., WhatsApp with QR pairing)
      knownShapes[ch.name] = z.record(z.string(), z.unknown()).optional();
    }
  }

  if (Object.keys(knownShapes).length === 0) {
    return z.record(z.string(), z.record(z.string(), z.unknown())).optional();
  }

  return z.object(knownShapes).catchall(z.record(z.string(), z.unknown())).optional();
}

/**
 * Extract secret field paths from a capability's configDef.
 * Returns an array of paths (plain keys or JSON Pointers) marked as secret.
 */
export function getSecretPaths(configDef: CapabilityConfigDef): string[] {
  return configDef.fields.filter((f) => f.secret).map((f) => f.path as string);
}
