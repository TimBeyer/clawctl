import React from "react";
import { Text, Box } from "ink";

interface StepIndicatorProps {
  current: number;
  total: number;
  label: string;
}

export function StepIndicator({ current, total, label }: StepIndicatorProps) {
  const filled = "█".repeat(current);
  const empty = "░".repeat(total - current);

  return (
    <Box flexDirection="column" marginBottom={1}>
      <Text bold>
        <Text color="cyan">
          Step {current}/{total}
        </Text>{" "}
        — {label}
      </Text>
      <Text dimColor>
        {filled}
        {empty}
      </Text>
    </Box>
  );
}
