import { describe, test, expect } from "bun:test";
import { buildOnboardCommand, PROVIDERS, PROVIDER_TYPES } from "./providers.js";

describe("PROVIDERS registry", () => {
  test("has entries for all expected provider types", () => {
    const expected = [
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
    for (const type of expected) {
      expect(PROVIDERS[type]).toBeDefined();
    }
    expect(PROVIDER_TYPES).toEqual(expected);
  });

  test("every provider has authChoice, envVar, and keyFlag", () => {
    for (const [type, def] of Object.entries(PROVIDERS)) {
      expect(def.authChoice, `${type}.authChoice`).toBeTruthy();
      expect(def.envVar, `${type}.envVar`).toBeTruthy();
      expect(def.keyFlag, `${type}.keyFlag`).toBeTruthy();
    }
  });
});

describe("buildOnboardCommand", () => {
  test("builds anthropic command with env var", () => {
    const cmd = buildOnboardCommand({ type: "anthropic", apiKey: "sk-ant-xyz" }, 18789);
    expect(cmd).toContain('ANTHROPIC_API_KEY="sk-ant-xyz"');
    expect(cmd).toContain("--auth-choice apiKey");
    expect(cmd).toContain("--gateway-port 18789");
    expect(cmd).toContain("--install-daemon");
    expect(cmd).toContain("--skip-skills");
  });

  test("builds openai command with correct env var and auth choice", () => {
    const cmd = buildOnboardCommand({ type: "openai", apiKey: "sk-abc" }, 18789);
    expect(cmd).toContain('OPENAI_API_KEY="sk-abc"');
    expect(cmd).toContain("--auth-choice openai-api-key");
  });

  test("builds gemini command", () => {
    const cmd = buildOnboardCommand({ type: "gemini", apiKey: "AIza..." }, 18789);
    expect(cmd).toContain('GEMINI_API_KEY="AIza..."');
    expect(cmd).toContain("--auth-choice gemini-api-key");
  });

  test("does not include --model (model is set post-onboard)", () => {
    const cmd = buildOnboardCommand(
      { type: "anthropic", apiKey: "sk-ant-xyz", model: "anthropic/claude-opus-4-6" },
      18789,
    );
    expect(cmd).not.toContain("--model");
  });

  test("builds custom provider command with all fields", () => {
    const cmd = buildOnboardCommand(
      {
        type: "custom",
        apiKey: "my-key",
        baseUrl: "https://api.example.com/v1",
        modelId: "my-model",
        compatibility: "openai",
        providerId: "my-provider",
        model: "my-model-alias",
      },
      18789,
    );
    expect(cmd).toContain('CUSTOM_API_KEY="my-key"');
    expect(cmd).toContain("--auth-choice custom-api-key");
    expect(cmd).toContain('--custom-base-url "https://api.example.com/v1"');
    expect(cmd).toContain('--custom-model-id "my-model"');
    expect(cmd).toContain("--custom-compatibility openai");
    expect(cmd).toContain('--custom-provider-id "my-provider"');
    expect(cmd).not.toContain("--model");
  });

  test("builds custom provider without apiKey (local provider)", () => {
    const cmd = buildOnboardCommand(
      {
        type: "custom",
        baseUrl: "http://localhost:11434/v1",
        modelId: "llama3",
      },
      18789,
    );
    expect(cmd).not.toContain("CUSTOM_API_KEY");
    expect(cmd).toContain("--auth-choice custom-api-key");
    expect(cmd).toContain('--custom-base-url "http://localhost:11434/v1"');
    expect(cmd).toContain('--custom-model-id "llama3"');
  });

  test("throws on unknown provider type", () => {
    expect(() => buildOnboardCommand({ type: "not-a-provider", apiKey: "x" }, 18789)).toThrow(
      "Unknown provider",
    );
  });

  test("uses correct port", () => {
    const cmd = buildOnboardCommand({ type: "anthropic", apiKey: "sk-x" }, 9999);
    expect(cmd).toContain("--gateway-port 9999");
  });

  test("always uses --secret-input-mode plaintext", () => {
    const cmd = buildOnboardCommand({ type: "anthropic", apiKey: "sk-ant-xyz" }, 18789);
    expect(cmd).toContain("--secret-input-mode plaintext");
  });

  test("custom provider also uses --secret-input-mode plaintext", () => {
    const cmd = buildOnboardCommand(
      { type: "custom", apiKey: "my-key", baseUrl: "http://localhost/v1", modelId: "m" },
      18789,
    );
    expect(cmd).toContain("--secret-input-mode plaintext");
  });
});
