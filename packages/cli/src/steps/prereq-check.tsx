import React, { useState, useEffect } from "react";
import { Text, Box } from "ink";
import { Spinner } from "../components/spinner.js";
import { ProcessOutput } from "../components/process-output.js";
import { useVerbose } from "../hooks/verbose-context.js";
import { useProcessLogs } from "../hooks/use-process-logs.js";
import { checkPrereqs } from "@clawctl/host-core";
import type { VMDriver } from "@clawctl/host-core";

type Phase = "checking" | "installing" | "done" | "error";

interface PrereqCheckProps {
  driver: VMDriver;
  onComplete: () => void;
}

export function PrereqCheck({ driver, onComplete }: PrereqCheckProps) {
  const verbose = useVerbose();
  const { lines: installLogs, addLine } = useProcessLogs();
  const [phase, setPhase] = useState<Phase>("checking");
  const [isMacOS, setIsMacOS] = useState(false);
  const [isArm64, setIsArm64] = useState(false);
  const [hasHomebrew, setHasHomebrew] = useState(false);
  const [hasVMBackend, setHasVMBackend] = useState(false);
  const [vmVersion, setVmVersion] = useState<string>();
  const [error, setError] = useState<string>();

  useEffect(() => {
    async function run() {
      const prereqs = await checkPrereqs(driver);
      setIsMacOS(prereqs.isMacOS);
      setIsArm64(prereqs.isArm64);
      setHasHomebrew(prereqs.hasHomebrew);
      setHasVMBackend(prereqs.hasVMBackend);
      setVmVersion(prereqs.vmBackendVersion);

      if (!prereqs.isMacOS || !prereqs.hasHomebrew) {
        setError(!prereqs.isMacOS ? "macOS is required" : "Homebrew is required (https://brew.sh)");
        setPhase("error");
        return;
      }

      if (!prereqs.hasVMBackend) {
        setPhase("installing");
        try {
          const version = await driver.install(addLine);
          setHasVMBackend(true);
          setVmVersion(version);
          setPhase("done");
          setTimeout(() => onComplete(), 500);
        } catch (err) {
          setError(err instanceof Error ? err.message : String(err));
          setPhase("error");
        }
        return;
      }

      setPhase("done");
      setTimeout(() => onComplete(), 500);
    }
    run();
  }, []);

  const Check = ({ ok, label }: { ok: boolean; label: string }) => (
    <Text>
      <Text color={ok ? "green" : "red"}>{ok ? "\u2713" : "\u2717"}</Text> {label}
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

      {phase === "checking" && <Spinner label="Checking system requirements..." />}

      {phase !== "checking" && (
        <Box flexDirection="column" marginLeft={2}>
          <Check
            ok={isMacOS}
            label={`macOS detected${isArm64 ? " (arm64)" : isMacOS ? " (x86_64)" : " \u2014 macOS required"}`}
          />
          <Check
            ok={hasHomebrew}
            label={hasHomebrew ? "Homebrew installed" : "Homebrew not found \u2014 required"}
          />
          <Check
            ok={hasVMBackend}
            label={hasVMBackend ? `Lima ${vmVersion} installed` : "Lima not found"}
          />
        </Box>
      )}

      {phase === "installing" && (
        <Box marginLeft={2} marginTop={1}>
          <ProcessOutput
            label="Installing Lima via Homebrew..."
            logs={installLogs}
            verbose={verbose}
          />
        </Box>
      )}

      {phase === "error" && (
        <Box marginLeft={2} marginTop={1}>
          <Text color="red">
            {"\u2717"} {error}
          </Text>
        </Box>
      )}
    </Box>
  );
}
