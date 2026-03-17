import React from "react";
import { Text, Box } from "ink";

interface LogOutputProps {
  lines: string[];
  maxLines?: number;
}

export function LogOutput({ lines, maxLines = 10 }: LogOutputProps) {
  const visible = lines.slice(-maxLines);

  return (
    <Box flexDirection="column" flexGrow={1} overflow="hidden" marginLeft={2}>
      {visible.map((line, i) => (
        <Text key={i} dimColor>
          {line}
        </Text>
      ))}
    </Box>
  );
}
