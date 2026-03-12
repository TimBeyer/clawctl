import { writeFile, unlink } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";
import { execa } from "execa";
import { exec, execWithLogs } from "../lib/exec.js";
import { installFormula, isFormulaInstalled } from "../lib/homebrew.js";
import { parseLimaVersion } from "../lib/parse.js";
import { generateLimaYaml } from "../templates/lima-yaml.js";
import type { VMConfig } from "../types.js";
import type { VMDriver, VMCreateOptions, ExecResult, OnLine } from "./types.js";

export class LimaDriver implements VMDriver {
  readonly name = "lima";

  async create(config: VMConfig, options: VMCreateOptions = {}, onLine?: OnLine): Promise<void> {
    const yaml = generateLimaYaml(config, options);
    const configPath = join(tmpdir(), `clawctl-lima-${config.vmName}.yaml`);
    await writeFile(configPath, yaml);
    onLine?.("Generated lima.yaml");

    const args = ["start", "--name", config.vmName, "--tty=false", configPath];
    const opts = { timeout: 600_000 };

    try {
      if (onLine) {
        const result = await execWithLogs("limactl", args, onLine, opts);
        if (result.exitCode !== 0) {
          throw new Error(`Failed to create VM: ${result.stderr}`);
        }
      } else {
        const result = await exec("limactl", args, opts);
        if (result.exitCode !== 0) {
          throw new Error(`Failed to create VM: ${result.stderr}`);
        }
      }
    } finally {
      await unlink(configPath).catch(() => {});
    }
  }

  async start(name: string): Promise<void> {
    const result = await exec("limactl", ["start", name], {
      timeout: 300_000,
    });
    if (result.exitCode !== 0) {
      throw new Error(`Failed to start VM: ${result.stderr}`);
    }
  }

  async stop(name: string): Promise<void> {
    const result = await exec("limactl", ["stop", name]);
    if (result.exitCode !== 0) {
      throw new Error(`Failed to stop VM: ${result.stderr}`);
    }
  }

  async delete(name: string): Promise<void> {
    const result = await exec("limactl", ["delete", "--force", name]);
    if (result.exitCode !== 0) {
      throw new Error(`Failed to delete VM: ${result.stderr}`);
    }
  }

  async exists(name: string): Promise<boolean> {
    const result = await exec("limactl", ["list", "--json"]);
    if (result.exitCode !== 0) return false;
    try {
      const lines = result.stdout.trim().split("\n");
      for (const line of lines) {
        const vm = JSON.parse(line);
        if (vm.name === name) return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  async status(name: string): Promise<"Running" | "Stopped" | "Unknown"> {
    const result = await exec("limactl", ["list", "--json"]);
    if (result.exitCode !== 0) return "Unknown";
    try {
      const lines = result.stdout.trim().split("\n");
      for (const line of lines) {
        const vm = JSON.parse(line);
        if (vm.name === name) return vm.status;
      }
      return "Unknown";
    } catch {
      return "Unknown";
    }
  }

  async exec(name: string, command: string, onLine?: OnLine): Promise<ExecResult> {
    const args = ["shell", "--workdir", "/tmp", name, "bash", "-lc", command];
    if (onLine) {
      return execWithLogs("limactl", args, onLine);
    }
    return exec("limactl", args);
  }

  async execInteractive(name: string, command: string): Promise<{ exitCode: number }> {
    const result = await execa(
      "limactl",
      ["shell", "--workdir", "/tmp", name, "bash", "-lc", command],
      {
        stdio: "inherit",
        reject: false,
      },
    );
    return { exitCode: result.exitCode ?? 1 };
  }

  async runScript(
    name: string,
    scriptPath: string,
    asRoot: boolean = false,
    onLine?: OnLine,
  ): Promise<ExecResult> {
    const args = ["shell", "--workdir", "/tmp", name];
    if (asRoot) {
      args.push("sudo");
    }
    args.push("bash", scriptPath);
    if (onLine) {
      return execWithLogs("limactl", args, onLine, { timeout: 600_000 });
    }
    return exec("limactl", args, { timeout: 600_000 });
  }

  async copy(name: string, localPath: string, remotePath: string): Promise<void> {
    const result = await exec("limactl", ["copy", localPath, `${name}:${remotePath}`]);
    if (result.exitCode !== 0) {
      throw new Error(`Failed to copy to VM: ${result.stderr}`);
    }
  }

  async isInstalled(): Promise<boolean> {
    const result = await exec("limactl", ["--version"]);
    return result.exitCode === 0;
  }

  async install(onLine?: OnLine): Promise<string> {
    const alreadyInstalled = await isFormulaInstalled("lima");
    if (!alreadyInstalled) {
      await installFormula("lima", onLine);
    }
    const ver = await this.version();
    if (!ver) {
      throw new Error("Lima installed but version could not be determined");
    }
    return ver;
  }

  async version(): Promise<string | undefined> {
    const result = await exec("limactl", ["--version"]);
    if (result.exitCode !== 0) return undefined;
    return parseLimaVersion(result.stdout);
  }

  async shell(name: string): Promise<{ exitCode: number }> {
    const result = await execa("limactl", ["shell", "--workdir", "~", name], {
      stdio: "inherit",
      reject: false,
    });
    return { exitCode: result.exitCode ?? 1 };
  }

  shellCommand(name: string): string {
    return `limactl shell ${name}`;
  }
}
