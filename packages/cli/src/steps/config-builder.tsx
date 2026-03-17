import React, { useState, useMemo } from "react";
import { Text, Box, useInput } from "ink";
import TextInput from "ink-text-input";
import SelectInput from "ink-select-input";
import { FormField } from "../components/form-field.js";
import { FormSection } from "../components/form-section.js";
import { Sidebar, SIDEBAR_HELP } from "../components/sidebar.js";
import { ConfigReview } from "../components/config-review.js";
import { instanceConfigSchema, providerSchema, ALL_PROVIDER_TYPES } from "@clawctl/types";
import type { InstanceConfig } from "@clawctl/types";

type Phase = "form" | "review";

/**
 * Flat list of all navigable items. Sections are headers; fields within
 * expanded sections are sub-items.
 */
type FocusId =
  | "name"
  | "project"
  | "resources"
  | "resources.cpus"
  | "resources.memory"
  | "resources.disk"
  | "provider"
  | "provider.type"
  | "provider.apiKey"
  | "provider.model"
  | "provider.baseUrl"
  | "provider.modelId"
  | "services"
  | "services.opToken"
  | "network"
  | "network.port"
  | "network.tailscaleKey"
  | "network.tailscaleMode"
  | "bootstrap"
  | "bootstrap.agentName"
  | "bootstrap.agentContext"
  | "bootstrap.userName"
  | "bootstrap.userContext"
  | "telegram"
  | "telegram.botToken"
  | "telegram.allowFrom"
  | "action"; // "Review & Create" button

type SectionId = "resources" | "provider" | "services" | "network" | "bootstrap" | "telegram";

const SECTIONS: SectionId[] = [
  "resources",
  "provider",
  "services",
  "network",
  "bootstrap",
  "telegram",
];

const SECTION_CHILDREN: Record<SectionId, FocusId[]> = {
  resources: ["resources.cpus", "resources.memory", "resources.disk"],
  provider: [
    "provider.type",
    "provider.apiKey",
    "provider.model",
    "provider.baseUrl",
    "provider.modelId",
  ],
  services: ["services.opToken"],
  network: ["network.port", "network.tailscaleKey", "network.tailscaleMode"],
  bootstrap: [
    "bootstrap.agentName",
    "bootstrap.agentContext",
    "bootstrap.userName",
    "bootstrap.userContext",
  ],
  telegram: ["telegram.botToken", "telegram.allowFrom"],
};

function buildFocusList(expanded: Set<SectionId>): FocusId[] {
  const list: FocusId[] = ["name", "project"];
  for (const section of SECTIONS) {
    list.push(section as FocusId);
    if (expanded.has(section)) {
      list.push(...SECTION_CHILDREN[section]);
    }
  }
  list.push("action");
  return list;
}

const MEMORY_OPTIONS = ["4GiB", "8GiB", "16GiB", "32GiB"];
const DISK_OPTIONS = ["30GiB", "50GiB", "100GiB", "200GiB"];
const TS_MODE_OPTIONS = [
  { label: "serve", value: "serve" },
  { label: "funnel", value: "funnel" },
  { label: "off", value: "off" },
];

interface ConfigBuilderProps {
  onComplete: (config: InstanceConfig) => void;
  onSaveOnly?: (config: InstanceConfig) => void;
}

