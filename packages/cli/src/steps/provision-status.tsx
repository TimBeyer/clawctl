import React, { useState, useEffect } from "react";
import { Text, Box } from "ink";
import { StepIndicator } from "../components/step-indicator.js";
import { LogOutput } from "../components/log-output.js";
import { useVerbose } from "../hooks/verbose-context.js";
import { useProcessLogs } from "../hooks/use-process-logs.js";
import type { VMConfig } from "@clawctl/types";
import type { VMDriver } from "@clawctl/host-core";
import type { ProvisioningStep } from "../types.js";
import { verifyProvisioning } from "@clawctl/host-core";

interface ProvisionStatusProps {
  driver: VMDriver;
  config: VMConfig;
  onComplete: () => void;
}

export function ProvisionStatus({ driver, config, onComplete }: ProvisionStatusProps) {
  const verbose = useVerbose();
  const { lines: processLogs, addLine: addLog } = useProcessLogs();
  const [steps, setSteps] = useState<ProvisioningStep[]>([
    { label: "Node.js 22", status: "pending" },
    { label: "Tailscale", status: "pending" },
    { label: "Homebrew", status: "pending" },
    { label: "1Password CLI", status: "pending" },
    { label: "OpenClaw", status: "pending" },
  ]);
  const [error, setError] = useState<string>();

  useEffect(() => {
    async function verify() {
      try {
        // Mark all as running
        setSteps((prev) => prev.map((s) => ({ ...s, status: "running" as const })));

        const results = await verifyProvisioning(driver, config.vmName, addLog);

        const newSteps: ProvisioningStep[] = results.map((r) => ({
          label: r.label,
          status: r.passed ? ("done" as const) : ("error" as const),
          error: r.error,
        }));
        setSteps(newSteps);

        const allPassed = results.every((r) => r.passed);
        if (allPassed) {
          setTimeout(() => onComplete(), 500);
        } else {
          setError("Some tools failed to install. Re-run provisioning or check VM logs.");
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      }
    }
    verify();
  }, []);

  const StatusIcon = ({ s }: { s: ProvisioningStep }) => {
    switch (s.status) {
      case "done":
        return <Text color="green">✓</Text>;
      case "error":
        return <Text color="red">✗</Text>;
      case "running":
        return <Text color="cyan">⠸</Text>;
      default:
        return <Text dimColor>○</Text>;
    }
  };

  return (
    <Box flexDirection="column">
      <StepIndicator current={6} total={9} label="Verifying provisioning" />

      <Box flexDirection="column" marginLeft={2}>
        {steps.map((step, i) => (
          <Box key={i}>
            <StatusIcon s={step} />
            <Text>
              {" "}
              {step.label}
              {step.status === "done" && <Text color="green"> installed</Text>}
              {step.error && <Text color="red"> — {step.error}</Text>}
            </Text>
          </Box>
        ))}
        {verbose && processLogs.length > 0 && <LogOutput lines={processLogs} maxLines={15} />}
        {error && <Text color="red">Error: {error}</Text>}
      </Box>
    </Box>
  );
}
