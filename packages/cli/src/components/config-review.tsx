import React from "react";
import { Text, Box } from "ink";
import type { InstanceConfig } from "@clawctl/types";
import { ALL_CAPABILITIES } from "@clawctl/capabilities";

interface ConfigReviewProps {
  config: InstanceConfig;
  validationErrors: string[];
  validationWarnings: string[];
  focused?: boolean;
}

function MaskedValue({ value, label }: { value?: string; label?: string }) {
  if (!value)
    return (
      <Text dimColor>
        {"\u2500\u2500"} not configured {"\u2500\u2500"}
      </Text>
    );
  const masked = value.slice(0, 6) + "\u2022".repeat(Math.max(0, Math.min(value.length - 6, 18)));
  return (
    <Text>
      {label ? `${label} ` : ""}
      {masked}
    </Text>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Box>
      <Box width={16}>
        <Text dimColor>{label}</Text>
      </Box>
      {children}
    </Box>
  );
}

export function ConfigReview({ config, validationErrors, validationWarnings }: ConfigReviewProps) {
  const resources = config.resources ?? {};
  const cpus = resources.cpus ?? 4;
  const memory = resources.memory ?? "8GiB";
  const disk = resources.disk ?? "50GiB";

  const bootstrapSummary = config.bootstrap
    ? typeof config.bootstrap === "string"
      ? "(custom prompt)"
      : `${config.bootstrap.agent.name}${config.bootstrap.agent.context ? ` \u2014 "${config.bootstrap.agent.context.slice(0, 40)}${config.bootstrap.agent.context.length > 40 ? "..." : ""}"` : ""}`
    : null;

  return (
    <Box flexDirection="column" flexGrow={1}>
      <Box borderStyle="round" borderColor="cyan" paddingX={2} flexDirection="column">
        <Text bold> Review Configuration</Text>
      </Box>

      <Box flexDirection="column" marginTop={1} marginLeft={2}>
        <Row label="Instance">
          <Text bold>{config.name}</Text>
        </Row>
        <Row label="Project">
          <Text>{config.project}</Text>
        </Row>
        <Row label="Resources">
          <Text>
            {cpus} cpu {"\u00b7"} {memory} {"\u00b7"} {disk}
          </Text>
        </Row>

        <Text> </Text>

        <Row label="Provider">
          {config.provider ? (
            <Text>{config.provider.type}</Text>
          ) : (
            <Text dimColor>
              {"\u2500\u2500"} not configured {"\u2500\u2500"}
            </Text>
          )}
        </Row>
        {config.provider?.apiKey && (
          <Row label="API Key">
            <MaskedValue value={config.provider.apiKey} />
          </Row>
        )}

        <Text> </Text>

        {/* Dynamic capability rows */}
        {ALL_CAPABILITIES.filter((c) => !c.core && c.configDef).map((cap) => {
          const capConfig = config.capabilities?.[cap.name];
          const isConfigured = capConfig !== undefined;
          const summary = isConfigured && cap.configDef?.summary
            ? cap.configDef.summary(
                typeof capConfig === "object"
                  ? (capConfig as Record<string, string>)
                  : {},
              )
            : null;
          return (
            <Row key={cap.name} label={cap.configDef!.sectionLabel}>
              {isConfigured ? (
                <Text color="green">
                  {"\u2713"} {summary || "configured"}
                </Text>
              ) : (
                <Text dimColor>
                  {"\u2500\u2500"} not configured {"\u2500\u2500"}
                </Text>
              )}
            </Row>
          );
        })}

        <Text> </Text>

        <Row label="Agent">
          {bootstrapSummary ? (
            <Text>{bootstrapSummary}</Text>
          ) : (
            <Text dimColor>
              {"\u2500\u2500"} not configured {"\u2500\u2500"}
            </Text>
          )}
        </Row>
        <Row label="Telegram">
          {config.telegram ? (
            <Text color="green">{"\u2713"} configured</Text>
          ) : (
            <Text dimColor>
              {"\u2500\u2500"} not configured {"\u2500\u2500"}
            </Text>
          )}
        </Row>
      </Box>

      <Box
        flexDirection="column"
        borderStyle="round"
        borderColor={validationErrors.length > 0 ? "red" : "green"}
        marginTop={1}
        paddingX={1}
      >
        <Text bold> Validation</Text>
        {validationErrors.length === 0 && validationWarnings.length === 0 && (
          <Text color="green"> {"\u2713"} All required fields are set</Text>
        )}
        {validationErrors.map((err, i) => (
          <Text key={`e${i}`} color="red">
            {"  "}
            {"\u2717"} {err}
          </Text>
        ))}
        {validationWarnings.map((warn, i) => (
          <Text key={`w${i}`} color="yellow">
            {"  "}
            {"\u2139"} {warn}
          </Text>
        ))}
        {/* Capability provisioning hints */}
        {ALL_CAPABILITIES.filter((c) => !c.core && c.configDef && config.capabilities?.[c.name]).map(
          (cap) => (
            <Text key={cap.name} dimColor>
              {" "}
              {"\u2139"} {cap.configDef!.sectionLabel} will be configured during provisioning
            </Text>
          ),
        )}
        <Text dimColor>
          {" "}
          {"\u2139"} Config will be saved to {config.project}/clawctl.json
        </Text>
      </Box>

      <Box flexGrow={1} />

      <Box marginLeft={2}>
        {validationErrors.length > 0 ? (
          <Text dimColor>[Esc] Back to editor (fix errors first)</Text>
        ) : (
          <Text dimColor>
            [Enter] Create instance {"\u00b7"} [Esc] Back to editor {"\u00b7"} [S] Save config only
          </Text>
        )}
      </Box>
    </Box>
  );
}
