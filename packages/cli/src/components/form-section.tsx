import React from "react";
import { Text, Box } from "ink";

export type SectionStatus = "unconfigured" | "configured" | "error";

interface FormSectionProps {
  label: string;
  status: SectionStatus;
  summary?: string;
  error?: string;
  focused?: boolean;
  expanded?: boolean;
  children?: React.ReactNode;
}

export function FormSection({
  label,
  status,
  summary,
  error,
  focused = false,
  expanded = false,
  children,
}: FormSectionProps) {
  const icon = expanded ? "\u25be" : "\u25b8";
  const statusIcon =
    status === "configured" ? (
      <Text color="green">{"\u2713"} </Text>
    ) : status === "error" ? (
      <Text color="red">{"\u2717"} </Text>
    ) : null;

  const statusText =
    status === "unconfigured" ? (
      <Text dimColor>
        {"\u2500\u2500"} none {"\u2500\u2500"}
      </Text>
    ) : (
      <Text>{summary}</Text>
    );

  return (
    <Box flexDirection="column">
      <Box>
        <Text bold={focused} color={focused ? "cyan" : undefined}>
          {focused ? icon : " " + icon.replace("\u25b8", "\u25b8").replace("\u25be", "\u25be")}{" "}
        </Text>
        {statusIcon}
        <Box width={18}>
          <Text bold={focused}>{label}</Text>
        </Box>
        {!expanded && statusText}
      </Box>
      {error && status === "error" && !expanded && (
        <Box marginLeft={4}>
          <Text color="red">{error}</Text>
        </Box>
      )}
      {expanded && (
        <Box flexDirection="column" marginLeft={4}>
          {children}
        </Box>
      )}
    </Box>
  );
}
