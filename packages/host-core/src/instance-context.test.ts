import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { mkdtemp, rm, writeFile, mkdir, readFile } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";
import {
  readContextFile,
  walkUpForContext,
  writeLocalContext,
  resolveInstance,
} from "./instance-context.js";

describe("readContextFile", () => {
  let dir: string;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), "clawctl-ctx-"));
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  test("reads JSON context file", async () => {
    await writeFile(join(dir, ".clawctl"), JSON.stringify({ instance: "myvm" }));
    const result = await readContextFile(dir);
    expect(result).toBe("myvm");
  });

  test("reads JSON context file with extra fields", async () => {
    await writeFile(join(dir, ".clawctl"), JSON.stringify({ instance: "myvm", other: "stuff" }));
    const result = await readContextFile(dir);
    expect(result).toBe("myvm");
  });

  test("reads legacy plain-text format", async () => {
    await writeFile(join(dir, ".clawctl"), "myvm\n");
    const result = await readContextFile(dir);
    expect(result).toBe("myvm");
  });

  test("trims whitespace in legacy format", async () => {
    await writeFile(join(dir, ".clawctl"), "  myvm  \n");
    const result = await readContextFile(dir);
    expect(result).toBe("myvm");
  });

  test("returns undefined when file does not exist", async () => {
    const result = await readContextFile(dir);
    expect(result).toBeUndefined();
  });

  test("returns undefined for empty file", async () => {
    await writeFile(join(dir, ".clawctl"), "");
    const result = await readContextFile(dir);
    expect(result).toBeUndefined();
  });

  test("returns undefined for JSON with missing instance field", async () => {
    await writeFile(join(dir, ".clawctl"), JSON.stringify({ other: "stuff" }));
    const result = await readContextFile(dir);
    expect(result).toBeUndefined();
  });

  test("returns undefined for invalid JSON starting with {", async () => {
    await writeFile(join(dir, ".clawctl"), "{ broken json");
    const result = await readContextFile(dir);
    expect(result).toBeUndefined();
  });
});

describe("walkUpForContext", () => {
  let root: string;

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), "clawctl-walk-"));
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  test("finds .clawctl in start directory", async () => {
    await writeFile(join(root, ".clawctl"), JSON.stringify({ instance: "vm1" }));
    const result = await walkUpForContext(root);
    expect(result).toBe("vm1");
  });

  test("finds .clawctl in parent directory", async () => {
    const child = join(root, "sub", "deep");
    await mkdir(child, { recursive: true });
    await writeFile(join(root, ".clawctl"), JSON.stringify({ instance: "vm2" }));
    const result = await walkUpForContext(child);
    expect(result).toBe("vm2");
  });

  test("returns undefined when no .clawctl found", async () => {
    const child = join(root, "empty");
    await mkdir(child, { recursive: true });
    const result = await walkUpForContext(child);
    expect(result).toBeUndefined();
  });

  test("nearest .clawctl wins", async () => {
    const child = join(root, "nested");
    await mkdir(child, { recursive: true });
    await writeFile(join(root, ".clawctl"), JSON.stringify({ instance: "parent-vm" }));
    await writeFile(join(child, ".clawctl"), JSON.stringify({ instance: "child-vm" }));
    const result = await walkUpForContext(child);
    expect(result).toBe("child-vm");
  });
});

describe("writeLocalContext", () => {
  let dir: string;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), "clawctl-write-"));
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  test("writes JSON .clawctl file", async () => {
    await writeLocalContext("myvm", dir);
    const raw = await readFile(join(dir, ".clawctl"), "utf-8");
    const parsed = JSON.parse(raw);
    expect(parsed).toEqual({ instance: "myvm" });
  });

  test("round-trips through readContextFile", async () => {
    await writeLocalContext("myvm", dir);
    const result = await readContextFile(dir);
    expect(result).toBe("myvm");
  });
});

describe("resolveInstance", () => {
  let originalEnv: string | undefined;
  let emptyDir: string;

  beforeEach(async () => {
    originalEnv = process.env.CLAWCTL_INSTANCE;
    delete process.env.CLAWCTL_INSTANCE;
    emptyDir = await mkdtemp(join(tmpdir(), "clawctl-resolve-"));
  });

  afterEach(async () => {
    if (originalEnv !== undefined) {
      process.env.CLAWCTL_INSTANCE = originalEnv;
    } else {
      delete process.env.CLAWCTL_INSTANCE;
    }
    await rm(emptyDir, { recursive: true, force: true });
  });

  test("flag takes priority", async () => {
    process.env.CLAWCTL_INSTANCE = "env-vm";
    const result = await resolveInstance("flag-vm", emptyDir);
    expect(result.name).toBe("flag-vm");
    expect(result.source).toBe("flag");
  });

  test("env var is used when no flag", async () => {
    process.env.CLAWCTL_INSTANCE = "env-vm";
    const result = await resolveInstance(undefined, emptyDir);
    expect(result.name).toBe("env-vm");
    expect(result.source).toBe("env");
  });

  test("local .clawctl file is used when no flag or env", async () => {
    await writeFile(join(emptyDir, ".clawctl"), JSON.stringify({ instance: "local-vm" }));
    const result = await resolveInstance(undefined, emptyDir);
    expect(result.name).toBe("local-vm");
    expect(result.source).toBe("local");
  });

  test("throws when nothing found", async () => {
    // emptyDir under /tmp has no .clawctl anywhere in its parent chain
    expect(resolveInstance(undefined, emptyDir)).rejects.toThrow("No instance specified");
  });
});
