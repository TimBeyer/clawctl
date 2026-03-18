import { execa } from "execa";
import { checkForUpdate, downloadAndReplace, applyVmUpdates } from "@clawctl/host-core";
import pkg from "../../../../package.json";

export async function runUpdate(opts: { applyVm?: boolean }): Promise<void> {
  if (opts.applyVm) {
    // Internal mode: called by the NEW binary after self-replacement
    console.log("Updating VMs with new claw binary...");
    const results = await applyVmUpdates();
    for (const r of results) {
      const icon = r.status === "updated" ? "\u2713" : r.status === "pending" ? "\u25cb" : "\u00d7";
      console.log(`  ${icon} ${r.name}: ${r.detail ?? r.status}`);
    }
    const updated = results.filter((r) => r.status === "updated").length;
    const pending = results.filter((r) => r.status === "pending").length;
    if (results.length === 0) {
      console.log("No instances registered.");
    } else {
      console.log(`\n${updated} updated, ${pending} pending.`);
    }
    return;
  }

  // Dev mode: running via bun, not a compiled binary — can't self-update
  if (process.execPath.endsWith("/bun")) {
    console.log("Dev mode detected — self-update is not available.");
    console.log("Build a release binary with `bun run build` to use auto-update.");
    return;
  }

  // Normal mode: check + download + re-exec
  console.log(`Current version: v${pkg.version}`);
  const update = await checkForUpdate(pkg.version);

  if (!update || !update.available) {
    console.log(`clawctl is up to date (v${pkg.version}).`);
    return;
  }

  console.log(`New version available: v${update.version}`);
  console.log("Downloading...");
  await downloadAndReplace(update.assetUrl!);
  console.log("Binary updated. Applying VM updates...");

  // Spawn the NEW binary to handle VM updates (it has the new embedded claw)
  await execa(process.execPath, ["update", "--apply-vm"], { stdio: "inherit" });
}
