import React, { useState } from "react";
import { Text, Box } from "ink";
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

export function Configure({ onComplete }: ConfigureProps) {
  const [fieldIndex, setFieldIndex] = useState(0);
  const [values, setValues] = useState<Record<string, string>>({});
  const [currentValue, setCurrentValue] = useState(FIELDS[0].defaultValue);

  const currentField = FIELDS[fieldIndex];

  function handleSubmit(value: string) {
    const finalValue = value || currentField.defaultValue;
    const newValues = { ...values, [currentField.key]: finalValue };
    setValues(newValues);

    if (fieldIndex < FIELDS.length - 1) {
      const nextIndex = fieldIndex + 1;
      setFieldIndex(nextIndex);
      setCurrentValue(FIELDS[nextIndex].defaultValue);
    } else {
      const config: VMConfig = {
        projectDir: newValues.projectDir!.replace(/^~/, os.homedir()),
        vmName: newValues.vmName!,
        cpus: parseInt(newValues.cpus!, 10),
        memory: newValues.memory!,
        disk: newValues.disk!,
      };
      onComplete(config);
    }
  }

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

        {/* Current field */}
        <Box>
          <Text>
            <Text color="yellow">?</Text> {currentField.label}:{" "}
          </Text>
          <TextInput value={currentValue} onChange={setCurrentValue} onSubmit={handleSubmit} />
        </Box>
      </Box>
    </Box>
  );
}
