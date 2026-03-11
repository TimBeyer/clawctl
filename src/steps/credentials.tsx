import React, { useState } from "react";
import { Text, Box, useInput } from "ink";
import TextInput from "ink-text-input";
import { StepIndicator } from "../components/step-indicator.js";
import { ProcessOutput } from "../components/process-output.js";
import { useVerbose } from "../hooks/verbose-context.js";
import { useProcessLogs } from "../hooks/use-process-logs.js";
import type { VMConfig, CredentialConfig } from "../types.js";
import type { VMDriver } from "../drivers/types.js";
import { setupOnePassword, connectTailscaleInteractive } from "../lib/credentials.js";

interface CredentialsProps {
  driver: VMDriver;
  config: VMConfig;
  onComplete: (creds: CredentialConfig) => void;
}

type Phase =
  | "ask-op"
  | "op-token"
  | "validating-op"
  | "op-done"
  | "ask-tailscale"
  | "tailscale-connecting"
  | "ask-tailscale-mode"
  | "done";

export function Credentials({ driver, config, onComplete }: CredentialsProps) {
  const verbose = useVerbose();
  const { lines: processLogs, addLine: addLog } = useProcessLogs();
  const [phase, setPhase] = useState<Phase>("ask-op");
  const [opToken, setOpToken] = useState("");
  const [opValid, setOpValid] = useState(false);
  const [opAccount, setOpAccount] = useState("");
  const [tsConnected, setTsConnected] = useState(false);
  const [tsHostname, setTsHostname] = useState("");
  const [error, setError] = useState<string>();
  const [tsMode, setTsMode] = useState<"serve" | "off">("serve");
  const [skipOp, setSkipOp] = useState(false);
  const [skipTs, setSkipTs] = useState(false);

  useInput((input, key) => {
    if (phase === "ask-op") {
      if (input.toLowerCase() === "y" || key.return) {
        setPhase("op-token");
      } else if (input.toLowerCase() === "n") {
        setSkipOp(true);
        setPhase("ask-tailscale");
      }
    }
    if (phase === "ask-tailscale") {
      if (input.toLowerCase() === "y" || key.return) {
        connectTailscale();
      } else if (input.toLowerCase() === "n") {
        setSkipTs(true);
        finishWithCreds();
      }
    }
    if (phase === "ask-tailscale-mode") {
      if (input === "1" || key.return) {
        setTsMode("serve");
        finishWithCreds("serve");
      } else if (input === "2") {
        setTsMode("off");
        finishWithCreds("off");
      }
    }
  });

  async function validateOpToken(token: string) {
    setPhase("validating-op");
    try {
      const result = await setupOnePassword(driver, config.vmName, token, addLog);
      if (result.valid) {
        setOpAccount(result.account || "validated");
        setOpValid(true);
        setPhase("op-done");
        setTimeout(() => setPhase("ask-tailscale"), 500);
      } else {
        setError(result.error || "Token validation failed");
        setPhase("op-token");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setPhase("op-token");
    }
  }

  function finishWithCreds(mode?: "serve" | "off") {
    setPhase("done");
    const creds: CredentialConfig = {};
    if (opToken) creds.opToken = opToken;
    if (tsConnected && mode) creds.tailscaleMode = mode;
    setTimeout(() => onComplete(creds), 300);
  }

  async function connectTailscale() {
    setPhase("tailscale-connecting");
    try {
      const result = await connectTailscaleInteractive(driver, config.vmName, addLog);
      if (result.connected) {
        setTsHostname(result.hostname || "connected");
        setTsConnected(true);
        setPhase("ask-tailscale-mode");
        return;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
    finishWithCreds();
  }

  return (
    <Box flexDirection="column">
      <StepIndicator current={6} total={8} label="Credentials (optional, can do later)" />

      <Box flexDirection="column" marginLeft={2}>
        {/* 1Password section */}
        {phase === "ask-op" && (
          <Text>
            <Text color="yellow">?</Text> Set up 1Password now? <Text dimColor>[Y/n]</Text>
          </Text>
        )}
        {phase === "op-token" && (
          <Box>
            <Text>
              <Text color="yellow">?</Text> OP_SERVICE_ACCOUNT_TOKEN:{" "}
            </Text>
            <TextInput
              value={opToken}
              onChange={setOpToken}
              onSubmit={(val) => validateOpToken(val)}
              mask="*"
            />
          </Box>
        )}
        {phase === "validating-op" && (
          <ProcessOutput
            label="Validating 1Password token..."
            logs={processLogs}
            verbose={verbose}
          />
        )}
        {(phase === "op-done" ||
          ((phase === "ask-tailscale" || phase === "tailscale-connecting" || phase === "done") &&
            opValid)) && (
          <Text>
            <Text color="green">✓</Text> Token validated (service account: {opAccount})
          </Text>
        )}
        {skipOp && <Text dimColor>○ 1Password setup skipped (can configure later)</Text>}

        {/* Tailscale section */}
        {phase === "ask-tailscale" && (
          <>
            <Text> </Text>
            <Text>
              <Text color="yellow">?</Text> Set up Tailscale now? <Text dimColor>[Y/n]</Text>
            </Text>
          </>
        )}
        {phase === "tailscale-connecting" && (
          <ProcessOutput label="Running tailscale up..." logs={processLogs} verbose={verbose} />
        )}
        {(phase === "ask-tailscale-mode" || phase === "done") && tsConnected && (
          <Text>
            <Text color="green">✓</Text> Connected as {tsHostname}
          </Text>
        )}
        {phase === "ask-tailscale-mode" && (
          <Box flexDirection="column" marginTop={1}>
            <Text>
              <Text color="yellow">?</Text> Tailscale gateway mode:
            </Text>
            <Text>
              {"  "}
              <Text color="cyan">[1]</Text> Serve — HTTPS on your tailnet, tokenless dashboard{" "}
              <Text dimColor>(recommended)</Text>
            </Text>
            <Text>
              {"  "}
              <Text color="cyan">[2]</Text> Off — raw Tailscale IP only, no HTTPS proxy
            </Text>
          </Box>
        )}
        {phase === "done" && tsConnected && tsMode === "serve" && (
          <Text dimColor> Mode: serve (HTTPS on tailnet)</Text>
        )}
        {skipTs && <Text dimColor>○ Tailscale setup skipped (can configure later)</Text>}

        {error && <Text color="red">{error}</Text>}
      </Box>
    </Box>
  );
}
