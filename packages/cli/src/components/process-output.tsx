import React from "react";
import { Text, Box } from "ink";
import { Spinner } from "./spinner.js";
import { LogOutput } from "./log-output.js";

interface ProcessOutputProps {
  label: string;
  logs: string[];
  verbose: boolean;
  maxLines?: number;
}

export function ProcessOutput({ label, logs, verbose, maxLines = 20 }: ProcessOutputProps) {
  const lastLine = logs.length > 0 ? logs[logs.length - 1] : undefined;

  return (
    <Box flexDirection="column">
      <Spinner label={label} />
      {verbose && logs.length > 0 ? (
        <LogOutput lines={logs} maxLines={maxLines} />
      ) : (
        lastLine && (
          <Box marginLeft={2}>
            <Text dimColor>{lastLine}</Text>
          </Box>
        )
      )}
    </Box>
  );
}
