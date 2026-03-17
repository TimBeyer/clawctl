import React, { useState, useEffect, useCallback, useContext } from "react";
import { Text, Box, useInput } from "ink";
import { Spinner } from "./spinner.js";
import { LogOutput } from "./log-output.js";
import { VerboseContext } from "../hooks/verbose-context.js";
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
  const verbose = useContext(VerboseContext);
  const [stages, setStages] = useState<Map<HeadlessStage, StageInfo>>(() => new Map());
  const [steps, setSteps] = useState<string[]>([]);
  const [logs, setLogs] = useState<string[]>([]);
  const [showLogs, setShowLogs] = useState(verbose);

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

  return (
    <Box flexDirection="column">
      <Box borderStyle="round" borderColor="cyan" paddingX={2} flexDirection="column">
        <Text bold> Provisioning: {config.name}</Text>
      </Box>

      <Box flexDirection="column" marginTop={1} marginLeft={2}>
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

      {steps.length > 0 && (
        <Box flexDirection="column" marginTop={1} marginLeft={4}>
          {steps.slice(-5).map((step, i) => (
            <Text key={i} dimColor>
              {"\u2500"} {step}
            </Text>
          ))}
        </Box>
      )}

      {showLogs && logs.length > 0 && (
        <Box
          flexDirection="column"
          borderStyle="round"
          borderColor="gray"
          marginTop={1}
          paddingX={1}
        >
          <Text bold dimColor>
            {" "}
            Log
          </Text>
          <LogOutput lines={logs} maxLines={8} />
        </Box>
      )}

      <Box marginTop={1} marginLeft={2}>
        <Text dimColor>[v] {showLogs ? "hide" : "show"} logs</Text>
      </Box>
    </Box>
  );
}
