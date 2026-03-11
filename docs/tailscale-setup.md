# Tailscale Setup

Tailscale provides a WireGuard-based mesh VPN that lets you access the OpenClaw dashboard from any device on your tailnet without exposing ports to the public internet.

## How It Works

The VM runs a Tailscale client that joins your tailnet. Once connected, the VM gets a stable IP address (100.x.y.z) and a DNS name (e.g., `openclaw.tail1234.ts.net`). You can then access the OpenClaw dashboard at `http://openclaw.tail1234.ts.net:18789` from any device on the same tailnet.

## Connecting During the Wizard

During Step 6 (Credentials), the wizard asks:

```
? Set up Tailscale now? [Y/n]
```

If you select yes, it runs inside the VM:

```bash
sudo tailscale up --accept-dns=false
```

The `--accept-dns=false` flag prevents Tailscale from overriding the VM's DNS configuration, which can interfere with package installation and other network operations.

On success, the wizard displays the Tailscale DNS name assigned to the VM.

## Manual Setup

If you skip Tailscale during the wizard, connect manually:

```bash
limactl shell <vmName>
sudo tailscale up --accept-dns=false
```

Check status:

```bash
tailscale status
```

## Auth Keys

Tailscale normally requires interactive browser-based authentication. For automated or headless setups, use an auth key:

```bash
sudo tailscale up --authkey=tskey-auth-xxxx --accept-dns=false
```

### Creating an Auth Key

1. Go to [Tailscale Admin Console](https://login.tailscale.com/admin/settings/keys).
2. Click **Generate auth key**.
3. Choose the key type:

| Type           | Behavior                                             | Use case                               |
| -------------- | ---------------------------------------------------- | -------------------------------------- |
| **Reusable**   | Can authenticate multiple devices                    | Development, recreating VMs frequently |
| **Single-use** | One device only, then invalidated                    | Production, one-time setup             |
| **Ephemeral**  | Device is automatically removed when it goes offline | Temporary test VMs                     |

For development VMs that you rebuild often, a **reusable** key is most convenient. Set an expiry (e.g., 90 days) and regenerate when needed.

4. Optionally pre-approve the key so devices do not require manual approval.
5. Copy the key (starts with `tskey-auth-`).

## ACL Configuration for Dashboard Access

By default, devices on your tailnet can reach each other on all ports. If you use Tailscale ACLs, make sure port 18789 is allowed (or port 443 if using serve mode — see [Gateway Integration](#gateway-integration) below).

In the Tailscale ACL editor (Admin Console > Access Controls), ensure a rule like:

```json
{
  "acls": [
    {
      "action": "accept",
      "src": ["autogroup:member"],
      "dst": ["autogroup:self:18789"]
    }
  ]
}
```

Or more permissively, to allow all traffic between your devices:

```json
{
  "acls": [
    {
      "action": "accept",
      "src": ["autogroup:member"],
      "dst": ["autogroup:self:*"]
    }
  ]
}
```

If you have not customized your ACLs, the default Tailscale policy allows all traffic between your devices, so no changes are needed.

## Accessing the Dashboard

Once Tailscale is connected and OpenClaw is onboarded:

### From the host Mac (local)

The lima.yaml port forward maps guest port 18789 to the configured host port (default 18789):

```
http://localhost:18789
```

### From another device on your tailnet

Use the Tailscale IP or DNS name:

```
http://100.x.y.z:18789
http://<vmname>.tail1234.ts.net:18789
```

With serve mode enabled, access via HTTPS instead (see [Gateway Integration](#gateway-integration)):

```
https://<vmname>.tail1234.ts.net
```

Find the VM's Tailscale IP with:

```bash
limactl shell <vmName> -- tailscale ip -4
```

## DNS

Tailscale assigns each device a MagicDNS name based on the machine hostname and your tailnet domain. The VM's hostname is typically set by Lima to match the VM name.

If you want a custom name:

```bash
sudo tailscale up --hostname=my-openclaw-vm --accept-dns=false
```

This makes the VM reachable at `my-openclaw-vm.tail1234.ts.net`.

## Gateway Integration

OpenClaw natively supports Tailscale gateway modes that provide HTTPS and
optional tokenless dashboard auth via `tailscale serve` or `tailscale funnel`.

### Modes

| Mode       | What it does                                                                                                                           |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| **off**    | Gateway on loopback only. Raw `http://100.x.y.z:18789` via tailnet.                                                                    |
| **serve**  | `tailscale serve` reverse-proxies gateway → HTTPS on tailnet. Tokenless dashboard (Tailscale identity headers). API still needs token. |
| **funnel** | `tailscale funnel` exposes gateway publicly via HTTPS. Requires `auth.mode: "password"`. Ports 443/8443/10000 only.                    |

### Serve mode (recommended)

When Tailscale is configured, clawctl defaults to **serve** mode. This gives you:

- **HTTPS on your tailnet**: `https://<vmname>.tail1234.ts.net`
- **Tokenless dashboard auth**: Tailscale identity headers authenticate you automatically
- **API still token-gated**: programmatic access still requires the gateway token

Serve mode requires HTTPS to be enabled on your tailnet in the
[Tailscale admin console](https://login.tailscale.com/admin/dns) (DNS > HTTPS Certificates).

With serve mode, ACLs should allow port 443 (not 18789), since `tailscale serve`
proxies through the standard HTTPS port:

```json
{
  "acls": [
    {
      "action": "accept",
      "src": ["autogroup:member"],
      "dst": ["autogroup:self:443"]
    }
  ]
}
```

### Funnel mode (headless only)

Funnel exposes the gateway to the public internet via Tailscale's infrastructure.
Because it's public, it requires password auth instead of token auth. clawctl
reuses the gateway token as the password.

Funnel is only available via headless config (not the interactive wizard):

```json
{
  "network": {
    "tailscale": {
      "authKey": "tskey-auth-...",
      "mode": "funnel"
    }
  }
}
```

Funnel requires:

- MagicDNS enabled
- HTTPS certificates enabled
- ACL policy allowing funnel (see [Tailscale funnel docs](https://tailscale.com/kb/1223/funnel))

### Off mode

Set `"mode": "off"` to disable gateway integration while keeping the Tailscale
network connection. The dashboard is accessible only via raw HTTP on the
Tailscale IP.

## Troubleshooting

**"tailscale up" hangs**: It may be waiting for browser authentication. Use an auth key for headless setups or open the URL it prints.

**Cannot reach VM from other devices**: Check `tailscale status` on both devices to confirm they are on the same tailnet. Check ACLs if customized.

**DNS not resolving**: If `--accept-dns=false` is set (recommended), MagicDNS names will not resolve from inside the VM. Use Tailscale IPs inside the VM, or use MagicDNS names only from external devices.
