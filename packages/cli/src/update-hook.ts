import { createInterface } from "readline";
import { execa } from "execa";
import {
  checkForUpdate,
  loadUpdateState,
  saveUpdateState,
  downloadAndReplace,
} from "@clawctl/host-core";

/**
 * Pre-command hook that checks for updates and prompts the user.
 *
 * Returns:
 * - "updated": binary was replaced and VM updates spawned — caller should exit
 * - "skipped": user declined the update
 * - "none": no update available (or dev mode, or error)
 */
export async function checkAndPromptUpdate(
  currentVersion: string,
): Promise<"updated" | "skipped" | "none"> {
  // Dev mode: running via `bun cli.tsx`, not a compiled binary
  if (process.execPath.endsWith("/bun")) return "none";

  const update = await checkForUpdate(currentVersion);
  if (!update || !update.available || !update.version) return "none";

  // Check if this version was already dismissed
  const state = await loadUpdateState();
  if (state.dismissedVersion === update.version) return "none";

  // Prompt the user
  const answer = await prompt(
    `clawctl v${update.version} is available (you have v${currentVersion}). Update? [Y/n] `,
  );

  if (answer.toLowerCase() === "n" || answer.toLowerCase() === "no") {
    await saveUpdateState({ ...state, dismissedVersion: update.version });
    return "skipped";
  }

  // Download and replace
  console.log("Downloading update...");
  await downloadAndReplace(update.assetUrl!);
  console.log("Updated. Applying VM updates...");

  // Spawn the NEW binary for VM updates
  await execa(process.execPath, ["update", "--apply-vm"], { stdio: "inherit" });

  return "updated";
}

function prompt(question: string): Promise<string> {
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}
