import React, { useState, useEffect } from "react";
import { Text, Box } from "ink";
import { StepIndicator } from "../components/step-indicator.js";
import { ProcessOutput } from "../components/process-output.js";
import { useVerbose } from "../hooks/verbose-context.js";
import { useProcessLogs } from "../hooks/use-process-logs.js";
import type { PrereqStatus } from "../types.js";
import type { VMDriver } from "../drivers/types.js";

interface HostSetupProps {
  driver: VMDriver;
  prereqs: PrereqStatus;
  onComplete: (updatedPrereqs: PrereqStatus) => void;
}

export function HostSetup({ driver, prereqs, onComplete }: HostSetupProps) {
  const verbose = useVerbose();
  const { lines: processLogs, addLine } = useProcessLogs();
  const [status, setStatus] = useState<"installing" | "done" | "error">(
    prereqs.hasVMBackend ? "done" : "installing",
  );
  const [backendVersion, setBackendVersion] = useState(prereqs.vmBackendVersion);
  const [error, setError] = useState<string>();

  useEffect(() => {
    if (prereqs.hasVMBackend) {
      setTimeout(() => onComplete({ ...prereqs }), 300);
      return;
    }

    async function setup() {
      try {
        const version = await driver.install(addLine);
        setBackendVersion(version);
        setStatus("done");
        setTimeout(
          () =>
            onComplete({
              ...prereqs,
              hasVMBackend: true,
              vmBackendVersion: version,
            }),
          500,
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
        setStatus("error");
      }
    }
    setup();
  }, []);

  return (
    <Box flexDirection="column">
      <StepIndicator current={3} total={8} label="Setting up host" />

      <Box flexDirection="column" marginLeft={2}>
        {status === "installing" && (
          <ProcessOutput
            label="Installing Lima via Homebrew..."
            logs={processLogs}
            verbose={verbose}
          />
        )}
        {status === "done" && (
          <Text>
            <Text color="green">✓</Text> Lima {backendVersion} installed
          </Text>
        )}
        {status === "error" && <Text color="red">✗ Failed to install Lima: {error}</Text>}
      </Box>
    </Box>
  );
}
