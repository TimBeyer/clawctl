import { exec, execWithLogs, commandExists } from "./exec.js";

type OnLine = (line: string) => void;

export async function isHomebrewInstalled(): Promise<boolean> {
  return commandExists("brew");
}

export async function installFormula(formula: string, onLine?: OnLine): Promise<void> {
  if (onLine) {
    const result = await execWithLogs("brew", ["install", formula], onLine);
    if (result.exitCode !== 0) {
      throw new Error(`Failed to install ${formula}: ${result.stderr}`);
    }
  } else {
    const result = await exec("brew", ["install", formula]);
    if (result.exitCode !== 0) {
      throw new Error(`Failed to install ${formula}: ${result.stderr}`);
    }
  }
}

export async function isFormulaInstalled(formula: string): Promise<boolean> {
  const result = await exec("brew", ["list", "--formula", formula]);
  return result.exitCode === 0;
}