export function ConfigBuilder({ onComplete, onSaveOnly }: ConfigBuilderProps) {
  const [phase, setPhase] = useState<Phase>("form");

  // Config state
  const [name, setName] = useState("");
  const [project, setProject] = useState("");
  const [cpus, setCpus] = useState("4");
  const [memory, setMemory] = useState("8GiB");
  const [disk, setDisk] = useState("50GiB");

  // Provider
  const [providerType, setProviderType] = useState("");
  const [providerApiKey, setProviderApiKey] = useState("");
  const [providerModel, setProviderModel] = useState("");
  const [providerBaseUrl, setProviderBaseUrl] = useState("");
  const [providerModelId, setProviderModelId] = useState("");

  // Services
  const [opToken, setOpToken] = useState("");

  // Network
  const [gatewayPort, setGatewayPort] = useState("18789");
  const [tailscaleKey, setTailscaleKey] = useState("");
  const [tailscaleMode, setTailscaleMode] = useState("serve");

  // Bootstrap
  const [agentName, setAgentName] = useState("");
  const [agentContext, setAgentContext] = useState("");
  const [userName, setUserName] = useState("");
  const [userContext, setUserContext] = useState("");

  // Telegram
  const [botToken, setBotToken] = useState("");
  const [allowFrom, setAllowFrom] = useState("");

  // Navigation
  const [expanded, setExpanded] = useState<Set<SectionId>>(new Set());
  const [focusIdx, setFocusIdx] = useState(0);
  const [editing, setEditing] = useState(false);
  const [selectingProviderType, setSelectingProviderType] = useState(false);
  const [selectingTsMode, setSelectingTsMode] = useState(false);
  const [selectingMemory, setSelectingMemory] = useState(false);
  const [selectingDisk, setSelectingDisk] = useState(false);

  const focusList = useMemo(() => buildFocusList(expanded), [expanded]);
  const currentFocus = focusList[focusIdx] ?? "name";

  // Build the InstanceConfig from current state
  const buildConfig = (): InstanceConfig => {
    const config: InstanceConfig = {
      name: name.trim(),
      project: project.trim() || `~/agents/${name.trim()}`,
    };

    const cpuNum = parseInt(cpus, 10);
    if (cpuNum || memory !== "8GiB" || disk !== "50GiB") {
      config.resources = {};
      if (cpuNum && cpuNum !== 4) config.resources.cpus = cpuNum;
      if (memory !== "8GiB") config.resources.memory = memory;
      if (disk !== "50GiB") config.resources.disk = disk;
    }

    if (providerType) {
      config.provider = { type: providerType };
      if (providerApiKey) config.provider.apiKey = providerApiKey;
      if (providerModel) config.provider.model = providerModel;
      if (providerType === "custom") {
        if (providerBaseUrl) config.provider.baseUrl = providerBaseUrl;
        if (providerModelId) config.provider.modelId = providerModelId;
      }
    }

    if (opToken) {
      config.services = { onePassword: { serviceAccountToken: opToken } };
    }

    const port = parseInt(gatewayPort, 10);
    if (tailscaleKey || (port && port !== 18789)) {
      config.network = {};
      if (port && port !== 18789) config.network.gatewayPort = port;
      if (tailscaleKey) {
        config.network.tailscale = {
          authKey: tailscaleKey,
          mode: tailscaleMode as "off" | "serve" | "funnel",
        };
      }
    }

    if (agentName) {
      config.bootstrap = {
        agent: { name: agentName, context: agentContext || undefined },
        ...(userName ? { user: { name: userName, context: userContext || undefined } } : {}),
      };
    }

    if (botToken) {
      config.telegram = {
        botToken,
        ...(allowFrom
          ? {
              allowFrom: allowFrom
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean),
            }
          : {}),
      };
    }

    return config;
  };

  // Validate the assembled config
  const validate = (): { errors: string[]; warnings: string[] } => {
    const config = buildConfig();
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!config.name) errors.push("Instance name is required");
    if (!config.project) errors.push("Project directory is required");

    // Validate provider section if partially filled
    if (config.provider) {
      const provResult = providerSchema.safeParse(config.provider);
      if (!provResult.success) {
        for (const issue of provResult.error.issues) {
          errors.push(`Provider: ${issue.message}`);
        }
      }
    }

    // Full schema validation
    if (config.name && config.project) {
      const result = instanceConfigSchema.safeParse(config);
      if (!result.success) {
        for (const issue of result.error.issues) {
          const path = issue.path.join(".");
          const msg = path ? `${path}: ${issue.message}` : issue.message;
          if (!errors.some((e) => e.includes(issue.message))) {
            errors.push(msg);
          }
        }
      }
    }

    if (!config.provider) {
      warnings.push("No provider configured \u2014 run clawctl oc onboard later");
    }

    return { errors, warnings };
  };

  // Sidebar content based on current focus
  const sidebarFocusKey = phase === "review" ? "review" : currentFocus.split(".")[0];
  const sidebarContent =
    SIDEBAR_HELP[currentFocus] ?? SIDEBAR_HELP[sidebarFocusKey] ?? SIDEBAR_HELP["name"];

  // Section status helpers
  const sectionStatus = (id: SectionId): "unconfigured" | "configured" | "error" => {
    switch (id) {
      case "resources":
        return "configured"; // always has defaults
      case "provider":
        return providerType ? "configured" : "unconfigured";
      case "services":
        return opToken ? "configured" : "unconfigured";
      case "network":
        return tailscaleKey ? "configured" : "unconfigured";
      case "bootstrap":
        return agentName ? "configured" : "unconfigured";
      case "telegram":
        return botToken ? "configured" : "unconfigured";
    }
  };

  const sectionSummary = (id: SectionId): string => {
    switch (id) {
      case "resources":
        return `${cpus} cpu \u00b7 ${memory} \u00b7 ${disk}`;
      case "provider":
        return providerType || "";
      case "services":
        return opToken ? "1Password" : "";
      case "network":
        return tailscaleKey ? `Tailscale (${tailscaleMode})` : "defaults";
      case "bootstrap":
        return agentName || "";
      case "telegram":
        return botToken ? "configured" : "";
    }
  };

  const toggleSection = (id: SectionId) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const isSelectMode = selectingProviderType || selectingTsMode || selectingMemory || selectingDisk;

  // Handle input
  useInput(
    (input, key) => {
      if (isSelectMode) return; // SelectInput handles its own input

      if (phase === "review") {
        if (key.escape) {
          setPhase("form");
          return;
        }
        if (key.return) {
          const { errors } = validate();
          if (errors.length === 0) {
            onComplete(buildConfig());
          }
          return;
        }
        if (input.toLowerCase() === "s" && onSaveOnly) {
          onSaveOnly(buildConfig());
          return;
        }
        return;
      }

      // Form mode
      if (editing) {
        if (key.return || key.escape) {
          setEditing(false);
          // Auto-fill project if empty
          if (currentFocus === "name" && !project && name) {
            setProject(`~/agents/${name.trim()}`);
          }
        }
        return;
      }

      if (key.upArrow) {
        setFocusIdx((i) => Math.max(0, i - 1));
      } else if (key.downArrow || key.tab) {
        setFocusIdx((i) => Math.min(focusList.length - 1, i + 1));
      } else if (key.return) {
        if (SECTIONS.includes(currentFocus as SectionId)) {
          toggleSection(currentFocus as SectionId);
        } else if (currentFocus === "action") {
          setPhase("review");
        } else if (currentFocus === "provider.type") {
          setSelectingProviderType(true);
        } else if (currentFocus === "network.tailscaleMode") {
          setSelectingTsMode(true);
        } else if (currentFocus === "resources.memory") {
          setSelectingMemory(true);
        } else if (currentFocus === "resources.disk") {
          setSelectingDisk(true);
        } else {
          setEditing(true);
        }
      } else if (key.escape) {
        // Collapse parent section
        for (const section of SECTIONS) {
          if (SECTION_CHILDREN[section].includes(currentFocus)) {
            toggleSection(section);
            // Move focus to the section header
            const newList = buildFocusList(new Set([...expanded].filter((s) => s !== section)));
            const sectionIdx = newList.indexOf(section as FocusId);
            if (sectionIdx >= 0) setFocusIdx(sectionIdx);
            break;
          }
        }
      } else if (input.toLowerCase() === "r") {
        setPhase("review");
      }
    },
    { isActive: !isSelectMode },
  );

  // Render the review screen
  if (phase === "review") {
    const { errors, warnings } = validate();
    return (
      <Box>
        <Box flexDirection="column" flexGrow={1}>
          <ConfigReview
            config={buildConfig()}
            validationErrors={errors}
            validationWarnings={warnings}
          />
        </Box>
        <Box marginLeft={2}>
          <Sidebar title={sidebarContent.title} lines={sidebarContent.lines} />
        </Box>
      </Box>
    );
  }

  // Determine field status
  const fieldStatus = (id: FocusId) => {
    if (currentFocus === id && editing) return "editing" as const;
    if (currentFocus === id) return "focused" as const;
    return "idle" as const;
  };

  const providerTypeItems = ALL_PROVIDER_TYPES.map((t) => ({ label: t, value: t }));

  return (
    <Box>
      <Box flexDirection="column" flexGrow={1}>
        <Box borderStyle="round" borderColor="cyan" paddingX={2} flexDirection="column">
          <Text bold> clawctl create</Text>
          <Text dimColor> Configure a new OpenClaw instance</Text>
        </Box>

        <Box flexDirection="column" marginTop={1}>
          {/* Instance fields (always visible) */}
          <Box flexDirection="column" marginLeft={2}>
            {currentFocus === "name" && editing ? (
              <Box>
                <Text bold color="cyan">
                  {"\u25b8"}{" "}
                </Text>
                <Box width={16}>
                  <Text bold>Name</Text>
                </Box>
                <TextInput value={name} onChange={setName} placeholder="my-agent" />
              </Box>
            ) : (
              <FormField
                label="Name"
                value={name}
                status={fieldStatus("name")}
                placeholder="my-agent"
              />
            )}

            {currentFocus === "project" && editing ? (
              <Box>
                <Text bold color="cyan">
                  {"\u25b8"}{" "}
                </Text>
                <Box width={16}>
                  <Text bold>Project</Text>
                </Box>
                <TextInput
                  value={project}
                  onChange={setProject}
                  placeholder={name ? `~/agents/${name}` : "~/agents/my-agent"}
                />
              </Box>
            ) : (
              <FormField
                label="Project"
                value={project}
                status={fieldStatus("project")}
                placeholder={name ? `~/agents/${name}` : "~/agents/my-agent"}
              />
            )}
          </Box>

          <Text> </Text>

          {/* Sections */}
          <Box flexDirection="column" marginLeft={2}>
            {/* Resources */}
            <FormSection
              label="Resources"
              status={sectionStatus("resources")}
              summary={sectionSummary("resources")}
              focused={currentFocus === "resources"}
              expanded={expanded.has("resources")}
            >
              {currentFocus === "resources.cpus" && editing ? (
                <Box>
                  <Box width={14}>
                    <Text bold>CPUs</Text>
                  </Box>
                  <TextInput value={cpus} onChange={setCpus} />
                </Box>
              ) : (
                <FormField label="CPUs" value={cpus} status={fieldStatus("resources.cpus")} />
              )}
              {selectingMemory ? (
                <Box flexDirection="column">
                  <Text bold>Memory</Text>
                  <SelectInput
                    items={MEMORY_OPTIONS.map((m) => ({ label: m, value: m }))}
                    initialIndex={MEMORY_OPTIONS.indexOf(memory)}
                    onSelect={(item) => {
                      setMemory(item.value);
                      setSelectingMemory(false);
                    }}
                  />
                </Box>
              ) : (
                <FormField label="Memory" value={memory} status={fieldStatus("resources.memory")} />
              )}
              {selectingDisk ? (
                <Box flexDirection="column">
                  <Text bold>Disk</Text>
                  <SelectInput
                    items={DISK_OPTIONS.map((d) => ({ label: d, value: d }))}
                    initialIndex={DISK_OPTIONS.indexOf(disk)}
                    onSelect={(item) => {
                      setDisk(item.value);
                      setSelectingDisk(false);
                    }}
                  />
                </Box>
              ) : (
                <FormField label="Disk" value={disk} status={fieldStatus("resources.disk")} />
              )}
            </FormSection>

            {/* Provider */}
            <FormSection
              label="Provider"
              status={sectionStatus("provider")}
              summary={sectionSummary("provider")}
              focused={currentFocus === "provider"}
              expanded={expanded.has("provider")}
            >
              {selectingProviderType ? (
                <Box flexDirection="column">
                  <Text bold>Type</Text>
                  <SelectInput
                    items={providerTypeItems}
                    onSelect={(item) => {
                      setProviderType(item.value);
                      setSelectingProviderType(false);
                    }}
                  />
                </Box>
              ) : (
                <FormField
                  label="Type"
                  value={providerType}
                  status={fieldStatus("provider.type")}
                  placeholder="Select provider..."
                />
              )}
              {currentFocus === "provider.apiKey" && editing ? (
                <Box>
                  <Box width={14}>
                    <Text bold>API Key</Text>
                  </Box>
                  <TextInput value={providerApiKey} onChange={setProviderApiKey} mask="*" />
                </Box>
              ) : (
                <FormField
                  label="API Key"
                  value={providerApiKey}
                  status={fieldStatus("provider.apiKey")}
                  masked
                  placeholder={providerType === "custom" ? "(optional)" : "required"}
                />
              )}
              {currentFocus === "provider.model" && editing ? (
                <Box>
                  <Box width={14}>
                    <Text bold>Model</Text>
                  </Box>
                  <TextInput
                    value={providerModel}
                    onChange={setProviderModel}
                    placeholder="(default)"
                  />
                </Box>
              ) : (
                <FormField
                  label="Model"
                  value={providerModel}
                  status={fieldStatus("provider.model")}
                  placeholder="(default)"
                />
              )}
              {providerType === "custom" && (
                <>
                  {currentFocus === "provider.baseUrl" && editing ? (
                    <Box>
                      <Box width={14}>
                        <Text bold>Base URL</Text>
                      </Box>
                      <TextInput
                        value={providerBaseUrl}
                        onChange={setProviderBaseUrl}
                        placeholder="https://..."
                      />
                    </Box>
                  ) : (
                    <FormField
                      label="Base URL"
                      value={providerBaseUrl}
                      status={fieldStatus("provider.baseUrl")}
                      placeholder="https://..."
                    />
                  )}
                  {currentFocus === "provider.modelId" && editing ? (
                    <Box>
                      <Box width={14}>
                        <Text bold>Model ID</Text>
                      </Box>
                      <TextInput value={providerModelId} onChange={setProviderModelId} />
                    </Box>
                  ) : (
                    <FormField
                      label="Model ID"
                      value={providerModelId}
                      status={fieldStatus("provider.modelId")}
                      placeholder="required"
                    />
                  )}
                </>
              )}
            </FormSection>

            {/* Services */}
            <FormSection
              label="Services"
              status={sectionStatus("services")}
              summary={sectionSummary("services")}
              focused={currentFocus === "services"}
              expanded={expanded.has("services")}
            >
              {currentFocus === "services.opToken" && editing ? (
                <Box>
                  <Box width={14}>
                    <Text bold>1P Token</Text>
                  </Box>
                  <TextInput value={opToken} onChange={setOpToken} mask="*" />
                </Box>
              ) : (
                <FormField
                  label="1P Token"
                  value={opToken}
                  status={fieldStatus("services.opToken")}
                  masked
                  placeholder="1Password service account token"
                />
              )}
            </FormSection>

            {/* Network */}
            <FormSection
              label="Network"
              status={sectionStatus("network")}
              summary={sectionSummary("network")}
              focused={currentFocus === "network"}
              expanded={expanded.has("network")}
            >
              {currentFocus === "network.port" && editing ? (
                <Box>
                  <Box width={14}>
                    <Text bold>Port</Text>
                  </Box>
                  <TextInput value={gatewayPort} onChange={setGatewayPort} />
                </Box>
              ) : (
                <FormField
                  label="Port"
                  value={gatewayPort}
                  status={fieldStatus("network.port")}
                  placeholder="18789"
                />
              )}
              {currentFocus === "network.tailscaleKey" && editing ? (
                <Box>
                  <Box width={14}>
                    <Text bold>TS Auth Key</Text>
                  </Box>
                  <TextInput value={tailscaleKey} onChange={setTailscaleKey} mask="*" />
                </Box>
              ) : (
                <FormField
                  label="TS Auth Key"
                  value={tailscaleKey}
                  status={fieldStatus("network.tailscaleKey")}
                  masked
                  placeholder="Tailscale auth key"
                />
              )}
              {selectingTsMode ? (
                <Box flexDirection="column">
                  <Text bold>TS Mode</Text>
                  <SelectInput
                    items={TS_MODE_OPTIONS}
                    initialIndex={TS_MODE_OPTIONS.findIndex((o) => o.value === tailscaleMode)}
                    onSelect={(item) => {
                      setTailscaleMode(item.value);
                      setSelectingTsMode(false);
                    }}
                  />
                </Box>
              ) : (
                <FormField
                  label="TS Mode"
                  value={tailscaleKey ? tailscaleMode : ""}
                  status={fieldStatus("network.tailscaleMode")}
                  placeholder="serve"
                  dimValue={!tailscaleKey}
                />
              )}
            </FormSection>

            {/* Bootstrap / Agent Identity */}
            <FormSection
              label="Agent Identity"
              status={sectionStatus("bootstrap")}
              summary={sectionSummary("bootstrap")}
              focused={currentFocus === "bootstrap"}
              expanded={expanded.has("bootstrap")}
            >
              {currentFocus === "bootstrap.agentName" && editing ? (
                <Box>
                  <Box width={14}>
                    <Text bold>Agent Name</Text>
                  </Box>
                  <TextInput value={agentName} onChange={setAgentName} placeholder="my-assistant" />
                </Box>
              ) : (
                <FormField
                  label="Agent Name"
                  value={agentName}
                  status={fieldStatus("bootstrap.agentName")}
                  placeholder="my-assistant"
                />
              )}
              {currentFocus === "bootstrap.agentContext" && editing ? (
                <Box>
                  <Box width={14}>
                    <Text bold>Agent Vibe</Text>
                  </Box>
                  <TextInput
                    value={agentContext}
                    onChange={setAgentContext}
                    placeholder="creature, backstory..."
                  />
                </Box>
              ) : (
                <FormField
                  label="Agent Vibe"
                  value={agentContext}
                  status={fieldStatus("bootstrap.agentContext")}
                  placeholder="creature, backstory..."
                />
              )}
              {currentFocus === "bootstrap.userName" && editing ? (
                <Box>
                  <Box width={14}>
                    <Text bold>Your Name</Text>
                  </Box>
                  <TextInput value={userName} onChange={setUserName} />
                </Box>
              ) : (
                <FormField
                  label="Your Name"
                  value={userName}
                  status={fieldStatus("bootstrap.userName")}
                  placeholder="(optional)"
                />
              )}
              {currentFocus === "bootstrap.userContext" && editing ? (
                <Box>
                  <Box width={14}>
                    <Text bold>Your Context</Text>
                  </Box>
                  <TextInput
                    value={userContext}
                    onChange={setUserContext}
                    placeholder="timezone, preferences..."
                  />
                </Box>
              ) : (
                <FormField
                  label="Your Context"
                  value={userContext}
                  status={fieldStatus("bootstrap.userContext")}
                  placeholder="timezone, preferences..."
                />
              )}
            </FormSection>

            {/* Telegram */}
            <FormSection
              label="Telegram"
              status={sectionStatus("telegram")}
              summary={sectionSummary("telegram")}
              focused={currentFocus === "telegram"}
              expanded={expanded.has("telegram")}
            >
              {currentFocus === "telegram.botToken" && editing ? (
                <Box>
                  <Box width={14}>
                    <Text bold>Bot Token</Text>
                  </Box>
                  <TextInput value={botToken} onChange={setBotToken} mask="*" />
                </Box>
              ) : (
                <FormField
                  label="Bot Token"
                  value={botToken}
                  status={fieldStatus("telegram.botToken")}
                  masked
                  placeholder="from @BotFather"
                />
              )}
              {currentFocus === "telegram.allowFrom" && editing ? (
                <Box>
                  <Box width={14}>
                    <Text bold>Allow From</Text>
                  </Box>
                  <TextInput
                    value={allowFrom}
                    onChange={setAllowFrom}
                    placeholder="user-id-1, user-id-2"
                  />
                </Box>
              ) : (
                <FormField
                  label="Allow From"
                  value={allowFrom}
                  status={fieldStatus("telegram.allowFrom")}
                  placeholder="user-id-1, user-id-2"
                />
              )}
            </FormSection>
          </Box>

          <Text> </Text>

          {/* Action button */}
          <Box marginLeft={2}>
            <Text
              bold={currentFocus === "action"}
              color={currentFocus === "action" ? "cyan" : undefined}
            >
              {currentFocus === "action" ? "\u25b8 " : "  "}
              [Enter] Review & Create
            </Text>
          </Box>
        </Box>

        {/* Keybinding hints */}
        <Box marginTop={1} marginLeft={2}>
          <Text dimColor>
            [{"\u2191\u2193"}] navigate {"\u00b7"} [Enter] {editing ? "confirm" : "edit/expand"}{" "}
            {"\u00b7"} [Esc] {editing ? "cancel" : "collapse"} {"\u00b7"} [R] review
          </Text>
        </Box>
      </Box>

      {/* Sidebar */}
      <Box marginLeft={2}>
        <Sidebar title={sidebarContent.title} lines={sidebarContent.lines} />
      </Box>
    </Box>
  );
}
