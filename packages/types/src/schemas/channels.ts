/**
 * Zod schemas for the channels and openclaw config sections.
 */
import { z } from "zod";

/**
 * Base schema for the channels config section.
 *
 * Each channel is a record of string keys to unknown values.
 * Strict per-channel validation is applied separately via
 * buildChannelsSchema() in host-core/schema-derive.ts.
 */
export const channelsSchema = z.record(z.string(), z.record(z.string(), z.unknown())).optional();

/**
 * Schema for the openclaw passthrough config section.
 *
 * Accepts arbitrary dotpath-to-value mappings that are applied via
 * `openclaw config set` during bootstrap. No host-side validation —
 * OpenClaw validates at daemon restart.
 */
export const openclawSchema = z.record(z.string(), z.unknown()).optional();
