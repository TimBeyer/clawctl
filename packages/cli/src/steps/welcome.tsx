import React, { useState, useEffect } from "react";
import { Text, Box } from "ink";
import { StepIndicator } from "../components/step-indicator.js";
import { Spinner } from "../components/spinner.js";
import type { VMDriver } from "@clawctl/host-core";
import type { PrereqStatus } from "../types.js";
import { checkPrereqs } from "@clawctl/host-core";

interface WelcomeProps {
  driver: VMDriver;
  onComplete: (prereqs: PrereqStatus) => void;
}

export function Welcome({ driver, onComplete }: WelcomeProps) {
  const [checking, setChecking] = useState(true);
  const [prereqs, setPrereqs] = useState<PrereqStatus>({
    isMacOS: false,
    isArm64: false,
    hasHomebrew: false,
    hasVMBackend: false,
  });

  useEffect(() => {
    async function check() {
      const result = await checkPrereqs(driver);
      setPrereqs(result);
      setChecking(false);

      // Auto-advance after a brief pause
      setTimeout(() => onComplete(result), 500);
    }
    check();
  }, []);

  const Check = ({ ok, label }: { ok: boolean; label: string }) => (
    <Text>
      <Text color={ok ? "green" : "red"}>{ok ? "✓" : "✗"}</Text> {label}
    </Text>
  );

  return (
    <Box flexDirection="column">
      <Box borderStyle="round" borderColor="cyan" paddingX={2} paddingY={0} marginBottom={1}>
        <Box flexDirection="column">
          <Text bold>clawctl</Text>
          <Text>Set up an OpenClaw VM in minutes</Text>
        </Box>
      </Box>

      <StepIndicator current={1} total={8} label="Checking prerequisites..." />

      {checking ? (
        <Spinner label="Checking system requirements..." />
      ) : (
        <Box flexDirection="column" marginLeft={2}>
          <Check
            ok={prereqs.isMacOS}
            label={`macOS detected${prereqs.isArm64 ? " (arm64)" : prereqs.isMacOS ? " (x86_64)" : " — macOS required"}`}
          />
          <Check
            ok={prereqs.hasHomebrew}
            label={prereqs.hasHomebrew ? "Homebrew installed" : "Homebrew not found — required"}
          />
          <Check
            ok={prereqs.hasVMBackend}
            label={
              prereqs.hasVMBackend ? `Lima ${prereqs.vmBackendVersion} installed` : "Lima not found"
            }
          />
          {!prereqs.hasVMBackend && (
            <Box marginLeft={2}>
              <Text dimColor>→ Will install Lima via Homebrew</Text>
            </Box>
          )}
        </Box>
      )}
    </Box>
  );
}
