import React, { useEffect, useRef } from "react";
import { Text, Box, useApp } from "ink";
import { StepIndicator } from "../components/step-indicator.js";
import type { VMConfig } from "@clawctl/types";
import { GATEWAY_PORT } from "@clawctl/types";
import type { VMDriver } from "@clawctl/host-core";
import { BIN_NAME } from "@clawctl/host-core";

export interface FinishResult {
  action: "finish";
  vmName: string;
  projectDir: string;
  tailscaleMode?: "off" | "serve" | "funnel";
}

interface FinishProps {
  driver: VMDriver;
  config: VMConfig;
  onboardSkipped?: boolean;
  tailscaleMode?: "off" | "serve" | "funnel";
}

export function Finish({ config, onboardSkipped, tailscaleMode }: FinishProps) {
  const { exit } = useApp();
  const exited = useRef(false);

  useEffect(() => {
    if (!exited.current) {
      exited.current = true;
      exit({
        action: "finish",
        vmName: config.vmName,
        projectDir: config.projectDir,
        tailscaleMode,
      } as FinishResult);
    }
  }, []);
  return (
    <Box flexDirection="column">
      <StepIndicator current={9} total={9} label="Done!" />

      <Box flexDirection="column" marginLeft={2} marginBottom={1}>
        <Text bold color="green">
          {onboardSkipped
            ? "Your OpenClaw gateway is ready. Onboarding was skipped."
            : "Your OpenClaw gateway is ready!"}
        </Text>
      </Box>

      <Box flexDirection="column" marginLeft={4}>
        {onboardSkipped ? (
          <>
            <Text dimColor># Run OpenClaw onboarding</Text>
            <Text color="cyan">{BIN_NAME} oc onboard --install-daemon</Text>
            <Text> </Text>
          </>
        ) : (
          <>
            <Text dimColor># Access dashboard</Text>
            <Text>http://localhost:{GATEWAY_PORT}</Text>
            <Text> </Text>
          </>
        )}

        <Text dimColor># Enter the VM</Text>
        <Text color="cyan">{BIN_NAME} shell</Text>
        <Text> </Text>

        <Text dimColor># Enable tab completions: {BIN_NAME} completions --help</Text>
      </Box>
    </Box>
  );
}
