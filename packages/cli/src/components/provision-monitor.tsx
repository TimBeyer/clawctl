import React, { useState, useEffect, useCallback } from "react";
import { Text, Box, useInput } from "ink";
import { Spinner } from "./spinner.js";
import { LogOutput } from "./log-output.js";
import { useTerminalSize } from "../hooks/use-terminal-size.js";
import type { VMDriver } from "@clawctl/host-core";
import { runHeadlessFromConfig } from "@clawctl/host-core";
import type {
  HeadlessResult,
  HeadlessCallbacks,
  HeadlessStage,
  StageStatus,
} from "@clawctl/host-core";
import type { InstanceConfig } from "@clawctl/types";

interface StageInfo {
  label: string;
  status: StageStatus;
  detail?: string;
}

const STAGE_LABELS: Record<HeadlessStage, string> = {
  prereqs: "Prerequisites",
  provision: "Provisioning VM",
  verify: "Verifying installation",
  onepassword: "Setting up 1Password",
  secrets: "Resolving secrets",
  tailscale: "Connecting Tailscale",
  bootstrap: "Bootstrapping OpenClaw",
  done: "Complete",
};

interface ProvisionMonitorProps {
  driver: VMDriver;
  config: InstanceConfig;
  onComplete: (result: HeadlessResult) => void;
  onError: (error: Error) => void;
}

export function ProvisionMonitor({ driver, config, onComplete, onError }: ProvisionMonitorProps) {
  const { rows } = useTerminalSize();
  const [stages, setStages] = useState<Map<HeadlessStage, StageInfo>>(() => new Map());
  const [steps, setSteps] = useState<string[]>([]);
  const [logs, setLogs] = useState<string[]>([]);
  const [showLogs, setShowLogs] = useState(true);

  useInput((input) => {
    if (input === "v") setShowLogs((s) => !s);
  });

  const onStage = useCallback((stage: HeadlessStage, status: StageStatus, detail?: string) => {
    setStages((prev) => {
      const next = new Map(prev);
      next.set(stage, { label: STAGE_LABELS[stage], status, detail });
      return next;
    });
  }, []);

  const onStep = useCallback((label: string) => {
    setSteps((prev) => [...prev, label]);
  }, []);

  const onLine = useCallback((_prefix: string, message: string) => {
    setLogs((prev) => [...prev, message]);
  }, []);

  const onCbError = useCallback((_stage: HeadlessStage, error: string) => {
    setLogs((prev) => [...prev, `ERROR: ${error}`]);
  }, []);

  useEffect(() => {
    const callbacks: HeadlessCallbacks = {
      onStage,
      onStep,
      onLine,
      onError: onCbError,
    };

    runHeadlessFromConfig(driver, config, callbacks).then(onComplete).catch(onError);
  }, []);

  // Determine which stages are relevant for this config
  const activeStages: HeadlessStage[] = [
    "prereqs",
    "provision",
    "verify",
    ...(config.services?.onePassword ? ["onepassword" as HeadlessStage] : []),
    ...(config.network?.tailscale ? ["tailscale" as HeadlessStage] : []),
    ...(config.provider ? ["bootstrap" as HeadlessStage] : []),
  ];

  // The status panel: header(1) + stages + 2 extra rows for steps overflow.
  const statusHeight = 1 + activeStages.length + 2;

  // Compute dynamic maxLines for the log viewer:
  // header border(3) + margin(1) + statusHeight + margin(1) + log border(3) + help(1)
  const fixed = 3 + 1 + statusHeight + 1 + 3 + 1;
  const maxLines = Math.max(3, rows - fixed);

  // Show the most recent steps that fit (statusHeight - 1 for header)
  const maxSteps = Math.max(1, statusHeight - 1);
  const visibleSteps = steps.slice(-maxSteps);

  return (
    <Box flexDirection="column" flexGrow={1}>
      <Box borderStyle="round" borderColor="cyan" paddingX={2} flexDirection="column">
        <Text bold> Provisioning: {config.name}</Text>
      </Box>

      {/* Stages (left) + Steps (right) side by side */}
      <Box marginTop={1} height={statusHeight}>
        {/* Stages column — 50/50 split */}
        <Box flexDirection="column" marginLeft={2} flexGrow={1} flexBasis={0} overflow="hidden">
          <Text dimColor bold>
            Stages
          </Text>
          {activeStages.map((stageId) => {
            const info = stages.get(stageId);
            const status = info?.status ?? "pending";
            const label = STAGE_LABELS[stageId];
            const detail = info?.detail;

            return (
              <Box key={stageId}>
                {status === "done" ? (
                  <Text color="green">{"\u2713"} </Text>
                ) : status === "running" ? (
                  <Spinner label="" />
                ) : status === "error" ? (
                  <Text color="red">{"\u2717"} </Text>
                ) : (
                  <Text dimColor>{"\u25cb"} </Text>
                )}
                <Text bold={status === "running"} dimColor={status === "pending"}>
                  {label}
                </Text>
                {detail && status === "done" && <Text dimColor> {detail}</Text>}
              </Box>
            );
          })}
        </Box>

        {/* Steps column — 50/50 split, scrolls within fixed height */}
        <Box flexDirection="column" marginLeft={2} flexGrow={1} flexBasis={0}>
          <Text dimColor bold>
            Steps
          </Text>
          <Box flexDirection="column" flexGrow={1} overflow="hidden">
            {visibleSteps.map((step, i) => (
              <Text key={i} dimColor>
                {"\u2500"} {step}
              </Text>
            ))}
          </Box>
        </Box>
      </Box>

      {showLogs && logs.length > 0 ? (
        <Box
          flexDirection="column"
          flexGrow={1}
          borderStyle="round"
          borderColor="gray"
          marginTop={1}
          paddingX={1}
        >
          <Text bold dimColor>
            {" "}
            Log
          </Text>
          <LogOutput lines={logs} maxLines={maxLines} />
        </Box>
      ) : (
        <Box flexGrow={1} />
      )}

      <Box marginLeft={2}>
        <Text dimColor>[v] {showLogs ? "hide" : "show"} logs</Text>
      </Box>
    </Box>
  );
}
