import React, { useState, useEffect, useRef } from "react";
import { Box, Text, useApp } from "ink";
import { PrereqCheck } from "./steps/prereq-check.js";
import { ConfigBuilder } from "./steps/config-builder.js";
import { ProvisionMonitor } from "./components/provision-monitor.js";
import { CompletionScreen } from "./components/completion-screen.js";
import { useVerboseMode } from "./hooks/use-verbose-mode.js";
import { VerboseContext } from "./hooks/verbose-context.js";
import { useTerminalSize } from "./hooks/use-terminal-size.js";
import type { InstanceConfig } from "@clawctl/types";
import type { VMDriver, HeadlessResult } from "@clawctl/host-core";

type AppPhase = "prereqs" | "config" | "provision" | "done" | "error";

export interface AppResult {
  action: "created";
  result: HeadlessResult;
}

// -- ProvisionApp: config-driven TUI (skips wizard, goes straight to provision) --

interface ProvisionAppProps {
  driver: VMDriver;
  config: InstanceConfig;
}

export function ProvisionApp({ driver, config }: ProvisionAppProps) {
  const { exit } = useApp();
  const { verbose } = useVerboseMode();
  const [phase, setPhase] = useState<"provision" | "done" | "error">("provision");
  const [result, setResult] = useState<HeadlessResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const exited = useRef(false);
  const { rows } = useTerminalSize();

  useEffect(() => {
    if (phase === "done" && result && !exited.current) {
      exited.current = true;
      setTimeout(() => {
        exit({ action: "created", result } as AppResult);
      }, 1000);
    }
  }, [phase, result]);

  return (
    <VerboseContext.Provider value={verbose}>
      <Box flexDirection="column" height={rows}>
        {phase === "provision" && (
          <ProvisionMonitor
            driver={driver}
            config={config}
            onComplete={(res) => {
              setResult(res);
              setPhase("done");
            }}
            onError={(err) => {
              setError(err.message);
              setPhase("error");
            }}
          />
        )}

        {phase === "done" && result && <CompletionScreen result={result} />}

        {phase === "error" && (
          <Box flexDirection="column" marginTop={1}>
            <Text color="red" bold>
              {"\u2717"} Provisioning failed
            </Text>
            <Box marginLeft={2}>
              <Text color="red">{error}</Text>
            </Box>
            <Box flexGrow={1} />
          </Box>
        )}
      </Box>
    </VerboseContext.Provider>
  );
}

// -- App: full interactive wizard (prereqs → config → provision → done) --

interface AppProps {
  driver: VMDriver;
  onProvisionStart?: (config: InstanceConfig) => void;
}

export function App({ driver, onProvisionStart }: AppProps) {
  const { exit } = useApp();
  const [phase, setPhase] = useState<AppPhase>("prereqs");
  const { verbose } = useVerboseMode();
  const [config, setConfig] = useState<InstanceConfig | null>(null);
  const [result, setResult] = useState<HeadlessResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const exited = useRef(false);
  const { rows } = useTerminalSize();

  // Exit Ink on completion or error so waitUntilExit() resolves
  useEffect(() => {
    if (phase === "done" && result && !exited.current) {
      exited.current = true;
      // Brief delay so the completion screen renders
      setTimeout(() => {
        exit({ action: "created", result } as AppResult);
      }, 1000);
    }
  }, [phase, result]);

  return (
    <VerboseContext.Provider value={verbose}>
      <Box flexDirection="column" height={rows}>
        {phase === "prereqs" && (
          <PrereqCheck driver={driver} onComplete={() => setPhase("config")} />
        )}

        {phase === "config" && (
          <ConfigBuilder
            onComplete={(cfg) => {
              setConfig(cfg);
              onProvisionStart?.(cfg);
              setPhase("provision");
            }}
          />
        )}

        {phase === "provision" && config && (
          <ProvisionMonitor
            driver={driver}
            config={config}
            onComplete={(res) => {
              setResult(res);
              setPhase("done");
            }}
            onError={(err) => {
              setError(err.message);
              setPhase("error");
            }}
          />
        )}

        {phase === "done" && result && <CompletionScreen result={result} />}

        {phase === "error" && (
          <Box flexDirection="column" marginTop={1}>
            <Text color="red" bold>
              {"\u2717"} Provisioning failed
            </Text>
            <Box marginLeft={2}>
              <Text color="red">{error}</Text>
            </Box>
            <Box flexGrow={1} />
          </Box>
        )}
      </Box>
    </VerboseContext.Provider>
  );
}
