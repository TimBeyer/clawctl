import { randomBytes } from "crypto";
import { mkdir, rm } from "fs/promises";
import { join } from "path";
import type { VMDriver, OnLine } from "./drivers/types.js";
import { GATEWAY_PORT, CLAW_BIN_PATH, CHANNEL_REGISTRY, PROJECT_MOUNT_POINT } from "@clawctl/types";
import type { InstanceConfig, ChannelDef } from "@clawctl/types";
import { buildOnboardCommand } from "./providers.js";
import { patchMainConfig, patchAuthProfiles } from "./infra-secrets.js";
import { generateBootstrapPrompt } from "@clawctl/templates";
import { redactSecrets } from "./redact.js";
import { getTailscaleHostname } from "./tailscale.js";
import type { ResolvedSecretRef } from "./secrets.js";

const OPENCLAW_CONFIG_PATH = `${PROJECT_MOUNT_POINT}/data/config`;

/**
 * True if openclaw has already been onboarded on this instance. data/config
 * is created by `openclaw onboard`, so its presence on the mount is the
 * sentinel: it means the gateway auth token has already been issued and the
 * daemon is configured. Re-running onboard would rotate that token and
 * re-issue credentials, so subsequent `clawctl create` invocations skip
 * onboard and only apply the post-onboard config delta.
 */
async function isAlreadyOnboarded(driver: VMDriver, vmName: string): Promise<boolean> {
  const r = await driver.exec(vmName, `test -f ${OPENCLAW_CONFIG_PATH}`);
  return r.exitCode === 0;
}

/**
 * Read the existing gateway.auth.token from data/config. Returns undefined
 * if the file isn't readable as JSON or the field isn't a string — callers
 * fall back to generating a fresh token in that case.
 */
async function readExistingGatewayToken(
  driver: VMDriver,
  vmName: string,
): Promise<string | undefined> {
  const result = await driver.exec(vmName, `cat ${OPENCLAW_CONFIG_PATH}`);
  if (result.exitCode !== 0) return undefined;
  try {
    const parsed = JSON.parse(result.stdout) as Record<string, unknown>;
    const gateway = parsed.gateway as Record<string, unknown> | undefined;
    const auth = gateway?.auth as Record<string, unknown> | undefined;
    const token = auth?.token;
    return typeof token === "string" && token.length > 0 ? token : undefined;
  } catch {
    return undefined;
  }
}

export interface BootstrapResult {
  gatewayToken: string;
  dashboardUrl: string;
  tailscaleUrl?: string;
  doctorPassed: boolean;
}

/**
 * Bootstrap openclaw inside the VM: onboard, configure, start daemon.
 *
 * Delegates to `openclaw onboard --non-interactive` for the heavy lifting,
 * then applies post-onboard config tweaks and injects the gateway token.
 *
 * Step ordering matters: all plaintext config (c, d, e) must complete before
 * the secret migration (f) patches values to SecretRefs.
 */
