import { describe, test, expect } from "bun:test";
import { execa } from "execa";
import {
  generateLimaYaml,
  guestMountPoint,
  generateHelpersScript,
  generateProvisionSystemScript,
  generateProvisionUserScript,
  generateAptPackagesScript,
  generateNodejsScript,
  generateTailscaleScript,
  generateSystemdLingerScript,
  generateHomebrewScript,
  generateOpCliScript,
  generateShellProfileScript,
  generateOpenclawScript,
  generateGatewayServiceStubScript,
  generateSecretManagementSkill,
  generateOpWrapperScript,
  generateExecApprovals,
  generateBootstrapPrompt,
} from "./index.js";
import type { VMConfig } from "../types.js";

// -- Helpers ------------------------------------------------------------------

/** Assert a generated bash script starts with the expected preamble. */
function expectBashPreamble(script: string) {
  expect(script).toStartWith("#!/bin/bash");
  expect(script).toContain("set -euo pipefail");
}

/** Run `bash -n` on a script string to validate syntax. */
async function expectValidBashSyntax(script: string) {
  const result = await execa("bash", ["-n"], { input: script, reject: false });
  if (result.exitCode !== 0) {
    throw new Error(`bash -n failed:\n${result.stderr}`);
  }
}

// -- Bash script generators ---------------------------------------------------

const bashGenerators: [string, () => string, string[]][] = [
  [
    "generateProvisionSystemScript",
    generateProvisionSystemScript,
    ["install-apt-packages.sh", "install-nodejs.sh"],
  ],
  [
    "generateProvisionUserScript",
    generateProvisionUserScript,
    ["install-homebrew.sh", "install-openclaw.sh"],
  ],
  [
    "generateAptPackagesScript",
    generateAptPackagesScript,
    ["build-essential", "git", "curl", "jq"],
  ],
  ["generateNodejsScript", generateNodejsScript, ["Node.js", "nodesource", "22"]],
  ["generateTailscaleScript", generateTailscaleScript, ["tailscale.com/install.sh"]],
  ["generateSystemdLingerScript", generateSystemdLingerScript, ["loginctl enable-linger"]],
  ["generateHomebrewScript", generateHomebrewScript, ["Homebrew", "linuxbrew"]],
  ["generateOpCliScript", generateOpCliScript, ["1Password CLI", "cache.agilebits.com", "arm64"]],
  ["generateShellProfileScript", generateShellProfileScript, [".local/bin"]],
  ["generateOpenclawScript", generateOpenclawScript, ["openclaw.ai/install.sh", "npm-global"]],
  [
    "generateGatewayServiceStubScript",
    generateGatewayServiceStubScript,
    ["openclaw-gateway.service", "systemctl --user"],
  ],
];

describe("bash script generators", () => {
  for (const [name, generator, expectedContent] of bashGenerators) {
    describe(name, () => {
      const script = generator();

      test("starts with shebang and set -euo pipefail", () => {
        expectBashPreamble(script);
      });

      test("contains expected content", () => {
        for (const content of expectedContent) {
          expect(script).toContain(content);
        }
      });

      test("passes bash -n syntax check", async () => {
        await expectValidBashSyntax(script);
      });
    });
  }
});

// -- Helpers script (sourced library, no set -euo pipefail) -------------------

describe("generateHelpersScript", () => {
  const script = generateHelpersScript();

  test("starts with shebang", () => {
    expect(script).toStartWith("#!/bin/bash");
  });

  test("contains expected helper functions", () => {
    expect(script).toContain("command_exists");
    expect(script).toContain("ensure_apt_packages");
    expect(script).toContain("ensure_in_bashrc");
    expect(script).toContain("ensure_in_profile");
    expect(script).toContain("ensure_dir");
  });

  test("passes bash -n syntax check", async () => {
    await expectValidBashSyntax(script);
  });
});

// -- Lima YAML generator ------------------------------------------------------

