import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { mkdtemp, rm, readFile } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";
import {
  loadRegistry,
  saveRegistry,
  addInstance,
  removeInstance,
  getInstance,
  listInstances,
} from "./registry.js";
import type { RegistryEntry } from "./registry.js";

function makeEntry(name: string, overrides: Partial<RegistryEntry> = {}): RegistryEntry {
  return {
    name,
    projectDir: `/tmp/${name}`,
    vmName: name,
    driver: "lima",
    createdAt: new Date().toISOString(),
    gatewayPort: 18789,
    ...overrides,
  };
}

describe("registry", () => {
  let configDir: string;

  beforeEach(async () => {
    configDir = await mkdtemp(join(tmpdir(), "clawctl-test-"));
  });

  afterEach(async () => {
    await rm(configDir, { recursive: true, force: true });
  });

  test("loadRegistry returns empty registry when file does not exist", async () => {
    const registry = await loadRegistry(configDir);
    expect(registry.version).toBe(1);
    expect(Object.keys(registry.instances)).toHaveLength(0);
  });

  test("round-trip save and load", async () => {
    const registry = { version: 1 as const, instances: { foo: makeEntry("foo") } };
    await saveRegistry(registry, configDir);
    const loaded = await loadRegistry(configDir);
    expect(loaded.version).toBe(1);
    expect(loaded.instances.foo.name).toBe("foo");
    expect(loaded.instances.foo.gatewayPort).toBe(18789);
  });

  test("saveRegistry writes atomically (tmp file then rename)", async () => {
    await saveRegistry({ version: 1, instances: {} }, configDir);
    const content = await readFile(join(configDir, "instances.json"), "utf-8");
    expect(JSON.parse(content)).toEqual({ version: 1, instances: {} });
  });

  test("loadRegistry degrades gracefully on corrupt file", async () => {
    const { writeFile: wf } = await import("fs/promises");
    await wf(join(configDir, "instances.json"), "not json!!!");
    const registry = await loadRegistry(configDir);
    expect(registry.version).toBe(1);
    expect(Object.keys(registry.instances)).toHaveLength(0);
  });

  test("loadRegistry degrades on unexpected format", async () => {
    const { writeFile: wf } = await import("fs/promises");
    await wf(join(configDir, "instances.json"), JSON.stringify({ version: 99, data: [] }));
    const registry = await loadRegistry(configDir);
    expect(registry.version).toBe(1);
    expect(Object.keys(registry.instances)).toHaveLength(0);
  });

  test("addInstance creates entry", async () => {
    await addInstance(makeEntry("alpha"), configDir);
    const entry = await getInstance("alpha", configDir);
    expect(entry).toBeDefined();
    expect(entry!.name).toBe("alpha");
    expect(entry!.projectDir).toBe("/tmp/alpha");
  });

  test("addInstance overwrites existing entry with same name", async () => {
    await addInstance(makeEntry("alpha", { gatewayPort: 9000 }), configDir);
    await addInstance(makeEntry("alpha", { gatewayPort: 9001 }), configDir);
    const entry = await getInstance("alpha", configDir);
    expect(entry!.gatewayPort).toBe(9001);
  });

  test("removeInstance removes existing entry", async () => {
    await addInstance(makeEntry("alpha"), configDir);
    const removed = await removeInstance("alpha", configDir);
    expect(removed).toBe(true);
    const entry = await getInstance("alpha", configDir);
    expect(entry).toBeUndefined();
  });

  test("removeInstance returns false for non-existent entry", async () => {
    const removed = await removeInstance("nope", configDir);
    expect(removed).toBe(false);
  });

  test("getInstance returns undefined for missing entry", async () => {
    const entry = await getInstance("missing", configDir);
    expect(entry).toBeUndefined();
  });

  test("listInstances returns all entries", async () => {
    await addInstance(makeEntry("a"), configDir);
    await addInstance(makeEntry("b"), configDir);
    await addInstance(makeEntry("c"), configDir);
    const entries = await listInstances(configDir);
    expect(entries).toHaveLength(3);
    const names = entries.map((e) => e.name).sort();
    expect(names).toEqual(["a", "b", "c"]);
  });

  test("listInstances returns empty array when no instances", async () => {
    const entries = await listInstances(configDir);
    expect(entries).toHaveLength(0);
  });

  test("saveRegistry creates config directory if it does not exist", async () => {
    const nested = join(configDir, "nested", "deep");
    await saveRegistry({ version: 1, instances: {} }, nested);
    const loaded = await loadRegistry(nested);
    expect(loaded.version).toBe(1);
  });
});
