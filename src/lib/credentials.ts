import type { VMDriver, OnLine } from "../drivers/types.js";
import { getTailscaleHostname } from "./tailscale.js";

export interface OpResult {
  valid: boolean;
  account?: string;
  error?: string;
}

export interface TailscaleResult {
  connected: boolean;
  hostname?: string;
  error?: string;
}

/** Validate and persist a 1Password service account token in the VM. */
export async function setupOnePassword(
  driver: VMDriver,
  vmName: string,
  serviceAccountToken: string,
  onLine?: OnLine,
): Promise<OpResult> {
  const result = await driver.exec(
    vmName,
    `OP_SERVICE_ACCOUNT_TOKEN="${serviceAccountToken}" op whoami --format json`,
    onLine,
  );

  if (result.exitCode !== 0) {
    return { valid: false, error: "Token validation failed: " + result.stderr };
  }

  let account = "validated";
  try {
    const info = JSON.parse(result.stdout);
    account = info.name || info.email || "validated";
  } catch {
    // stdout wasn't JSON — that's fine, token still validated
  }

  // Persist token in VM (secrets dir — off-mount, never sandboxed).
  // The op wrapper script (installed during bootstrap) reads from this file
  // for the agent's exec environment.
  await driver.exec(
    vmName,
    `mkdir -p ~/.openclaw/secrets && chmod 700 ~/.openclaw/secrets && echo '${serviceAccountToken}' > ~/.openclaw/secrets/op-token && chmod 600 ~/.openclaw/secrets/op-token`,
  );
  // Also export in ~/.profile so driver.exec (bash -lc) can resolve op://
  // references during provisioning — the wrapper isn't installed yet at
  // this point in the flow. Inlined from helpers.sh ensure_in_profile.
  await driver.exec(
    vmName,
    `LINE='export OP_SERVICE_ACCOUNT_TOKEN="${serviceAccountToken}"'; grep -qF "$LINE" ~/.profile 2>/dev/null || echo "$LINE" >> ~/.profile; [ -f ~/.bash_profile ] && { grep -qF "$LINE" ~/.bash_profile 2>/dev/null || echo "$LINE" >> ~/.bash_profile; }`,
  );

  return { valid: true, account };
}

/** Connect the VM to Tailscale using an auth key (non-interactive). */
export async function setupTailscale(
  driver: VMDriver,
  vmName: string,
  authKey: string,
  onLine?: OnLine,
): Promise<TailscaleResult> {
  const result = await driver.exec(
    vmName,
    `sudo tailscale up --accept-dns=false --authkey="${authKey}"`,
    onLine,
  );

  if (result.exitCode !== 0) {
    return { connected: false, error: "Tailscale connection failed: " + result.stderr };
  }

  const hostname = (await getTailscaleHostname(driver, vmName)) ?? "connected";
  return { connected: true, hostname };
}

/** Connect the VM to Tailscale interactively (no auth key). */
export async function connectTailscaleInteractive(
  driver: VMDriver,
  vmName: string,
  onLine?: OnLine,
): Promise<TailscaleResult> {
  const result = await driver.exec(vmName, "sudo tailscale up --accept-dns=false", onLine);

  if (result.exitCode !== 0) {
    return { connected: false, error: "Tailscale connection failed: " + result.stderr };
  }

  const hostname = (await getTailscaleHostname(driver, vmName)) ?? "connected";
  return { connected: true, hostname };
}
