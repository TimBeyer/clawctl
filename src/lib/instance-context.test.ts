import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { mkdtemp, rm, writeFile, mkdir } from "fs/promises";
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

  test("reads instance name from .clawctl file", async () => {
    await writeFile(join(dir, ".clawctl"), "myvm\n");
    const result = await readContextFile(dir);
    expect(result).toBe("myvm");
  });

  test("trims whitespace", async () => {
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
    await writeFile(join(root, ".clawctl"), "vm1\n");
    const result = await walkUpForContext(root);
    expect(result).toBe("vm1");
  });

  test("finds .clawctl in parent directory", async () => {
    const child = join(root, "sub", "deep");
    await mkdir(child, { recursive: true });
    await writeFile(join(root, ".clawctl"), "vm2\n");
    const result = await walkUpForContext(child);
    expect(result).toBe("vm2");
  });

  test("returns undefined when no .clawctl found", async () => {
    const child = join(root, "empty");
    await mkdir(child, { recursive: true });
    // Walk up will eventually hit / where there's no .clawctl
    const result = await walkUpForContext(child);
    expect(result).toBeUndefined();
  });

  test("nearest .clawctl wins", async () => {
    const child = join(root, "nested");
    await mkdir(child, { recursive: true });
    await writeFile(join(root, ".clawctl"), "parent-vm\n");
    await writeFile(join(child, ".clawctl"), "child-vm\n");
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

  test("writes .clawctl file", async () => {
    await writeLocalContext("myvm", dir);
    const result = await readContextFile(dir);
    expect(result).toBe("myvm");
  });
});

describe("writeGlobalContext / readGlobalContext", () => {
  let configDir: string;
  let originalHome: string | undefined;

  beforeEach(async () => {
    configDir = await mkdtemp(join(tmpdir(), "clawctl-global-"));
    originalHome = process.env.HOME;
    // Point HOME to temp dir so global context goes there
    process.env.HOME = configDir;
  });

  afterEach(async () => {
    if (originalHome !== undefined) {
      process.env.HOME = originalHome;
    }
    await rm(configDir, { recursive: true, force: true });
  });

  // Note: writeGlobalContext/readGlobalContext use homedir() which is cached
  // at process start, so we can't easily test them with HOME override.
  // These are tested indirectly via resolveInstance integration.
});

describe("resolveInstance", () => {
  let originalEnv: string | undefined;

  beforeEach(() => {
    originalEnv = process.env.CLAWCTL_INSTANCE;
    delete process.env.CLAWCTL_INSTANCE;
  });

  afterEach(() => {
    if (originalEnv !== undefined) {
      process.env.CLAWCTL_INSTANCE = originalEnv;
    } else {
      delete process.env.CLAWCTL_INSTANCE;
    }
  });

  test("flag takes priority", async () => {
    process.env.CLAWCTL_INSTANCE = "env-vm";
    const result = await resolveInstance("flag-vm");
    expect(result.name).toBe("flag-vm");
    expect(result.source).toBe("flag");
  });

  test("env var is used when no flag", async () => {
    process.env.CLAWCTL_INSTANCE = "env-vm";
    const result = await resolveInstance();
    expect(result.name).toBe("env-vm");
    expect(result.source).toBe("env");
  });

  test("throws when nothing found", async () => {
    // No flag, no env, cwd won't have .clawctl, no global context
    expect(resolveInstance()).rejects.toThrow("No instance specified");
  });
});
