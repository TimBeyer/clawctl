import { describe, test, expect } from "bun:test";
import { execa } from "execa";
import { generateBashCompletion } from "./bash.js";
import { generateZshCompletion } from "./zsh.js";

const ALL_COMMANDS = [
  "create",
  "list",
  "status",
  "start",
  "stop",
  "restart",
  "delete",
  "shell",
  "register",
  "openclaw",
  "oc",
  "use",
];

// -- Bash completion ----------------------------------------------------------

describe("generateBashCompletion", () => {
  const script = generateBashCompletion("clawctl");

  test("contains all command names", () => {
    for (const cmd of ALL_COMMANDS) {
      expect(script).toContain(cmd);
    }
  });

  test("interpolates binName correctly", () => {
    expect(script).toContain("_clawctl_completions");
    expect(script).toContain("_clawctl_instances");
    expect(script).toContain("complete -F _clawctl_completions clawctl");
  });

  test("uses custom binName", () => {
    const custom = generateBashCompletion("clawctl-dev");
    expect(custom).toContain("_clawctl-dev_completions");
    expect(custom).toContain("_clawctl-dev_instances");
    expect(custom).toContain("complete -F _clawctl-dev_completions clawctl-dev");
  });

  test("contains complete -F registration", () => {
    expect(script).toContain("complete -F");
  });

  test("reads instances from registry via python3", () => {
    expect(script).toContain("instances.json");
    expect(script).toContain("python3");
  });

  test("stops completing after --", () => {
    expect(script).toContain('== "--"');
  });

  test("includes openclaw subcommands", () => {
    for (const sub of [
      "onboard",
      "doctor",
      "config",
      "gateway",
      "agents",
      "channels",
      "skills",
      "plugins",
      "cron",
      "models",
      "memory",
      "browser",
    ]) {
      expect(script).toContain(sub);
    }
  });

  test("includes per-command options", () => {
    expect(script).toContain("--config");
    expect(script).toContain("--purge");
    expect(script).toContain("--global");
    expect(script).toContain("--instance");
    expect(script).toContain("--project");
  });

  test("sources cached oc completions if available", () => {
    expect(script).toContain("oc-completions.bash");
    expect(script).toContain("source");
  });

  test("delegates to cached openclaw completion function when available", () => {
    expect(script).toContain("_openclaw_completion");
  });

  test("passes bash -n syntax check", async () => {
    const result = await execa("bash", ["-n"], { input: script, reject: false });
    if (result.exitCode !== 0) {
      throw new Error(`bash -n failed:\n${result.stderr}`);
    }
  });
});

// -- Zsh completion -----------------------------------------------------------

describe("generateZshCompletion", () => {
  const script = generateZshCompletion("clawctl");

  test("contains all command names", () => {
    for (const cmd of ALL_COMMANDS) {
      expect(script).toContain(cmd);
    }
  });

  test("interpolates binName correctly", () => {
    expect(script).toContain("_clawctl()");
    expect(script).toContain("_clawctl_instances");
    expect(script).toContain("compdef _clawctl clawctl");
  });

  test("uses custom binName", () => {
    const custom = generateZshCompletion("clawctl-dev");
    expect(custom).toContain("_clawctl-dev()");
    expect(custom).toContain("_clawctl-dev_instances");
    expect(custom).toContain("compdef _clawctl-dev clawctl-dev");
  });

  test("contains compdef registration", () => {
    expect(script).toContain("compdef");
  });

  test("reads instances from registry via python3", () => {
    expect(script).toContain("instances.json");
    expect(script).toContain("python3");
  });

  test("stops completing after --", () => {
    expect(script).toContain('== "--"');
  });

  test("includes openclaw subcommands with descriptions", () => {
    for (const sub of [
      "onboard",
      "doctor",
      "config",
      "gateway",
      "agents",
      "channels",
      "skills",
      "plugins",
      "cron",
      "models",
      "memory",
      "browser",
    ]) {
      expect(script).toContain(sub);
    }
  });

  test("includes per-command options", () => {
    expect(script).toContain("--config");
    expect(script).toContain("--purge");
    expect(script).toContain("--global");
    expect(script).toContain("--instance");
    expect(script).toContain("--project");
  });

  test("uses zsh description annotations", () => {
    expect(script).toContain("_describe");
    expect(script).toContain("_arguments");
  });

  test("sources cached oc completions if available", () => {
    expect(script).toContain("oc-completions.zsh");
    expect(script).toContain("source");
  });

  test("delegates to _openclaw_root_completion when cached", () => {
    expect(script).toContain("_openclaw_root_completion");
  });
});
