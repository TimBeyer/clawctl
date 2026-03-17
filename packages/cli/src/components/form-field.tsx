import React from "react";
import { Text, Box } from "ink";

export type FieldStatus = "idle" | "focused" | "editing" | "valid" | "error";

interface FormFieldProps {
  label: string;
  value: string;
  status?: FieldStatus;
  error?: string;
  masked?: boolean;
  placeholder?: string;
  dimValue?: boolean;
}

export function FormField({
  label,
  value,
  status = "idle",
  error,
  masked = false,
  placeholder,
  dimValue = false,
}: FormFieldProps) {
  const isFocused = status === "focused" || status === "editing";
  const displayValue = masked && value ? "\u2022".repeat(Math.min(value.length, 24)) : value;

  return (
    <Box flexDirection="column">
      <Box>
        <Text bold={isFocused} dimColor={!isFocused && status === "idle"}>
          {isFocused ? "\u25b8 " : "  "}
        </Text>
        <Box width={16}>
          <Text bold={isFocused}>{label}</Text>
        </Box>
        {displayValue ? (
          <Text dimColor={dimValue}>{displayValue}</Text>
        ) : placeholder ? (
          <Text dimColor>{placeholder}</Text>
        ) : null}
      </Box>
      {error && status === "error" && (
        <Box marginLeft={18}>
          <Text color="red">{error}</Text>
        </Box>
      )}
    </Box>
  );
}
