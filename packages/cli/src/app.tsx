import React, { useState } from "react";
import { Box, Text } from "ink";
import { Welcome } from "./steps/welcome.js";
import { Configure } from "./steps/configure.js";
import { HostSetup } from "./steps/host-setup.js";
import { CreateVM } from "./steps/create-vm.js";
import { ProvisionStatus } from "./steps/provision-status.js";
import { Credentials } from "./steps/credentials.js";
import { Finish } from "./steps/finish.js";
import { Onboard } from "./steps/onboard.js";
import { useVerboseMode } from "./hooks/use-verbose-mode.js";
import { VerboseContext } from "./hooks/verbose-context.js";
import type { WizardStep, VMConfig, PrereqStatus, CredentialConfig } from "@clawctl/types";
import type { VMDriver } from "@clawctl/host-core";

const PROCESS_STEPS: WizardStep[] = ["host-setup", "create-vm", "provision", "credentials"];

interface AppProps {
  driver: VMDriver;
}

export function App({ driver }: AppProps) {
  const [step, setStep] = useState<WizardStep>("welcome");
  const { verbose } = useVerboseMode();
  const [prereqs, setPrereqs] = useState<PrereqStatus>({
    isMacOS: false,
    isArm64: false,
    hasHomebrew: false,
    hasVMBackend: false,
  });
  const [config, setConfig] = useState<VMConfig>({
    projectDir: "",
    vmName: "",
    cpus: 4,
    memory: "8GiB",
    disk: "50GiB",
  });
  const [credentialConfig, setCredentialConfig] = useState<CredentialConfig>({});
  const [onboardSkipped, setOnboardSkipped] = useState(false);

  const showHint = PROCESS_STEPS.includes(step);

  return (
    <VerboseContext.Provider value={verbose}>
      <Box flexDirection="column">
        {step === "welcome" && (
          <Welcome
            driver={driver}
            onComplete={(p) => {
              setPrereqs(p);
              if (!p.isMacOS || !p.hasHomebrew) {
                return;
              }
              setStep(p.hasVMBackend ? "configure" : "host-setup");
            }}
          />
        )}

        {step === "host-setup" && (
          <HostSetup
            driver={driver}
            prereqs={prereqs}
            onComplete={(updated) => {
              setPrereqs(updated);
              setStep("configure");
            }}
          />
        )}

        {step === "configure" && (
          <Configure
            onComplete={(c) => {
              setConfig(c);
              setStep("create-vm");
            }}
          />
        )}

        {step === "create-vm" && (
          <CreateVM driver={driver} config={config} onComplete={() => setStep("provision")} />
        )}

        {step === "provision" && (
          <ProvisionStatus
            driver={driver}
            config={config}
            onComplete={() => setStep("credentials")}
          />
        )}

        {step === "credentials" && (
          <Credentials
            driver={driver}
            config={config}
            onComplete={(creds) => {
              setCredentialConfig(creds);
              setStep("onboard");
            }}
          />
        )}

        {step === "onboard" && (
          <Onboard
            config={config}
            tailscaleMode={credentialConfig.tailscaleMode}
            onComplete={(skipped) => {
              setOnboardSkipped(skipped);
              setStep("finish");
            }}
          />
        )}

        {step === "finish" && (
          <Finish
            driver={driver}
            config={config}
            onboardSkipped={onboardSkipped}
            tailscaleMode={credentialConfig.tailscaleMode}
          />
        )}

        {showHint && (
          <Box marginTop={1} marginLeft={2}>
            <Text dimColor>Press [v] to {verbose ? "hide" : "show"} process logs</Text>
          </Box>
        )}
      </Box>
    </VerboseContext.Provider>
  );
}