export async function bootstrapOpenclaw(
  driver: VMDriver,
  vmName: string,
  config: InstanceConfig,
  onLine?: OnLine,
  resolvedMap?: ResolvedSecretRef[],
): Promise<BootstrapResult> {
  const provider = config.provider!;

  // a) Create workspace dir on host (needed early for skill installation)
  const workspaceDir = join(config.project, "data", "workspace");
  await mkdir(workspaceDir, { recursive: true });

  // Detect prior onboard. data/config is openclaw's own state file; if it
  // exists the gateway auth token has already been issued and the daemon
  // configured. Re-running onboard would rotate the token, so on re-apply we
  // skip onboard and just thread the existing token through the apply-state
  // steps below. This makes `clawctl create` idempotent in the strong sense:
  // first run bootstraps, subsequent runs apply the clawctl.json diff.
  const alreadyOnboarded = await isAlreadyOnboarded(driver, vmName);

  if (!alreadyOnboarded) {
    // b) Run openclaw onboard --non-interactive (always plaintext — we migrate to
    //    file provider SecretRefs post-onboard)
    const onboardCmd = buildOnboardCommand(provider, GATEWAY_PORT);

    onLine?.(`Running openclaw onboard (${provider.type})...`);
    const onboardResult = await driver.exec(vmName, onboardCmd, onLine);
    if (onboardResult.exitCode !== 0) {
      // Onboard may exit non-zero due to gateway startup timing (websocket close
      // before the service is fully ready). Check if config was actually written —
      // if so, onboard did its job and we can continue. The daemon restart (step g)
      // and openclaw doctor (step i) will verify the gateway later.
      const configCheck = await driver.exec(vmName, `test -f ${OPENCLAW_CONFIG_PATH}`);
      if (configCheck.exitCode !== 0) {
        throw new Error(
          `openclaw onboard failed (exit ${onboardResult.exitCode}): ${onboardResult.stderr}`,
        );
      }
      onLine?.("Onboard exited with warnings but config was written — continuing");
    }

    // OpenClaw's onboard creates a nested .git in the workspace — remove it.
    // The project repo tracks data/workspace/ directly; no nested repos.
    const wsGit = join(workspaceDir, ".git");
    await rm(wsGit, { recursive: true, force: true });
  } else {
    onLine?.(`Skipping onboard — instance already initialized (provider: ${provider.type})`);
  }

  // c) Post-onboard config (including gateway token — must be before daemon
  //    restart so the daemon picks it up). Precedence for the token:
  //    explicit config override > existing token on disk > fresh random.
  const existingToken = alreadyOnboarded
    ? await readExistingGatewayToken(driver, vmName)
    : undefined;
  const gatewayToken =
    config.network?.gatewayToken ?? existingToken ?? randomBytes(24).toString("hex");
  const secrets = [gatewayToken, ...collectChannelSecrets(config)].filter(Boolean) as string[];
  const safeLog = (msg: string) => onLine?.(redactSecrets(msg, secrets));

  const configCmds: string[] = [];
  if (provider.model) {
    configCmds.push(`openclaw models set ${provider.model}`);
  }
  configCmds.push(`openclaw config set tools.profile ${config.agent?.toolsProfile ?? "full"}`);
  configCmds.push("openclaw config set agents.defaults.workspace /mnt/project/data/workspace");
  if (config.agent?.sandbox === false) {
    configCmds.push("openclaw config set agents.defaults.sandbox.mode off");
  }
  configCmds.push(`openclaw config set gateway.auth.token "${gatewayToken}"`);

  // Tailscale gateway mode (serve/funnel/off) — defaults to "serve" when
  // Tailscale is configured, so the user gets HTTPS on the tailnet automatically
  const tsCap = config.capabilities?.tailscale;
  const tsMode =
    tsCap && typeof tsCap === "object" && "authKey" in tsCap
      ? ((tsCap.mode as string) ?? "serve")
      : undefined;

  if (tsMode && tsMode !== "off") {
    configCmds.push(`openclaw config set gateway.tailscale.mode ${tsMode}`);

    if (tsMode === "funnel") {
      // Funnel requires password auth — reuse gatewayToken as the password
      configCmds.push("openclaw config set gateway.auth.mode password");
      configCmds.push(`openclaw config set gateway.auth.password "${gatewayToken}"`);
    }
  }

  for (const cmd of configCmds) {
    safeLog(`  ${cmd}`);
    const r = await driver.exec(vmName, cmd);
    if (r.exitCode !== 0) {
      safeLog(`  Warning: ${cmd} failed: ${r.stderr}`);
    }
  }

  // d) Channel setup (plaintext — must run before secret migration)
  if (config.channels) {
    for (const [channelName, channelConfig] of Object.entries(config.channels)) {
      if (channelConfig.enabled === false) continue;
      onLine?.(`Configuring ${channelName}...`);
      const cmds = buildChannelCommands(channelName, channelConfig);
      for (const cmd of cmds) {
        safeLog(`  ${cmd}`);
        const r = await driver.exec(vmName, cmd);
        if (r.exitCode !== 0) {
          safeLog(`  Warning: ${cmd} failed: ${r.stderr}`);
        }
      }
    }
  }

  // d2) OpenClaw passthrough config
  if (config.openclaw && Object.keys(config.openclaw).length > 0) {
    onLine?.("Applying openclaw config overrides...");
    for (const [path, value] of Object.entries(config.openclaw)) {
      const serialized = serializeConfigValue(value);
      const cmd = `openclaw config set ${path} ${serialized}`;
      safeLog(`  ${cmd}`);
      const r = await driver.exec(vmName, cmd);
      if (r.exitCode !== 0) {
        safeLog(`  Warning: ${cmd} failed: ${r.stderr}`);
      }
    }
  }

  // e) Migrate to file provider SecretRefs (removes plaintext from mount).
  //    Runs AFTER all plaintext config (c, d) so it can patch the final state.
  //    Skills, op wrapper, and exec-approvals are installed by `claw provision workspace`.
  if (resolvedMap?.length) {
    onLine?.("Migrating infrastructure secrets to file provider...");
    await patchMainConfig(driver, vmName, resolvedMap, config, onLine);
    await patchAuthProfiles(driver, vmName, resolvedMap, provider.type, onLine);
    onLine?.("Infrastructure secrets migrated — no plaintext on mount");
  }

  // g) Resolve Tailscale URL and set allowedOrigins (before daemon restart so
  //    the restart picks up both tailscale.mode and allowedOrigins together,
  //    and tailscale serve activates with CORS already configured)
  let tailscaleUrl: string | undefined;
  if (tsMode && tsMode !== "off") {
    const dnsName = await getTailscaleHostname(driver, vmName);
    if (dnsName) {
      tailscaleUrl = `https://${dnsName}`;
      onLine?.(`Tailscale: ${tailscaleUrl}`);

      // Allow the tailnet HTTPS origin in the control UI, otherwise the
      // dashboard served via tailscale serve gets blocked by CORS
      const originsCmd = `openclaw config set gateway.controlUi.allowedOrigins '["${tailscaleUrl}"]'`;
      safeLog(`  ${originsCmd}`);
      const r = await driver.exec(vmName, originsCmd);
      if (r.exitCode !== 0) {
        safeLog(`  Warning: ${originsCmd} failed: ${r.stderr}`);
      }
    }
  }

  // h) Restart daemon to pick up config changes
  onLine?.("Restarting daemon...");
  const restartResult = await driver.exec(vmName, "openclaw daemon restart", onLine);
  if (restartResult.exitCode !== 0) {
    onLine?.(`Warning: daemon restart failed: ${restartResult.stderr}`);
  }

  // i) Run openclaw doctor (non-fatal)
  onLine?.("Running openclaw doctor...");
  const doctorResult = await driver.exec(vmName, "openclaw doctor", onLine);
  const doctorPassed = doctorResult.exitCode === 0;
  if (!doctorPassed) {
    onLine?.("Warning: openclaw doctor reported issues");
  }

  // j) Send bootstrap prompt to agent (first run only, if configured).
  //    The bootstrap prompt seeds the agent's initial state; re-sending it on
  //    every `clawctl create` would re-run the seeding work each time.
  //    Uses `openclaw agent --message` inside the VM — simpler and more reliable
  //    than hitting the gateway HTTP API from the host.
  if (!alreadyOnboarded && config.bootstrap) {
    const prompt =
      typeof config.bootstrap === "string"
        ? config.bootstrap
        : generateBootstrapPrompt(config.bootstrap);

    onLine?.("Sending bootstrap prompt to agent...");
    const escaped = prompt.replace(/'/g, "'\\''");
    const agentResult = await driver.exec(
      vmName,
      `openclaw agent --agent main --message '${escaped}'`,
      onLine,
    );
    if (agentResult.exitCode === 0) {
      onLine?.("Bootstrap prompt completed");
    } else {
      onLine?.(`Warning: bootstrap prompt failed (exit ${agentResult.exitCode})`);
    }
  }

  // k) Run bootstrap-phase capability hooks (AGENTS.md sections etc.)
  //    Runs after the bootstrap prompt — the agent's first run populates the
  //    base AGENTS.md, and capabilities append their managed sections to it.
  onLine?.("Running bootstrap provisioning...");
  const bootstrapProvResult = await driver.exec(
    vmName,
    `${CLAW_BIN_PATH} provision bootstrap --json`,
    onLine,
  );
  if (bootstrapProvResult.exitCode !== 0) {
    onLine?.(`Warning: bootstrap provisioning failed: ${bootstrapProvResult.stderr}`);
  }

  // l) Return result
  const hostPort = config.network?.gatewayPort ?? GATEWAY_PORT;
  const dashboardUrl = `http://localhost:${hostPort}`;
  return {
    gatewayToken,
    dashboardUrl,
    tailscaleUrl,
    doctorPassed,
  };
}

// ---------------------------------------------------------------------------
// Channel command generation
// ---------------------------------------------------------------------------

/** Serialize a config value for `openclaw config set`. */
function serializeConfigValue(value: unknown): string {
  if (typeof value === "string") return `"${value}"`;
  if (typeof value === "boolean" || typeof value === "number") return String(value);
  return `'${JSON.stringify(value)}'`;
}

/**
 * Walk a config object and generate `openclaw config set` commands for each leaf.
 * Arrays and plain objects are JSON-encoded as single values.
 */
function configToCommands(prefix: string, obj: Record<string, unknown>): string[] {
  const cmds: string[] = [];
  for (const [key, value] of Object.entries(obj)) {
    const path = `${prefix}.${key}`;
    if (value === null || value === undefined) continue;
    if (Array.isArray(value) || typeof value !== "object") {
      cmds.push(`openclaw config set ${path} ${serializeConfigValue(value)}`);
    } else {
      // Nested object — recurse
      cmds.push(...configToCommands(path, value as Record<string, unknown>));
    }
  }
  return cmds;
}

/**
 * Build the full list of `openclaw config set` commands for a channel.
 *
 * 1. Enable the channel and its plugin
 * 2. Set each config field from the channel config object
 * 3. Run channel-specific postCommands (e.g., Telegram's dmPolicy after allowFrom)
 */
function buildChannelCommands(
  channelName: string,
  channelConfig: Record<string, unknown>,
): string[] {
  const def: ChannelDef | undefined = CHANNEL_REGISTRY[channelName];
  const pluginName = def?.pluginName ?? channelName;
  const enabled = channelConfig.enabled !== false;
  const cmds: string[] = [
    `openclaw config set channels.${channelName}.enabled ${enabled}`,
    `openclaw config set plugins.entries.${pluginName}.enabled ${enabled}`,
  ];

  // Keys handled by postCommands — skipped by the generic loop
  const postHandledKeys = new Set(def?.postCommands?.handledKeys ?? []);

  // Apply config fields (skip enabled + postCommands-handled keys)
  for (const [key, value] of Object.entries(channelConfig)) {
    if (key === "enabled") continue;
    if (postHandledKeys.has(key)) continue;
    if (value === null || value === undefined) continue;
    const path = `channels.${channelName}.${key}`;
    if (Array.isArray(value) || typeof value !== "object") {
      cmds.push(`openclaw config set ${path} ${serializeConfigValue(value)}`);
    } else {
      cmds.push(...configToCommands(path, value as Record<string, unknown>));
    }
  }

  // Channel-specific post commands (e.g., Telegram dmPolicy after allowFrom)
  if (def?.postCommands) {
    cmds.push(...def.postCommands.run(channelConfig));
  }

  return cmds;
}

/**
 * Collect all secret values from channel configs for log redaction.
 */
function collectChannelSecrets(config: InstanceConfig): string[] {
  const secrets: string[] = [];
  if (config.channels) {
    for (const [channelName, channelConfig] of Object.entries(config.channels)) {
      const def = CHANNEL_REGISTRY[channelName];
      if (!def) continue;
      for (const field of def.configDef.fields) {
        if (!field.secret) continue;
        const value = channelConfig[field.path as string];
        if (typeof value === "string" && value) secrets.push(value);
      }
    }
  }
  return secrets;
}
