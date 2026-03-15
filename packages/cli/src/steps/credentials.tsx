import React, { useState } from "react";
import { Text, Box, useInput } from "ink";
import TextInput from "ink-text-input";
import { StepIndicator } from "../components/step-indicator.js";
import type { CredentialConfig } from "../types.js";

interface CredentialsProps {
  onComplete: (creds: CredentialConfig) => void;
}

type Phase = "ask-op" | "op-token" | "ask-tailscale" | "ask-tailscale-mode" | "done";

export function Credentials({ onComplete }: CredentialsProps) {
  const [phase, setPhase] = useState<Phase>("ask-op");
  const [opToken, setOpToken] = useState("");
  const [skipOp, setSkipOp] = useState(false);
  const [skipTs, setSkipTs] = useState(false);
  const [tsMode, setTsMode] = useState<"serve" | "off">("serve");
  const [wantTs, setWantTs] = useState(false);

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
        setWantTs(true);
        setPhase("ask-tailscale-mode");
      } else if (input.toLowerCase() === "n") {
        setSkipTs(true);
        finishWithCreds(false);
      }
    }
    if (phase === "ask-tailscale-mode") {
      if (input === "1" || key.return) {
        setTsMode("serve");
        finishWithCreds(true, "serve");
      } else if (input === "2") {
        setTsMode("off");
        finishWithCreds(true, "off");
      }
    }
  });

  function finishWithCreds(withTs: boolean = false, mode?: "serve" | "off") {
    setPhase("done");
    const creds: CredentialConfig = {};
    if (opToken) creds.opToken = opToken;
    if (withTs) {
      creds.tailscaleAuthKey = "interactive";
      creds.tailscaleMode = mode;
    }
    setTimeout(() => onComplete(creds), 300);
  }

  return (
    <Box flexDirection="column">
      <StepIndicator current={3} total={9} label="Credentials (optional, can do later)" />

      <Box flexDirection="column" marginLeft={2}>
        {/* 1Password section */}
        {phase === "ask-op" && (
          <Text>
            <Text color="yellow">?</Text> Set up 1Password? <Text dimColor>[Y/n]</Text>
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
              onSubmit={(val) => {
                setOpToken(val);
                setPhase("ask-tailscale");
              }}
              mask="*"
            />
          </Box>
        )}
        {opToken && phase !== "ask-op" && phase !== "op-token" && (
          <Text>
            <Text color="green">✓</Text> 1Password token collected (will validate after VM creation)
          </Text>
        )}
        {skipOp && <Text dimColor>○ 1Password setup skipped (can configure later)</Text>}

        {/* Tailscale section */}
        {phase === "ask-tailscale" && (
          <>
            <Text> </Text>
            <Text>
              <Text color="yellow">?</Text> Set up Tailscale? <Text dimColor>[Y/n]</Text>
            </Text>
          </>
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
        {phase === "done" && wantTs && (
          <Text>
            <Text color="green">✓</Text> Tailscale: {tsMode} mode (will connect after VM creation)
          </Text>
        )}
        {skipTs && <Text dimColor>○ Tailscale setup skipped (can configure later)</Text>}
      </Box>
    </Box>
  );
}
