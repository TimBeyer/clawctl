import React, { useState } from "react";
import { Text, Box, useApp, useInput } from "ink";
import { StepIndicator } from "../components/step-indicator.js";
import type { VMConfig } from "../types.js";

interface OnboardProps {
  config: VMConfig;
  tailscaleMode?: "off" | "serve" | "funnel";
  onComplete: (skipped: boolean) => void;
}

export interface OnboardResult {
  action: "onboard";
  vmName: string;
  projectDir: string;
  tailscaleMode?: "off" | "serve" | "funnel";
}

export function Onboard({ config, tailscaleMode, onComplete }: OnboardProps) {
  const { exit } = useApp();
  const [launched, setLaunched] = useState(false);

  useInput((input, key) => {
    if (launched) return;
    if (key.return) {
      setLaunched(true);
      exit({
        action: "onboard",
        vmName: config.vmName,
        projectDir: config.projectDir,
        tailscaleMode,
      } as OnboardResult);
    } else if (input.toLowerCase() === "s") {
      onComplete(true);
    }
  });

  return (
    <Box flexDirection="column">
      <StepIndicator current={7} total={8} label="OpenClaw Onboarding" />

      <Box flexDirection="column" marginLeft={2}>
        <Text>OpenClaw's onboarding wizard will configure your instance.</Text>
        <Text>
          It runs interactively inside the VM — you'll answer a few questions about your provider,
          API keys, and preferences.
        </Text>
        <Text> </Text>
        <Text>
          <Text color="cyan">[Enter]</Text> Start onboarding{"  "}
          <Text color="yellow">[s]</Text> Skip (do it later)
        </Text>
      </Box>
    </Box>
  );
}
