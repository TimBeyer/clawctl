import { describe, test, expect } from "bun:test";
import { execa } from "execa";
import YAML from "yaml";
import {
  generateLimaYaml,
  generateSecretManagementSkill,
  generateOpWrapperScript,
  generateExecApprovals,
  generateBootstrapPrompt,
} from "./index.js";
import type { VMConfig } from "@clawctl/types";

// -- Helpers ------------------------------------------------------------------

/** Run `bash -n` on a script string to validate syntax. */
async function expectValidBashSyntax(script: string) {
  const result = await execa("bash", ["-n"], { input: script, reject: false });
  if (result.exitCode !== 0) {
    throw new Error(`bash -n failed:\n${result.stderr}`);
  }
}

// -- Lima YAML generator ------------------------------------------------------

/** Parse the YAML body from generateLimaYaml output (skips the comment header). */
function parseLimaYaml(raw: string): Record<string, unknown> {
  return YAML.parse(raw) as Record<string, unknown>;
}

describe("generateLimaYaml", () => {
  const config: VMConfig = {
    projectDir: "/Users/test/my-project",
    vmName: "test-vm",
    cpus: 4,
    memory: "8GiB",
    disk: "50GiB",
  };

  const raw = generateLimaYaml(config);
  const doc = parseLimaYaml(raw);

  test("includes VM name in header comment", () => {
    expect(raw).toContain("# VM: test-vm");
  });

  test("sets cpus", () => {
    expect(doc.cpus).toBe(4);
  });

  test("sets memory", () => {
    expect(doc.memory).toBe("8GiB");
  });

  test("sets disk", () => {
    expect(doc.disk).toBe("50GiB");
  });

  test("sets vmType to vz", () => {
    expect(doc.vmType).toBe("vz");
  });

  test("sets arch to aarch64", () => {
    expect(doc.arch).toBe("aarch64");
  });

  test("sets mountType to virtiofs", () => {
    expect(doc.mountType).toBe("virtiofs");
  });

  test("includes project mounts with correct paths", () => {
    const mounts = doc.mounts as Array<Record<string, unknown>>;
    expect(mounts[0].location).toBe("/Users/test/my-project");
    expect(mounts[0].mountPoint).toBe("/mnt/project");
    expect(mounts[1].location).toBe("/Users/test/my-project/data");
    expect(mounts[1].mountPoint).toBe("/mnt/project/data");
  });

  test("project mount is read-only, data mount is writable", () => {
    const mounts = doc.mounts as Array<Record<string, unknown>>;
    expect(mounts[0].writable).toBe(false);
    expect(mounts[1].writable).toBe(true);
  });

  test("does not include home directory mount by default", () => {
    const mounts = doc.mounts as Array<Record<string, unknown>>;
    expect(mounts.length).toBe(2);
    expect(mounts.every((m) => m.location !== "~")).toBe(true);
  });

  test("includes port forwarding by default", () => {
    const forwards = doc.portForwards as Array<Record<string, unknown>>;
    expect(forwards[0].guestPort).toBe(18789);
    expect(forwards[0].hostPort).toBe(18789);
  });

  test("generates SKILL.md with frontmatter and expected content", () => {
    const skill = generateSecretManagementSkill();
    expect(skill).toStartWith("---\nname: secret-management");
    expect(skill).toContain("description: Manage credentials");
    expect(skill).toContain("compatibility:");
    expect(skill).toContain("1Password Service Account");
    expect(skill).toContain("op read");
    expect(skill).toContain("op vault list");
    expect(skill).toContain("op run");
    expect(skill).toContain("Never expose secrets");
    expect(skill).toContain("supersedes the built-in 1password skill");
    expect(skill).toContain("Exec approval");
  });

  test("omits port forwards when forwardGateway is false", () => {
    const noPortDoc = parseLimaYaml(generateLimaYaml(config, { forwardGateway: false }));
    expect(noPortDoc.portForwards).toBeUndefined();
  });

  test("uses custom host port with default guest port", () => {
    const customDoc = parseLimaYaml(generateLimaYaml(config, { gatewayPort: 9000 }));
    const forwards = customDoc.portForwards as Array<Record<string, unknown>>;
    expect(forwards[0].guestPort).toBe(18789);
    expect(forwards[0].hostPort).toBe(9000);
  });

  test("guest port stays 18789 regardless of custom host port", () => {
    const customDoc = parseLimaYaml(generateLimaYaml(config, { gatewayPort: 28789 }));
    const forwards = customDoc.portForwards as Array<Record<string, unknown>>;
    expect(forwards[0].guestPort).toBe(18789);
    expect(forwards[0].hostPort).toBe(28789);
  });
});

// -- Extra mounts in Lima YAML ------------------------------------------------

