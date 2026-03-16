import type { ProvisionContext, ProvisionResult } from "@clawctl/types";

const HOMEBREW_INSTALL_URL = "https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh";
const BREW_SHELLENV = 'eval "$(/home/linuxbrew/.linuxbrew/bin/brew shellenv)"';

/** Install Homebrew and configure the shell profile. */
export async function provision(ctx: ProvisionContext): Promise<ProvisionResult> {
  try {
    if (await ctx.commandExists("brew")) {
      ctx.log("Homebrew already installed");
      // Still ensure profile entry
      await ctx.profile.ensureInProfile(BREW_SHELLENV);
      return { name: "homebrew", status: "unchanged" };
    }

    ctx.log("Installing Homebrew...");
    const tmpScript = "/tmp/brew-install.sh";
    await ctx.net.downloadFile(HOMEBREW_INSTALL_URL, tmpScript);
    try {
      const result = await ctx.exec("bash", [tmpScript], {
        env: { ...process.env, NONINTERACTIVE: "1" },
      });
      if (result.exitCode !== 0) {
        throw new Error(`Homebrew install failed: ${result.stderr}`);
      }
    } finally {
      await ctx.fs.rm(tmpScript, { force: true });
    }
    await ctx.profile.ensureInProfile(BREW_SHELLENV);
    ctx.log("Homebrew installed");
    return { name: "homebrew", status: "installed" };
  } catch (err) {
    return { name: "homebrew", status: "failed", error: String(err) };
  }
}
