import { randomBytes } from "crypto";
import { mkdir, rm } from "fs/promises";
import { join } from "path";
import type { VMDriver, OnLine } from "./drivers/types.js";
import { GATEWAY_PORT } from "@clawctl/types";
import { buildOnboardCommand } from "./providers.js";
import { patchMainConfig, patchAuthProfiles } from "./infra-secrets.js";
import { generateBootstrapPrompt } from "@clawctl/templates";
import { redactSecrets } from "./redact.js";
import { getTailscaleHostname } from "./tailscale.js";
import type { InstanceConfig } from "@clawctl/types";
import type { ResolvedSecretRef } from "./secrets.js";

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
    const configCheck = await driver.exec(vmName, "test -f /mnt/project/data/config");
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

  // c) Post-onboard config (including gateway token — must be before daemon
  //    restart so the daemon picks it up)
  const gatewayToken = config.network?.gatewayToken ?? randomBytes(24).toString("hex");
  const secrets = [gatewayToken, config.telegram?.botToken].filter(Boolean) as string[];
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
  const tsMode = config.network?.tailscale ? (config.network.tailscale.mode ?? "serve") : undefined;

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

  // d) Telegram setup (plaintext — must run before secret migration)
  if (config.telegram) {
    onLine?.("Configuring Telegram...");
    const tg = config.telegram;
    const tgCmds: string[] = [
      "openclaw config set channels.telegram.enabled true",
      `openclaw config set channels.telegram.botToken "${tg.botToken}"`,
    ];

    // Set allowFrom before dmPolicy — openclaw validates that allowlist
    // mode has at least one sender ID
    if (tg.allowFrom?.length) {
      const allowJson = JSON.stringify(tg.allowFrom);
      tgCmds.push(`openclaw config set channels.telegram.allowFrom '${allowJson}'`);
    }

    tgCmds.push("openclaw config set channels.telegram.dmPolicy allowlist");
    tgCmds.push("openclaw config set plugins.entries.telegram.enabled true");

    if (tg.groups) {
      const groupIds = Object.keys(tg.groups);
      if (groupIds.length > 0) {
        const groupAllowJson = JSON.stringify(groupIds);
        tgCmds.push(`openclaw config set channels.telegram.groupAllowFrom '${groupAllowJson}'`);
      }
      for (const [id, settings] of Object.entries(tg.groups)) {
        if (settings.requireMention !== undefined) {
          tgCmds.push(
            `openclaw config set channels.telegram.groups.${id}.requireMention ${settings.requireMention}`,
          );
        }
      }
    }

    for (const cmd of tgCmds) {
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

  // j) Send bootstrap prompt to agent (if configured)
  //    Uses `openclaw agent --message` inside the VM — simpler and more reliable
  //    than hitting the gateway HTTP API from the host.
  if (config.bootstrap) {
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

  // k) Return result
  const hostPort = config.network?.gatewayPort ?? GATEWAY_PORT;
  const dashboardUrl = `http://localhost:${hostPort}`;
  return {
    gatewayToken,
    dashboardUrl,
    tailscaleUrl,
    doctorPassed,
  };
}
