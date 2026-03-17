import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { homedir } from "os";
import { resolve } from "path";
import { validateConfig, configToVMConfig, loadConfig, sanitizeConfig } from "./config.js";

// -- validateConfig -----------------------------------------------------------

describe("validateConfig", () => {
  test("accepts minimal config (name + project)", () => {
    const config = validateConfig({ name: "test", project: "/tmp/test" });
    expect(config.name).toBe("test");
    expect(config.project).toBe("/tmp/test");
  });

  test("expands ~ in project path", () => {
    const config = validateConfig({ name: "test", project: "~/my-project" });
    expect(config.project).toBe(resolve(homedir(), "my-project"));
  });

  test("accepts full config with all sections", () => {
    const config = validateConfig({
      name: "hal",
      project: "/tmp/hal",
      resources: { cpus: 8, memory: "16GiB", disk: "100GiB" },
      network: {
        forwardGateway: false,
        gatewayPort: 9000,
        gatewayToken: "my-token",
        tailscale: { authKey: "tskey-auth-abc" },
      },
      services: { onePassword: { serviceAccountToken: "ops_abc" } },
      tools: { docker: true, python: true },
      mounts: [
        { location: "~/.ssh", mountPoint: "/mnt/ssh" },
        { location: "~/.gitconfig", mountPoint: "/mnt/gitconfig" },
      ],
      agent: { skipOnboarding: true, toolsProfile: "full", sandbox: false },
      provider: { type: "anthropic", apiKey: "sk-ant-xyz", model: "anthropic/claude-opus-4-6" },
      telegram: {
        botToken: "123:ABC",
        allowFrom: ["111"],
        groups: { "-100": { requireMention: true } },
      },
    });

    expect(config.name).toBe("hal");
    expect(config.resources?.cpus).toBe(8);
    expect(config.network?.forwardGateway).toBe(false);
    expect(config.network?.gatewayPort).toBe(9000);
    expect(config.network?.gatewayToken).toBe("my-token");
    expect(config.network?.tailscale?.authKey).toBe("tskey-auth-abc");
    expect(config.services?.onePassword?.serviceAccountToken).toBe("ops_abc");
    expect(config.tools?.docker).toBe(true);
    expect(config.mounts).toEqual([
      { location: "~/.ssh", mountPoint: "/mnt/ssh" },
      { location: "~/.gitconfig", mountPoint: "/mnt/gitconfig" },
    ]);
    expect(config.agent?.skipOnboarding).toBe(true);
    expect(config.provider?.type).toBe("anthropic");
    expect(config.provider?.apiKey).toBe("sk-ant-xyz");
    expect(config.provider?.model).toBe("anthropic/claude-opus-4-6");
    expect(config.telegram?.botToken).toBe("123:ABC");
    expect(config.telegram?.groups?.["-100"]?.requireMention).toBe(true);
  });

  test("throws on missing name", () => {
    expect(() => validateConfig({ project: "/tmp/test" })).toThrow("name");
  });

  test("throws on missing project", () => {
    expect(() => validateConfig({ name: "test" })).toThrow("project");
  });

  test("throws on non-object input", () => {
    expect(() => validateConfig("string")).toThrow("JSON object");
    expect(() => validateConfig(null)).toThrow("JSON object");
    expect(() => validateConfig([])).toThrow("JSON object");
  });

  test("throws on wrong type for name", () => {
    expect(() => validateConfig({ name: 123, project: "/tmp" })).toThrow("name");
  });

  test("throws on empty name", () => {
    expect(() => validateConfig({ name: "", project: "/tmp" })).toThrow("name");
  });

  test("throws on wrong type for resources.cpus", () => {
    expect(() =>
      validateConfig({ name: "t", project: "/tmp", resources: { cpus: "four" } }),
    ).toThrow("cpus");
  });

  test("throws on negative resources.cpus", () => {
    expect(() => validateConfig({ name: "t", project: "/tmp", resources: { cpus: 0 } })).toThrow(
      "cpus",
    );
  });

  test("throws on wrong type for resources.memory", () => {
    expect(() => validateConfig({ name: "t", project: "/tmp", resources: { memory: 8 } })).toThrow(
      "memory",
    );
  });

  test("throws on wrong type for resources.disk", () => {
    expect(() => validateConfig({ name: "t", project: "/tmp", resources: { disk: 50 } })).toThrow(
      "disk",
    );
  });

  test("throws on non-boolean network.forwardGateway", () => {
    expect(() =>
      validateConfig({ name: "t", project: "/tmp", network: { forwardGateway: "yes" } }),
    ).toThrow("forwardGateway");
  });

  // -- network.gatewayPort -----------------------------------------------------

  test("accepts valid gatewayPort", () => {
    const config = validateConfig({
      name: "t",
      project: "/tmp",
      network: { gatewayPort: 9000 },
    });
    expect(config.network?.gatewayPort).toBe(9000);
  });

  test("accepts default gatewayPort (18789)", () => {
    const config = validateConfig({
      name: "t",
      project: "/tmp",
      network: { gatewayPort: 18789 },
    });
    expect(config.network?.gatewayPort).toBe(18789);
  });

  test("throws on gatewayPort below 1024", () => {
    expect(() =>
      validateConfig({ name: "t", project: "/tmp", network: { gatewayPort: 80 } }),
    ).toThrow();
  });

  test("throws on gatewayPort above 65535", () => {
    expect(() =>
      validateConfig({ name: "t", project: "/tmp", network: { gatewayPort: 70000 } }),
    ).toThrow();
  });

  test("throws on non-integer gatewayPort", () => {
    expect(() =>
      validateConfig({ name: "t", project: "/tmp", network: { gatewayPort: 8080.5 } }),
    ).toThrow();
  });

  // -- network.gatewayToken ---------------------------------------------------

  test("accepts valid gatewayToken", () => {
    const config = validateConfig({
      name: "t",
      project: "/tmp",
      network: { gatewayToken: "my-secret-token" },
    });
    expect(config.network?.gatewayToken).toBe("my-secret-token");
  });

  test("throws on empty gatewayToken", () => {
    expect(() =>
      validateConfig({ name: "t", project: "/tmp", network: { gatewayToken: "" } }),
    ).toThrow();
  });

  test("throws on bad network.tailscale", () => {
    expect(() =>
      validateConfig({ name: "t", project: "/tmp", network: { tailscale: { authKey: "" } } }),
    ).toThrow("tailscale.authKey");

    expect(() =>
      validateConfig({ name: "t", project: "/tmp", network: { tailscale: "key" } }),
    ).toThrow("tailscale");
  });

  // -- network.tailscale.mode --------------------------------------------------

  test("accepts tailscale.mode 'off'", () => {
    const config = validateConfig({
      name: "t",
      project: "/tmp",
      network: { tailscale: { authKey: "tskey-auth-abc", mode: "off" } },
    });
    expect(config.network?.tailscale?.mode).toBe("off");
  });

  test("accepts tailscale.mode 'serve'", () => {
    const config = validateConfig({
      name: "t",
      project: "/tmp",
      network: { tailscale: { authKey: "tskey-auth-abc", mode: "serve" } },
    });
    expect(config.network?.tailscale?.mode).toBe("serve");
  });

  test("accepts tailscale.mode 'funnel'", () => {
    const config = validateConfig({
      name: "t",
      project: "/tmp",
      network: { tailscale: { authKey: "tskey-auth-abc", mode: "funnel" } },
    });
    expect(config.network?.tailscale?.mode).toBe("funnel");
  });

  test("accepts tailscale without mode (optional)", () => {
    const config = validateConfig({
      name: "t",
      project: "/tmp",
      network: { tailscale: { authKey: "tskey-auth-abc" } },
    });
    expect(config.network?.tailscale?.mode).toBeUndefined();
  });

  test("throws on invalid tailscale.mode", () => {
    expect(() =>
      validateConfig({
        name: "t",
        project: "/tmp",
        network: { tailscale: { authKey: "tskey-auth-abc", mode: "invalid" } },
      }),
    ).toThrow();
  });

  test("throws on bad services.onePassword", () => {
    expect(() =>
      validateConfig({
        name: "t",
        project: "/tmp",
        services: { onePassword: { serviceAccountToken: "" } },
      }),
    ).toThrow("serviceAccountToken");

    expect(() =>
      validateConfig({ name: "t", project: "/tmp", services: { onePassword: true } }),
    ).toThrow("onePassword");
  });

  test("throws on non-array mounts", () => {
    expect(() => validateConfig({ name: "t", project: "/tmp", mounts: "~/.ssh" })).toThrow(
      "mounts",
    );
  });

  test("throws on string mount entry (must be object)", () => {
    expect(() => validateConfig({ name: "t", project: "/tmp", mounts: ["~"] })).toThrow("mounts");
  });

  test("throws on mount missing location", () => {
    expect(() =>
      validateConfig({ name: "t", project: "/tmp", mounts: [{ mountPoint: "/mnt/host" }] }),
    ).toThrow("location");
  });

  test("throws on mount missing mountPoint", () => {
    expect(() =>
      validateConfig({ name: "t", project: "/tmp", mounts: [{ location: "~" }] }),
    ).toThrow("mountPoint");
  });

  test("throws on non-boolean agent.skipOnboarding", () => {
    expect(() =>
      validateConfig({ name: "t", project: "/tmp", agent: { skipOnboarding: "yes" } }),
    ).toThrow("skipOnboarding");
  });

  // -- provider ---------------------------------------------------------------

  test("accepts first-class provider (anthropic)", () => {
    const config = validateConfig({
      name: "t",
      project: "/tmp",
      provider: { type: "anthropic", apiKey: "sk-ant-abc123" },
    });
    expect(config.provider?.type).toBe("anthropic");
    expect(config.provider?.apiKey).toBe("sk-ant-abc123");
  });

  test("accepts first-class provider (openai) with model", () => {
    const config = validateConfig({
      name: "t",
      project: "/tmp",
      provider: { type: "openai", apiKey: "sk-abc", model: "gpt-4o" },
    });
    expect(config.provider?.type).toBe("openai");
    expect(config.provider?.model).toBe("gpt-4o");
  });

  test("accepts all first-class provider types", () => {
    const types = [
      "anthropic",
      "openai",
      "gemini",
      "zai",
      "mistral",
      "moonshot",
      "synthetic",
      "opencode-zen",
      "ai-gateway",
      "kilocode",
      "volcengine",
      "byteplus",
      "minimax",
      "huggingface",
    ];
    for (const type of types) {
      const config = validateConfig({
        name: "t",
        project: "/tmp",
        provider: { type, apiKey: "test-key" },
      });
      expect(config.provider?.type).toBe(type);
    }
  });

  test("accepts custom provider with baseUrl + modelId", () => {
    const config = validateConfig({
      name: "t",
      project: "/tmp",
      provider: {
        type: "custom",
        baseUrl: "http://localhost:11434/v1",
        modelId: "llama3",
        compatibility: "openai",
      },
    });
    expect(config.provider?.type).toBe("custom");
    expect(config.provider?.baseUrl).toBe("http://localhost:11434/v1");
    expect(config.provider?.modelId).toBe("llama3");
    expect(config.provider?.apiKey).toBeUndefined();
  });

  test("accepts custom provider with apiKey", () => {
    const config = validateConfig({
      name: "t",
      project: "/tmp",
      provider: {
        type: "custom",
        apiKey: "my-key",
        baseUrl: "https://api.example.com/v1",
        modelId: "my-model",
        providerId: "my-provider",
      },
    });
    expect(config.provider?.apiKey).toBe("my-key");
    expect(config.provider?.providerId).toBe("my-provider");
  });

  test("throws on missing provider.type", () => {
    expect(() =>
      validateConfig({ name: "t", project: "/tmp", provider: { apiKey: "sk-abc" } }),
    ).toThrow("type");
  });

  test("throws on unknown provider type", () => {
    expect(() =>
      validateConfig({
        name: "t",
        project: "/tmp",
        provider: { type: "not-a-provider", apiKey: "x" },
      }),
    ).toThrow("provider.type");
  });

  test("throws on missing apiKey for non-custom provider", () => {
    expect(() =>
      validateConfig({ name: "t", project: "/tmp", provider: { type: "anthropic" } }),
    ).toThrow("apiKey");
  });

  test("throws on custom provider missing baseUrl", () => {
    expect(() =>
      validateConfig({
        name: "t",
        project: "/tmp",
        provider: { type: "custom", modelId: "llama3" },
      }),
    ).toThrow("baseUrl");
  });

  test("throws on custom provider missing modelId", () => {
    expect(() =>
      validateConfig({
        name: "t",
        project: "/tmp",
        provider: { type: "custom", baseUrl: "http://localhost:11434/v1" },
      }),
    ).toThrow("modelId");
  });

  test("throws on non-object provider", () => {
    expect(() => validateConfig({ name: "t", project: "/tmp", provider: "sk-abc" })).toThrow(
      "provider",
    );
  });

  // -- telegram ---------------------------------------------------------------

  test("accepts telegram with botToken only", () => {
    const config = validateConfig({
      name: "t",
      project: "/tmp",
      telegram: { botToken: "123:ABC" },
    });
    expect(config.telegram?.botToken).toBe("123:ABC");
    expect(config.telegram?.allowFrom).toBeUndefined();
    expect(config.telegram?.groups).toBeUndefined();
  });

  test("accepts telegram with all fields", () => {
    const config = validateConfig({
      name: "t",
      project: "/tmp",
      telegram: {
        botToken: "123:ABC",
        allowFrom: ["111", "222"],
        groups: {
          "-100123": { requireMention: true },
          "-100456": {},
        },
      },
    });
    expect(config.telegram?.botToken).toBe("123:ABC");
    expect(config.telegram?.allowFrom).toEqual(["111", "222"]);
    expect(config.telegram?.groups?.["-100123"]?.requireMention).toBe(true);
    expect(config.telegram?.groups?.["-100456"]?.requireMention).toBeUndefined();
  });

  test("throws on missing telegram.botToken", () => {
    expect(() => validateConfig({ name: "t", project: "/tmp", telegram: {} })).toThrow("botToken");
  });

  test("throws on empty telegram.botToken", () => {
    expect(() =>
      validateConfig({ name: "t", project: "/tmp", telegram: { botToken: "" } }),
    ).toThrow("botToken");
  });

  test("throws on non-array telegram.allowFrom", () => {
    expect(() =>
      validateConfig({
        name: "t",
        project: "/tmp",
        telegram: { botToken: "123:ABC", allowFrom: "111" },
      }),
    ).toThrow("allowFrom");
  });

  test("throws on non-string entry in telegram.allowFrom", () => {
    expect(() =>
      validateConfig({
        name: "t",
        project: "/tmp",
        telegram: { botToken: "123:ABC", allowFrom: [111] },
      }),
    ).toThrow("allowFrom");
  });

  test("throws on non-object telegram.groups", () => {
    expect(() =>
      validateConfig({
        name: "t",
        project: "/tmp",
        telegram: { botToken: "123:ABC", groups: "bad" },
      }),
    ).toThrow("groups");
  });

  test("throws on non-boolean telegram.groups.*.requireMention", () => {
    expect(() =>
      validateConfig({
        name: "t",
        project: "/tmp",
        telegram: { botToken: "123:ABC", groups: { "-100": { requireMention: "yes" } } },
      }),
    ).toThrow("requireMention");
  });

  test("throws on non-object telegram", () => {
    expect(() => validateConfig({ name: "t", project: "/tmp", telegram: "bad" })).toThrow(
      "telegram",
    );
  });

  // -- op:// cross-validation -------------------------------------------------

  test("accepts op:// references when onePassword is configured", () => {
    const config = validateConfig({
      name: "t",
      project: "/tmp",
      services: { onePassword: { serviceAccountToken: "ops_abc" } },
      provider: { type: "anthropic", apiKey: "op://Vault/Anthropic/api-key" },
    });
    expect(config.provider?.apiKey).toBe("op://Vault/Anthropic/api-key");
  });

  test("throws on op:// references without onePassword configured", () => {
    expect(() =>
      validateConfig({
        name: "t",
        project: "/tmp",
        provider: { type: "anthropic", apiKey: "op://Vault/Anthropic/api-key" },
      }),
    ).toThrow("one-password");  // neither services.onePassword nor capabilities["one-password"]
  });
});

