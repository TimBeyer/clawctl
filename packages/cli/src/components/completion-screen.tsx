import React from "react";
import { Text, Box } from "ink";
import type { HeadlessResult } from "@clawctl/host-core";
import { BIN_NAME } from "@clawctl/host-core";

interface CompletionScreenProps {
  result: HeadlessResult;
}

export function CompletionScreen({ result }: CompletionScreenProps) {
  const dashboardUrl = result.gatewayToken
    ? `http://localhost:${result.gatewayPort}/#token=${result.gatewayToken}`
    : `http://localhost:${result.gatewayPort}`;

  return (
    <Box flexDirection="column" flexGrow={1}>
      <Box borderStyle="round" borderColor="green" paddingX={2} flexDirection="column">
        <Text bold color="green">
          {"\u2713"} {result.name} is ready
        </Text>
      </Box>

      <Box flexDirection="column" marginTop={1} marginLeft={2}>
        <Box>
          <Box width={14}>
            <Text dimColor>Dashboard</Text>
          </Box>
          <Text>{dashboardUrl}</Text>
        </Box>
        {result.tailscaleUrl && (
          <Box>
            <Box width={14}>
              <Text dimColor>Tailscale</Text>
            </Box>
            <Text>{result.tailscaleUrl}</Text>
          </Box>
        )}
        <Box>
          <Box width={14}>
            <Text dimColor>Config</Text>
          </Box>
          <Text>{result.projectDir}/clawctl.json</Text>
        </Box>
      </Box>

      <Box flexDirection="column" marginTop={1} marginLeft={2}>
        <Text bold>Next steps:</Text>
        <Text>
          {" "}
          <Text dimColor>
            {BIN_NAME} shell {result.name}
          </Text>{" "}
          Enter the VM
        </Text>
        <Text>
          {" "}
          <Text dimColor>
            {BIN_NAME} oc -i {result.name} dashboard
          </Text>{" "}
          Open the dashboard
        </Text>
        <Text>
          {" "}
          <Text dimColor>
            {BIN_NAME} status {result.name}
          </Text>{" "}
          Check instance health
        </Text>
        {!result.providerType && (
          <Text>
            {" "}
            <Text dimColor>
              {BIN_NAME} oc -i {result.name} onboard
            </Text>{" "}
            Configure a provider
          </Text>
        )}
      </Box>

      <Box flexGrow={1} />
    </Box>
  );
}