describe("generateLimaYaml", () => {
  const config: VMConfig = {
    projectDir: "/Users/test/my-project",
    vmName: "test-vm",
    cpus: 4,
    memory: "8GiB",
    disk: "50GiB",
  };

  const yaml = generateLimaYaml(config);

  test("interpolates vmName", () => {
    expect(yaml).toContain("# VM: test-vm");
  });

  test("interpolates cpus", () => {
    expect(yaml).toContain("cpus: 4");
  });

  test("interpolates memory", () => {
    expect(yaml).toContain('memory: "8GiB"');
  });

  test("interpolates disk", () => {
    expect(yaml).toContain('disk: "50GiB"');
  });

  test("interpolates projectDir in mounts", () => {
    expect(yaml).toContain('location: "/Users/test/my-project"');
    expect(yaml).toContain('location: "/Users/test/my-project/data"');
  });

  test("includes mount points", () => {
    expect(yaml).toContain('mountPoint: "/mnt/project"');
    expect(yaml).toContain('mountPoint: "/mnt/project/data"');
  });

  test("sets vmType to vz", () => {
    expect(yaml).toContain("vmType: vz");
  });

  test("sets arch to aarch64", () => {
    expect(yaml).toContain("arch: aarch64");
  });

  test("includes port forwarding", () => {
    expect(yaml).toContain("guestPort: 18789");
    expect(yaml).toContain("hostPort: 18789");
  });

  test("includes virtiofs mount type", () => {
    expect(yaml).toContain("mountType: virtiofs");
  });

  test("does not mount home directory", () => {
    expect(yaml).not.toContain("/mnt/host");
    expect(yaml).not.toContain('location: "~"');
  });

  test("project mount is read-only, data mount is writable", () => {
    // Find the two project-related mounts and check their writable flags
    const lines = yaml.split("\n");
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes('mountPoint: "/mnt/project"') && !lines[i].includes("/data")) {
        // The writable line should be nearby
        const nearby = lines.slice(Math.max(0, i - 3), i + 3).join("\n");
        expect(nearby).toContain("writable: false");
      }
      if (lines[i].includes('mountPoint: "/mnt/project/data"')) {
        const nearby = lines.slice(Math.max(0, i - 3), i + 3).join("\n");
        expect(nearby).toContain("writable: true");
      }
    }
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
    const noPortYaml = generateLimaYaml(config, { forwardGateway: false });
    expect(noPortYaml).not.toContain("portForwards");
    expect(noPortYaml).not.toContain("guestPort");
  });

  test("includes port forwards by default", () => {
    const defaultYaml = generateLimaYaml(config);
    expect(defaultYaml).toContain("portForwards");
    expect(defaultYaml).toContain("guestPort: 18789");
  });

  test("uses custom host port with default guest port", () => {
    const customPortYaml = generateLimaYaml(config, { gatewayPort: 9000 });
    expect(customPortYaml).toContain("guestPort: 18789");
    expect(customPortYaml).toContain("hostPort: 9000");
    expect(customPortYaml).not.toContain("hostPort: 18789");
  });

  test("guest port stays 18789 regardless of custom host port", () => {
    const customPortYaml = generateLimaYaml(config, { gatewayPort: 28789 });
    expect(customPortYaml).toContain("guestPort: 18789");
    expect(customPortYaml).toContain("hostPort: 28789");
  });
});

// -- guestMountPoint ----------------------------------------------------------

describe("guestMountPoint", () => {
  test("maps ~ to /mnt/host", () => {
    expect(guestMountPoint("~")).toBe("/mnt/host");
  });

  test("maps ~/.ssh to /mnt/host/.ssh", () => {
    expect(guestMountPoint("~/.ssh")).toBe("/mnt/host/.ssh");
  });

  test("maps absolute path /opt/data to /mnt/host/opt/data", () => {
    expect(guestMountPoint("/opt/data")).toBe("/mnt/host/opt/data");
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

  test("includes extra mounts in YAML", () => {
    const yaml = generateLimaYaml(config, { extraMounts: ["~"] });
    expect(yaml).toContain('location: "~"');
    expect(yaml).toContain('mountPoint: "/mnt/host"');
    expect(yaml).toContain("writable: false");
  });

  test("supports multiple extra mounts", () => {
    const yaml = generateLimaYaml(config, { extraMounts: ["~", "~/.ssh"] });
    expect(yaml).toContain('location: "~"');
    expect(yaml).toContain('mountPoint: "/mnt/host"');
    expect(yaml).toContain('location: "~/.ssh"');
    expect(yaml).toContain('mountPoint: "/mnt/host/.ssh"');
  });

  test("does not include extra mounts when undefined", () => {
    const yaml = generateLimaYaml(config);
    expect(yaml).not.toContain("/mnt/host");
  });

  test("does not include extra mounts when empty array", () => {
    const yaml = generateLimaYaml(config, { extraMounts: [] });
    expect(yaml).not.toContain("/mnt/host");
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
