import React, { useState, useEffect } from "react";
import { Text, Box } from "ink";
import { StepIndicator } from "../components/step-indicator.js";
import { ProcessOutput } from "../components/process-output.js";
import { useVerbose } from "../hooks/verbose-context.js";
import { useProcessLogs } from "../hooks/use-process-logs.js";
import type { VMConfig } from "@clawctl/types";
import type { VMDriver } from "@clawctl/host-core";
import { setupOnePassword, connectTailscaleInteractive } from "@clawctl/host-core";
import type { CredentialConfig } from "../types.js";

interface CredentialSetupProps {
  driver: VMDriver;
  config: VMConfig;
  credentialConfig: CredentialConfig;
  onComplete: (creds: CredentialConfig) => void;
}

type Phase = "setting-up" | "done";

export function CredentialSetup({
  driver,
  config,
  credentialConfig,
  onComplete,
}: CredentialSetupProps) {
  const verbose = useVerbose();
  const { lines: processLogs, addLine: addLog } = useProcessLogs();
  const [phase, setPhase] = useState<Phase>("setting-up");
  const [error, setError] = useState<string>();
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);

  const hasOp = !!credentialConfig.opToken;
  const hasTs = !!credentialConfig.tailscaleAuthKey;

  useEffect(() => {
    async function run() {
      const updatedCreds = { ...credentialConfig };

      // Validate 1Password token in VM
      if (hasOp) {
        try {
          const result = await setupOnePassword(
            driver,
            config.vmName,
            credentialConfig.opToken!,
            addLog,
          );
          if (result.valid) {
            setCompletedSteps((prev) => [
              ...prev,
              `1Password validated (${result.account || "ok"})`,
            ]);
          } else {
            setError(`1Password: ${result.error || "validation failed"}`);
          }
        } catch (err) {
          setError(`1Password: ${err instanceof Error ? err.message : String(err)}`);
        }
      }

      // Connect Tailscale in VM
      if (hasTs) {
        try {
          const result = await connectTailscaleInteractive(driver, config.vmName, addLog);
          if (result.connected) {
            setCompletedSteps((prev) => [
              ...prev,
              `Tailscale connected as ${result.hostname || "ok"}`,
            ]);
          } else {
            setError(`Tailscale: connection failed`);
          }
        } catch (err) {
          setError(`Tailscale: ${err instanceof Error ? err.message : String(err)}`);
        }
      }

      if (!hasOp && !hasTs) {
        setCompletedSteps(["No credentials to set up"]);
      }

      setPhase("done");
      setTimeout(() => onComplete(updatedCreds), 500);
    }
    run();
  }, []);

  return (
    <Box flexDirection="column">
      <StepIndicator current={7} total={9} label="Setting up credentials" />

      <Box flexDirection="column" marginLeft={2}>
        {completedSteps.map((step, i) => (
          <Text key={i}>
            <Text color="green">✓</Text> {step}
          </Text>
        ))}

        {phase === "setting-up" && (
          <ProcessOutput
            label="Configuring credentials in VM..."
            logs={processLogs}
            verbose={verbose}
          />
        )}

        {error && <Text color="red">{error}</Text>}
      </Box>
    </Box>
  );
}
