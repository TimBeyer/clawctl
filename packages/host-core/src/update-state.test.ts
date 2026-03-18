import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { mkdtemp, rm, readFile } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";
import { loadUpdateState, saveUpdateState, isCheckStale } from "./update-state.js";
import type { UpdateState } from "./update-state.js";

describe("update-state", () => {
  let configDir: string;

  beforeEach(async () => {
    configDir = await mkdtemp(join(tmpdir(), "clawctl-test-"));
  });

  afterEach(async () => {
    await rm(configDir, { recursive: true, force: true });
  });

  test("loadUpdateState returns empty object when file does not exist", async () => {
    const state = await loadUpdateState(configDir);
    expect(state).toEqual({});
  });

  test("round-trip save and load", async () => {
    const state: UpdateState = {
      lastCheckAt: "2026-03-18T12:00:00.000Z",
      latestVersion: "0.15.0",
      latestReleaseUrl: "https://example.com/release",
      dismissedVersion: "0.14.0",
    };
    await saveUpdateState(state, configDir);
    const loaded = await loadUpdateState(configDir);
    expect(loaded).toEqual(state);
  });

  test("saveUpdateState creates config dir if missing", async () => {
    const nested = join(configDir, "sub", "dir");
    await saveUpdateState({ latestVersion: "1.0.0" }, nested);
    const loaded = await loadUpdateState(nested);
    expect(loaded.latestVersion).toBe("1.0.0");
  });

  test("saveUpdateState writes valid JSON", async () => {
    await saveUpdateState({ latestVersion: "1.0.0" }, configDir);
    const raw = await readFile(join(configDir, "update-state.json"), "utf-8");
    const parsed = JSON.parse(raw);
    expect(parsed.latestVersion).toBe("1.0.0");
  });

  describe("isCheckStale", () => {
    test("returns true when lastCheckAt is missing", () => {
      expect(isCheckStale({})).toBe(true);
    });

    test("returns true when lastCheckAt is older than 4 hours", () => {
      const fiveHoursAgo = new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString();
      expect(isCheckStale({ lastCheckAt: fiveHoursAgo })).toBe(true);
    });

    test("returns false when lastCheckAt is within 4 hours", () => {
      const oneHourAgo = new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString();
      expect(isCheckStale({ lastCheckAt: oneHourAgo })).toBe(false);
    });

    test("returns false when lastCheckAt is just now", () => {
      expect(isCheckStale({ lastCheckAt: new Date().toISOString() })).toBe(false);
    });
  });
});