describe("generateLimaYaml extra mounts", () => {
  const config: VMConfig = {
    projectDir: "/Users/test/my-project",
    vmName: "test-vm",
    cpus: 4,
    memory: "8GiB",
    disk: "50GiB",
  };

  test("includes extra mounts", () => {
    const doc = parseLimaYaml(
      generateLimaYaml(config, {
        extraMounts: [{ location: "~", mountPoint: "/mnt/host" }],
      }),
    );
    const mounts = doc.mounts as Array<Record<string, unknown>>;
    expect(mounts[2].location).toBe("~");
    expect(mounts[2].mountPoint).toBe("/mnt/host");
    expect(mounts[2].writable).toBe(false);
  });

  test("supports multiple extra mounts", () => {
    const doc = parseLimaYaml(
      generateLimaYaml(config, {
        extraMounts: [
          { location: "~", mountPoint: "/mnt/host" },
          { location: "/opt/data", mountPoint: "/mnt/data", writable: true },
        ],
      }),
    );
    const mounts = doc.mounts as Array<Record<string, unknown>>;
    expect(mounts.length).toBe(4);
    expect(mounts[2].location).toBe("~");
    expect(mounts[2].mountPoint).toBe("/mnt/host");
    expect(mounts[3].location).toBe("/opt/data");
    expect(mounts[3].mountPoint).toBe("/mnt/data");
  });

  test("respects writable flag", () => {
    const doc = parseLimaYaml(
      generateLimaYaml(config, {
        extraMounts: [{ location: "/opt/data", mountPoint: "/mnt/data", writable: true }],
      }),
    );
    const mounts = doc.mounts as Array<Record<string, unknown>>;
    expect(mounts[2].writable).toBe(true);
  });

  test("defaults writable to false", () => {
    const doc = parseLimaYaml(
      generateLimaYaml(config, {
        extraMounts: [{ location: "~", mountPoint: "/mnt/host" }],
      }),
    );
    const mounts = doc.mounts as Array<Record<string, unknown>>;
    expect(mounts[2].writable).toBe(false);
  });

  test("does not include extra mounts when undefined", () => {
    const doc = parseLimaYaml(generateLimaYaml(config));
    const mounts = doc.mounts as Array<Record<string, unknown>>;
    expect(mounts.length).toBe(2);
  });

  test("does not include extra mounts when empty array", () => {
    const doc = parseLimaYaml(generateLimaYaml(config, { extraMounts: [] }));
    const mounts = doc.mounts as Array<Record<string, unknown>>;
    expect(mounts.length).toBe(2);
  });
});

// -- Op wrapper script --------------------------------------------------------

describe("generateOpWrapperScript", () => {
  const script = generateOpWrapperScript();

  test("starts with sh shebang", () => {
    expect(script).toStartWith("#!/bin/sh");
  });

  test("reads token from secrets file", () => {
    expect(script).toContain(".openclaw/secrets/op-token");
  });

  test("exports OP_SERVICE_ACCOUNT_TOKEN", () => {
    expect(script).toContain("export OP_SERVICE_ACCOUNT_TOKEN");
  });

  test("execs the real op binary", () => {
    expect(script).toContain("exec");
    expect(script).toContain(".op-real");
  });

  test("passes bash -n syntax check", async () => {
    await expectValidBashSyntax(script);
  });
});

// -- Exec-approvals config ----------------------------------------------------

describe("generateExecApprovals", () => {
  const raw = generateExecApprovals();

  test("is valid JSON", () => {
    expect(() => JSON.parse(raw)).not.toThrow();
  });

  const config = JSON.parse(raw);

  test("has version 1", () => {
    expect(config.version).toBe(1);
  });

  test("defaults to deny with on-miss ask", () => {
    expect(config.defaults.security).toBe("deny");
    expect(config.defaults.ask).toBe("on-miss");
  });

  test("allowlists op for the main agent", () => {
    const main = config.agents.main;
    expect(main.security).toBe("allowlist");
    expect(main.allowlist).toBeArrayOfSize(1);
    expect(main.allowlist[0].pattern).toBe("~/.local/bin/op");
  });
});

// -- Bootstrap prompt template ------------------------------------------------

describe("generateBootstrapPrompt", () => {
  test("includes agent name", () => {
    const prompt = generateBootstrapPrompt({
      agent: { name: "Archie" },
    });
    expect(prompt).toContain("Your name is Archie.");
  });

  test("includes agent context when provided", () => {
    const prompt = generateBootstrapPrompt({
      agent: {
        name: "Archie",
        context:
          "A household agent — part AI assistant, part digital butler. Helpful, resourceful, dry sense of humor.",
      },
    });
    expect(prompt).toContain("digital butler");
    expect(prompt).toContain("Helpful, resourceful");
    expect(prompt).toContain("dry sense of humor");
  });

  test("includes user name and context when provided", () => {
    const prompt = generateBootstrapPrompt({
      agent: { name: "Archie" },
      user: {
        name: "Alex",
        context: "Lives in London with Sam and Jamie. Timezone Europe/London.",
      },
    });
    expect(prompt).toContain("Your user is Alex.");
    expect(prompt).toContain("Lives in London");
    expect(prompt).toContain("Sam and Jamie");
  });

  test("omits user section when not provided", () => {
    const prompt = generateBootstrapPrompt({
      agent: { name: "Archie" },
    });
    expect(prompt).not.toContain("Your user");
  });

  test("works with name only — no context", () => {
    const prompt = generateBootstrapPrompt({
      agent: { name: "Sam" },
    });
    expect(prompt).toContain("Your name is Sam.");
    // Should be short — just the preamble and name
    const lines = prompt.split("\n").filter((l) => l.trim());
    expect(lines.length).toBeLessThan(6);
  });

  test("instructs non-interactive behavior", () => {
    const prompt = generateBootstrapPrompt({
      agent: { name: "Sam" },
    });
    expect(prompt).toContain("non-interactive");
    expect(prompt).toContain("do not ask questions");
  });
});