// -- configToVMConfig ---------------------------------------------------------

describe("configToVMConfig", () => {
  test("maps name → vmName and project → projectDir", () => {
    const vm = configToVMConfig({ name: "my-vm", project: "/tmp/my-vm" });
    expect(vm.vmName).toBe("my-vm");
    expect(vm.projectDir).toBe("/tmp/my-vm");
  });

  test("applies default resources when not specified", () => {
    const vm = configToVMConfig({ name: "t", project: "/tmp" });
    expect(vm.cpus).toBe(4);
    expect(vm.memory).toBe("8GiB");
    expect(vm.disk).toBe("50GiB");
  });

  test("uses custom resources when specified", () => {
    const vm = configToVMConfig({
      name: "t",
      project: "/tmp",
      resources: { cpus: 8, memory: "16GiB", disk: "100GiB" },
    });
    expect(vm.cpus).toBe(8);
    expect(vm.memory).toBe("16GiB");
    expect(vm.disk).toBe("100GiB");
  });

  test("applies partial resource defaults", () => {
    const vm = configToVMConfig({
      name: "t",
      project: "/tmp",
      resources: { cpus: 2 },
    });
    expect(vm.cpus).toBe(2);
    expect(vm.memory).toBe("8GiB");
    expect(vm.disk).toBe("50GiB");
  });

  test("passes mounts as extraMounts", () => {
    const vm = configToVMConfig({
      name: "t",
      project: "/tmp",
      mounts: [
        { location: "~", mountPoint: "/mnt/host" },
        { location: "/opt/data", mountPoint: "/mnt/data" },
      ],
    });
    expect(vm.extraMounts).toEqual([
      { location: "~", mountPoint: "/mnt/host" },
      { location: "/opt/data", mountPoint: "/mnt/data" },
    ]);
  });

  test("extraMounts undefined when no mounts", () => {
    const vm = configToVMConfig({ name: "t", project: "/tmp" });
    expect(vm.extraMounts).toBeUndefined();
  });

  test("extraMounts undefined when mounts is empty array", () => {
    const vm = configToVMConfig({ name: "t", project: "/tmp", mounts: [] });
    expect(vm.extraMounts).toBeUndefined();
  });
});

