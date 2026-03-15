import { exec } from "./exec.js";
import { writeFile } from "fs/promises";
import { join } from "path";

const GITIGNORE_CONTENT = `# VM state
*.qcow2
*.raw

# Credentials and secrets
.env
.env.secrets
*.token

# OS
.DS_Store

# Config backups (may contain pre-migration plaintext)
data/config.bak*

# Checkpoint signal (ephemeral)
data/.checkpoint-request*
`;

export async function initGitRepo(dir: string): Promise<void> {
  const result = await exec("git", ["init"], { cwd: dir });
  if (result.exitCode !== 0) {
    throw new Error(`Failed to init git repo: ${result.stderr}`);
  }

  await writeFile(join(dir, ".gitignore"), GITIGNORE_CONTENT);

  await exec("git", ["add", "."], { cwd: dir });
  await exec("git", ["commit", "-m", "Initial commit: openclaw VM project"], {
    cwd: dir,
  });
}
