import React, { useState, useEffect } from "react";
import { Text, Box } from "ink";
import { StepIndicator } from "../components/step-indicator.js";
import { ProcessOutput } from "../components/process-output.js";
import { Spinner } from "../components/spinner.js";
import type { VMConfig } from "../types.js";
import type { VMDriver } from "../drivers/types.js";
import { useVerbose } from "../hooks/verbose-context.js";
import { useProcessLogs } from "../hooks/use-process-logs.js";
import { provisionVM } from "../lib/provision.js";

interface CreateVMProps {
  driver: VMDriver;
  config: VMConfig;
  onComplete: () => void;
}

type Phase = "project-setup" | "generating" | "creating-vm" | "provisioning" | "done" | "error";

export function CreateVM({ driver, config, onComplete }: CreateVMProps) {
  const verbose = useVerbose();
  const { lines: processLogs, addLine: addProcessLog } = useProcessLogs();
  const [phase, setPhase] = useState<Phase>("project-setup");
  const [error, setError] = useState<string>();
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);

  useEffect(() => {
    async function run() {
      try {
        await provisionVM(
          driver,
          config,
          {
            onPhase: (p) => setPhase(p as Phase),
            onStep: (step) => setCompletedSteps((prev) => [...prev, step]),
            onLine: addProcessLog,
          },
          { extraMounts: config.extraMounts },
        );

        setTimeout(() => onComplete(), 500);
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
        setPhase("error");
      }
    }
    run();
  }, []);

  return (
    <Box flexDirection="column">
      <StepIndicator
        current={4}
        total={8}
        label={
          phase === "creating-vm"
            ? "Creating VM..."
            : phase === "provisioning"
              ? "Provisioning VM..."
              : phase === "done"
                ? "VM ready"
                : "Setting up project"
        }
      />

      <Box flexDirection="column" marginLeft={2}>
        {completedSteps.map((step, i) => (
          <Text key={i}>
            <Text color="green">✓</Text> {step}
          </Text>
        ))}

        {phase === "project-setup" && <Spinner label="Creating project directory..." />}
        {phase === "generating" && <Spinner label="Generating configuration files..." />}
        {phase === "creating-vm" && (
          <ProcessOutput
            label={`Creating Lima VM "${config.vmName}"...`}
            logs={processLogs}
            verbose={verbose}
          />
        )}
        {phase === "provisioning" && (
          <ProcessOutput label="Provisioning VM..." logs={processLogs} verbose={verbose} />
        )}
        {phase === "error" && <Text color="red">✗ Error: {error}</Text>}
      </Box>
    </Box>
  );
}