// -- sanitizeConfig -----------------------------------------------------------

describe("sanitizeConfig", () => {
  test("strips provider.apiKey", () => {
    const result = sanitizeConfig({
      name: "t",
      project: "/tmp",
      provider: { type: "anthropic", apiKey: "sk-secret" },
    });
    expect((result.provider as Record<string, unknown>).type).toBe("anthropic");
    expect((result.provider as Record<string, unknown>).apiKey).toBeUndefined();
  });

  test("strips network.gatewayToken and network.tailscale.authKey", () => {
    const result = sanitizeConfig({
      name: "t",
      project: "/tmp",
      network: {
        gatewayToken: "secret-token",
        gatewayPort: 9000,
        tailscale: { authKey: "tskey-secret" },
      },
    });
    const net = result.network as Record<string, unknown>;
    expect(net.gatewayToken).toBeUndefined();
    expect(net.gatewayPort).toBe(9000);
    expect((net.tailscale as Record<string, unknown>).authKey).toBeUndefined();
  });

  test("strips tailscale.authKey but preserves tailscale.mode", () => {
    const result = sanitizeConfig({
      name: "t",
      project: "/tmp",
      network: {
        tailscale: { authKey: "tskey-secret", mode: "serve" },
      },
    });
    const net = result.network as Record<string, unknown>;
    const ts = net.tailscale as Record<string, unknown>;
    expect(ts.authKey).toBeUndefined();
    expect(ts.mode).toBe("serve");
  });

  test("strips services.onePassword.serviceAccountToken", () => {
    const result = sanitizeConfig({
      name: "t",
      project: "/tmp",
      services: { onePassword: { serviceAccountToken: "ops_secret" } },
    });
    const op = (result.services as Record<string, unknown>).onePassword as Record<string, unknown>;
    expect(op.serviceAccountToken).toBeUndefined();
  });

  test("strips telegram.botToken", () => {
    const result = sanitizeConfig({
      name: "t",
      project: "/tmp",
      telegram: { botToken: "123:SECRET", allowFrom: ["111"] },
    });
    const tg = result.telegram as Record<string, unknown>;
    expect(tg.botToken).toBeUndefined();
    expect(tg.allowFrom).toEqual(["111"]);
  });

  test("strips bootstrap field", () => {
    const result = sanitizeConfig({
      name: "t",
      project: "/tmp",
      bootstrap: { agent: { name: "hal" } },
    });
    expect(result.bootstrap).toBeUndefined();
  });

  test("preserves non-secret fields", () => {
    const result = sanitizeConfig({
      name: "my-vm",
      project: "/tmp/my-vm",
      resources: { cpus: 8, memory: "16GiB", disk: "100GiB" },
    });
    expect(result.name).toBe("my-vm");
    expect(result.project).toBe("/tmp/my-vm");
    expect((result.resources as Record<string, unknown>).cpus).toBe(8);
  });

  test("does not mutate original config", () => {
    const original = {
      name: "t",
      project: "/tmp",
      provider: { type: "anthropic", apiKey: "sk-secret" },
    };
    sanitizeConfig(original);
    expect(original.provider.apiKey).toBe("sk-secret");
  });
});

