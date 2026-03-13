import { BIN_NAME } from "../lib/bin-name.js";
import { generateBashCompletion, generateZshCompletion } from "../templates/completions/index.js";

export async function runCompletions(shell: string): Promise<void> {
  let script: string;
  let rcFile: string;

  switch (shell) {
    case "bash":
      script = generateBashCompletion(BIN_NAME);
      rcFile = "~/.bashrc";
      break;
    case "zsh":
      script = generateZshCompletion(BIN_NAME);
      rcFile = "~/.zshrc";
      break;
    default:
      console.error(`Unsupported shell: ${shell}`);
      console.error("Supported shells: bash, zsh");
      process.exit(1);
  }

  // Print the script to stdout (for eval or piping)
  process.stdout.write(script);

  // Print install instructions to stderr (so they don't contaminate piped output)
  if (process.stderr.isTTY) {
    process.stderr.write(`\n# Add this to ${rcFile}:\n`);
    process.stderr.write(`#   eval "$(${BIN_NAME} completions ${shell})"\n`);
  }
}
