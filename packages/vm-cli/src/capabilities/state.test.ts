import { describe, it, expect } from "bun:test";
import type { CapabilityState, CapabilityDef, CapabilityMigration } from "@clawctl/types";
import { needsMigration, findMigrationPath } from "./state.js";

function makeState(installed: Record<string, string> = {}): CapabilityState {
  const state: CapabilityState = { installed: {} };
  for (const [name, version] of Object.entries(installed)) {
    state.installed[name] = { version, installedAt: "2026-01-01T00:00:00Z" };
  }
  return state;
}

function makeCap(name: string, version: string, migrations?: CapabilityMigration[]): CapabilityDef {
  return {
    name,
    label: name,
    version,
    core: true,
    hooks: {},
    migrations,
  };
}

describe("state", () => {
  describe("needsMigration", () => {
    it("returns false when capability not installed", () => {
      const cap = makeCap("foo", "1.0.0");
      expect(needsMigration(makeState(), cap)).toBe(false);
    });

    it("returns false when version matches", () => {
      const cap = makeCap("foo", "1.0.0");
      expect(needsMigration(makeState({ foo: "1.0.0" }), cap)).toBe(false);
    });

    it("returns true when version differs", () => {
      const cap = makeCap("foo", "2.0.0");
      expect(needsMigration(makeState({ foo: "1.0.0" }), cap)).toBe(true);
    });
  });

  describe("findMigrationPath", () => {
    const noop = async () => ({ name: "test", status: "unchanged" as const });

    it("returns empty array when not installed", () => {
      const cap = makeCap("foo", "2.0.0", [{ from: "1.0.0", to: "2.0.0", run: noop }]);
      expect(findMigrationPath(cap, makeState())).toEqual([]);
    });

    it("returns empty array when no migrations declared", () => {
      const cap = makeCap("foo", "2.0.0");
      expect(findMigrationPath(cap, makeState({ foo: "1.0.0" }))).toEqual([]);
    });

    it("finds single-step migration", () => {
      const m: CapabilityMigration = { from: "1.0.0", to: "2.0.0", run: noop };
      const cap = makeCap("foo", "2.0.0", [m]);
      const path = findMigrationPath(cap, makeState({ foo: "1.0.0" }));
      expect(path).toEqual([m]);
    });

    it("finds multi-step migration chain", () => {
      const m1: CapabilityMigration = { from: "1.0.0", to: "1.1.0", run: noop };
      const m2: CapabilityMigration = { from: "1.1.0", to: "2.0.0", run: noop };
      const cap = makeCap("foo", "2.0.0", [m1, m2]);
      const path = findMigrationPath(cap, makeState({ foo: "1.0.0" }));
      expect(path).toEqual([m1, m2]);
    });

    it("returns empty array when chain has gap", () => {
      const m1: CapabilityMigration = { from: "1.0.0", to: "1.1.0", run: noop };
      // Missing migration from 1.1.0 to 2.0.0
      const cap = makeCap("foo", "2.0.0", [m1]);
      const path = findMigrationPath(cap, makeState({ foo: "1.0.0" }));
      expect(path).toEqual([]);
    });

    it("returns empty array when installed version has no migration", () => {
      const m: CapabilityMigration = { from: "1.5.0", to: "2.0.0", run: noop };
      const cap = makeCap("foo", "2.0.0", [m]);
      // Installed 1.0.0 but only migration is from 1.5.0
      const path = findMigrationPath(cap, makeState({ foo: "1.0.0" }));
      expect(path).toEqual([]);
    });

    it("returns empty array when already at target version", () => {
      const m: CapabilityMigration = { from: "1.0.0", to: "2.0.0", run: noop };
      const cap = makeCap("foo", "2.0.0", [m]);
      const path = findMigrationPath(cap, makeState({ foo: "2.0.0" }));
      expect(path).toEqual([]);
    });
  });
});
