import React, { useState } from "react";
import { Text, Box, useInput } from "ink";
import TextInput from "ink-text-input";
import { StepIndicator } from "../components/step-indicator.js";
import type { VMConfig } from "../types.js";
import os from "os";
import { join } from "path";

interface ConfigureProps {
  onComplete: (config: VMConfig) => void;
}

interface Field {
  key: keyof VMConfig;
  label: string;
  defaultValue: string;
}

const FIELDS: Field[] = [
  {
    key: "projectDir",
    label: "Project directory",
    defaultValue: join(os.homedir(), "openclaw-vms/my-agent"),
  },
  { key: "vmName", label: "VM name", defaultValue: "openclaw" },
  { key: "cpus", label: "CPUs", defaultValue: "4" },
  { key: "memory", label: "Memory (GiB)", defaultValue: "8GiB" },
  { key: "disk", label: "Disk (GiB)", defaultValue: "50GiB" },
];

type Phase = "fields" | "mount-home";

export function Configure({ onComplete }: ConfigureProps) {
  const [phase, setPhase] = useState<Phase>("fields");
  const [fieldIndex, setFieldIndex] = useState(0);
  const [values, setValues] = useState<Record<string, string>>({});
  const [currentValue, setCurrentValue] = useState(FIELDS[0].defaultValue);
  const [mountHome, setMountHome] = useState<boolean | undefined>(undefined);

  const currentField = FIELDS[fieldIndex];

  function buildConfig(newValues: Record<string, string>, extraMounts?: string[]): VMConfig {
    const config: VMConfig = {
      projectDir: newValues.projectDir!.replace(/^~/, os.homedir()),
      vmName: newValues.vmName!,
      cpus: parseInt(newValues.cpus!, 10),
      memory: newValues.memory!,
      disk: newValues.disk!,
    };
    if (extraMounts) config.extraMounts = extraMounts;
    return config;
  }

  function handleSubmit(value: string) {
    const finalValue = value || currentField.defaultValue;
    const newValues = { ...values, [currentField.key]: finalValue };
    setValues(newValues);

    if (fieldIndex < FIELDS.length - 1) {
      const nextIndex = fieldIndex + 1;
      setFieldIndex(nextIndex);
      setCurrentValue(FIELDS[nextIndex].defaultValue);
    } else {
      setPhase("mount-home");
    }
  }

  useInput((input, key) => {
    if (phase !== "mount-home") return;

    if (input.toLowerCase() === "y") {
      setMountHome(true);
      onComplete(buildConfig(values, ["~"]));
    } else if (input.toLowerCase() === "n" || key.return) {
      setMountHome(false);
      onComplete(buildConfig(values));
    }
  });

  return (
    <Box flexDirection="column">
      <StepIndicator current={2} total={8} label="Configure your VM" />

      <Box flexDirection="column" marginLeft={2}>
        {/* Show already-answered fields */}
        {FIELDS.slice(0, fieldIndex).map((field) => (
          <Text key={field.key}>
            <Text color="green">✓</Text> {field.label}: <Text bold>{values[field.key]}</Text>
          </Text>
        ))}

        {/* Current field (only during fields phase) */}
        {phase === "fields" && (
          <Box>
            <Text>
              <Text color="yellow">?</Text> {currentField.label}:{" "}
            </Text>
            <TextInput value={currentValue} onChange={setCurrentValue} onSubmit={handleSubmit} />
          </Box>
        )}

        {/* Show all fields as completed when in mount-home phase */}
        {phase === "mount-home" && (
          <>
            <Text key={FIELDS[FIELDS.length - 1].key}>
              <Text color="green">✓</Text> {FIELDS[FIELDS.length - 1].label}:{" "}
              <Text bold>{values[FIELDS[FIELDS.length - 1].key]}</Text>
            </Text>
            <Text> </Text>
            {mountHome === undefined && (
              <Text>
                <Text color="yellow">?</Text> Mount home directory in VM? (read-only){" "}
                <Text dimColor>[y/N]</Text>
              </Text>
            )}
            {mountHome === true && (
              <Text>
                <Text color="green">✓</Text> Home directory will be mounted at /mnt/host
              </Text>
            )}
            {mountHome === false && <Text dimColor>○ Home directory not mounted</Text>}
          </>
        )}
      </Box>
    </Box>
  );
}