// -- loadConfig ---------------------------------------------------------------

describe("loadConfig", () => {
  test("throws on non-existent file", async () => {
    await expect(loadConfig("/nonexistent/config.json")).rejects.toThrow("Cannot read config");
  });

  test("throws on invalid JSON", async () => {
    const tmp = "/tmp/clawctl-test-invalid.json";
    await Bun.write(tmp, "{ not valid json }");
    await expect(loadConfig(tmp)).rejects.toThrow("Invalid JSON");
  });

  test("loads and validates a valid config file", async () => {
    const tmp = "/tmp/clawctl-test-valid.json";
    await Bun.write(tmp, JSON.stringify({ name: "test-vm", project: "/tmp/test-vm" }));
    const config = await loadConfig(tmp);
    expect(config.name).toBe("test-vm");
    expect(config.project).toBe("/tmp/test-vm");
  });

  describe("env:// resolution", () => {
    const savedEnv: Record<string, string | undefined> = {};

    beforeEach(() => {
      savedEnv.CLAWCTL_TEST_TOKEN = process.env.CLAWCTL_TEST_TOKEN;
      process.env.CLAWCTL_TEST_TOKEN = "ops_resolved_token";
    });

    afterEach(() => {
      if (savedEnv.CLAWCTL_TEST_TOKEN === undefined) delete process.env.CLAWCTL_TEST_TOKEN;
      else process.env.CLAWCTL_TEST_TOKEN = savedEnv.CLAWCTL_TEST_TOKEN;
    });

    test("resolves env:// references at load time", async () => {
      const tmp = "/tmp/clawctl-test-env-ref.json";
      await Bun.write(
        tmp,
        JSON.stringify({
          name: "test-vm",
          project: "/tmp/test-vm",
          services: { onePassword: { serviceAccountToken: "env://CLAWCTL_TEST_TOKEN" } },
        }),
      );
      const config = await loadConfig(tmp);
      expect(config.services?.onePassword?.serviceAccountToken).toBe("ops_resolved_token");
    });

    test("throws on unset env:// reference", async () => {
      const tmp = "/tmp/clawctl-test-env-missing.json";
      await Bun.write(
        tmp,
        JSON.stringify({
          name: "test-vm",
          project: "/tmp/test-vm",
          services: { onePassword: { serviceAccountToken: "env://NONEXISTENT_VAR_99" } },
        }),
      );
      await expect(loadConfig(tmp)).rejects.toThrow("NONEXISTENT_VAR_99");
    });
  });
});
