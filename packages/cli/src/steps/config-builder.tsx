import React, { useState, useMemo } from "react";
import { Text, Box, useInput } from "ink";
import TextInput from "ink-text-input";
import SelectInput from "ink-select-input";
import { FormField } from "../components/form-field.js";
import { FormSection } from "../components/form-section.js";
import { CapabilitySection } from "../components/capability-section.js";
import { Sidebar, SIDEBAR_HELP } from "../components/sidebar.js";
import type { SidebarContent } from "../components/sidebar.js";
import { ConfigReview } from "../components/config-review.js";
import {
  instanceConfigSchema,
  providerSchema,
  ALL_PROVIDER_TYPES,
  DEFAULT_PROJECT_BASE,
  CHANNEL_REGISTRY,
  CHANNEL_ORDER,
} from "@clawctl/types";
import type { InstanceConfig, CapabilityConfigDef } from "@clawctl/types";
import { ALL_CAPABILITIES } from "@clawctl/capabilities";

type Phase = "form" | "review";

// ---------------------------------------------------------------------------
// Dynamic sections: unified abstraction for capabilities and channels
// ---------------------------------------------------------------------------

/**
 * A wizard section driven by a configDef — shared by capabilities and channels.
 *
 * All focus-list, sidebar, select-field, and rendering logic operates on
 * DynamicSection uniformly. No string prefix slicing needed in consumer code.
 */
interface DynamicSection {
  kind: "capability" | "channel";
  /** Unique key used in focus IDs, e.g. "cap:tailscale" or "ch:telegram". */
  key: string;
  /** Name used in the config object, e.g. "tailscale" or "telegram". */
  name: string;
  configDef: CapabilityConfigDef;
}

const CONFIGURABLE_CAPABILITIES = ALL_CAPABILITIES.filter((c) => !c.core && c.configDef);

const DYNAMIC_SECTIONS: DynamicSection[] = [
  ...CONFIGURABLE_CAPABILITIES.map(
    (c): DynamicSection => ({
      kind: "capability",
      key: `cap:${c.name}`,
      name: c.name,
      configDef: c.configDef!,
    }),
  ),
  ...CHANNEL_ORDER.map((name) => CHANNEL_REGISTRY[name])
    .filter(Boolean)
    .map(
      (ch): DynamicSection => ({
        kind: "channel",
        key: `ch:${ch.name}`,
        name: ch.name,
        configDef: ch.configDef,
      }),
    ),
];

/** Look up the DynamicSection that owns a focus ID (header or field). */
function findSection(focusId: string): DynamicSection | undefined {
  // Exact match → section header
  const exact = DYNAMIC_SECTIONS.find((s) => s.key === focusId);
  if (exact) return exact;
  // Prefix match → field within section
  return DYNAMIC_SECTIONS.find((s) => focusId.startsWith(s.key + ":"));
}

/** Extract the field path from a section field focus ID, or null for headers. */
function fieldPathOf(section: DynamicSection, focusId: string): string | null {
  const prefix = section.key + ":";
  return focusId.startsWith(prefix) ? focusId.slice(prefix.length) : null;
}

/** Child focus IDs for a dynamic section. */
function dynamicChildren(section: DynamicSection): string[] {
  return section.configDef.fields.map((f) => `${section.key}:${f.path as string}`);
}

// ---------------------------------------------------------------------------
// Core sections (hardcoded layout, not driven by configDef)
// ---------------------------------------------------------------------------

type CoreSectionId = "resources" | "provider" | "network" | "bootstrap";

const CORE_SECTIONS: CoreSectionId[] = ["resources", "provider", "network", "bootstrap"];

const CORE_SECTION_CHILDREN: Record<CoreSectionId, string[]> = {
  resources: ["resources.cpus", "resources.memory", "resources.disk"],
  provider: [
    "provider.type",
    "provider.apiKey",
    "provider.model",
    "provider.baseUrl",
    "provider.modelId",
  ],
  network: ["network.port"],
  bootstrap: [
    "bootstrap.agentName",
    "bootstrap.agentContext",
    "bootstrap.userName",
    "bootstrap.userContext",
  ],
};

// ---------------------------------------------------------------------------
// Focus list
// ---------------------------------------------------------------------------

/** All section IDs in visual render order. */
function allSectionIds(): string[] {
  return [
    "resources",
    "provider",
    "network",
    ...DYNAMIC_SECTIONS.map((s) => s.key),
    "bootstrap",
  ];
}

function sectionChildren(sectionId: string): string[] {
  if (sectionId in CORE_SECTION_CHILDREN) {
    return CORE_SECTION_CHILDREN[sectionId as CoreSectionId];
  }
  const section = DYNAMIC_SECTIONS.find((s) => s.key === sectionId);
  return section ? dynamicChildren(section) : [];
}

function buildFocusList(expanded: Set<string>): string[] {
  const list: string[] = ["name", "project"];
  for (const sectionId of allSectionIds()) {
    list.push(sectionId);
    if (expanded.has(sectionId)) {
      list.push(...sectionChildren(sectionId));
    }
  }
  list.push("action");
  return list;
}

function isSection(id: string): boolean {
  return (
    (CORE_SECTIONS as string[]).includes(id) ||
    DYNAMIC_SECTIONS.some((s) => s.key === id)
  );
}

/** Check if a focus ID is a select-type field in a dynamic section. */
function isDynamicSelectField(focusId: string): boolean {
  const section = findSection(focusId);
  if (!section) return false;
  const path = fieldPathOf(section, focusId);
  if (!path) return false;
  const field = section.configDef.fields.find((f) => (f.path as string) === path);
  return field?.type === "select";
}

const MEMORY_OPTIONS = ["4GiB", "8GiB", "16GiB", "32GiB"];
const DISK_OPTIONS = ["30GiB", "50GiB", "100GiB", "200GiB"];

interface ConfigBuilderProps {
  onComplete: (config: InstanceConfig) => void;
  onSaveOnly?: (config: InstanceConfig) => void;
}

export function ConfigBuilder({ onComplete, onSaveOnly }: ConfigBuilderProps) {
  const [phase, setPhase] = useState<Phase>("form");

  // Core config state
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

  // Network
  const [gatewayPort, setGatewayPort] = useState("18789");

  // Bootstrap
  const [agentName, setAgentName] = useState("");
  const [agentContext, setAgentContext] = useState("");
  const [userName, setUserName] = useState("");
  const [userContext, setUserContext] = useState("");

  // Dynamic section values: keyed by section.key → { fieldPath: value }
  const [dynamicValues, setDynamicValues] = useState<Record<string, Record<string, string>>>({});

  // Navigation
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [focusIdx, setFocusIdx] = useState(0);
  const [editing, setEditing] = useState(false);
  const [selectingProviderType, setSelectingProviderType] = useState(false);
  const [selectingMemory, setSelectingMemory] = useState(false);
  const [selectingDisk, setSelectingDisk] = useState(false);
  const [selectingDynamicField, setSelectingDynamicField] = useState<string | null>(null);

  const focusList = useMemo(() => buildFocusList(expanded), [expanded]);
  const currentFocus = focusList[focusIdx] ?? "name";

  const setDynamicValue = (sectionKey: string, fieldPath: string, value: string) => {
    setDynamicValues((prev) => ({
      ...prev,
      [sectionKey]: { ...(prev[sectionKey] ?? {}), [fieldPath]: value },
    }));
  };

  // Build the InstanceConfig from current state
  const buildConfig = (): InstanceConfig => {
    const config: InstanceConfig = {
      name: name.trim(),
      project: project.trim() || `${DEFAULT_PROJECT_BASE}/${name.trim()}`,
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

    const port = parseInt(gatewayPort, 10);
    if (port && port !== 18789) {
      config.network = { ...config.network, gatewayPort: port };
    }

    if (agentName) {
      config.bootstrap = {
        agent: { name: agentName, context: agentContext || undefined },
        ...(userName ? { user: { name: userName, context: userContext || undefined } } : {}),
      };
    }

    // Dynamic section values → capabilities or channels
    for (const section of DYNAMIC_SECTIONS) {
      const vals = dynamicValues[section.key];
      if (!vals || !Object.values(vals).some((v) => v)) continue;

      const sectionConfig: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(vals)) {
        if (!v) continue;
        // Convert comma-separated text fields to arrays (e.g., allowFrom)
        const field = section.configDef.fields.find((f) => (f.path as string) === k);
        if (field?.type === "text" && v.includes(",")) {
          sectionConfig[k] = v.split(",").map((s) => s.trim()).filter(Boolean);
        } else {
          sectionConfig[k] = v;
        }
      }

      if (section.kind === "capability") {
        config.capabilities ??= {};
        config.capabilities[section.name] = sectionConfig;
      } else {
        config.channels ??= {};
        config.channels[section.name] = sectionConfig;
      }
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

    if (config.provider) {
      const provResult = providerSchema.safeParse(config.provider);
      if (!provResult.success) {
        for (const issue of provResult.error.issues) {
          errors.push(`Provider: ${issue.message}`);
        }
      }
    }

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

  // Sidebar: hardcoded help, then dynamic section/field help
  const getSidebarContent = (): SidebarContent => {
    if (phase === "review") return SIDEBAR_HELP["review"];
    if (SIDEBAR_HELP[currentFocus]) return SIDEBAR_HELP[currentFocus];

    const section = findSection(currentFocus);
    if (section) {
      const path = fieldPathOf(section, currentFocus);
      if (path) {
        const field = section.configDef.fields.find((f) => (f.path as string) === path);
        if (field?.help) return field.help;
      } else if (section.configDef.sectionHelp) {
        return section.configDef.sectionHelp;
      }
    }

    const sectionKey = currentFocus.split(".")[0];
    return SIDEBAR_HELP[sectionKey] ?? SIDEBAR_HELP["name"];
  };

  const sidebarContent = getSidebarContent();

  // Core section status/summary
  const coreSectionStatus = (id: CoreSectionId): "unconfigured" | "configured" | "error" => {
    switch (id) {
      case "resources":
        return "configured";
      case "provider":
        return providerType ? "configured" : "unconfigured";
      case "network": {
        const port = parseInt(gatewayPort, 10);
        return port && port !== 18789 ? "configured" : "unconfigured";
      }
      case "bootstrap":
        return agentName ? "configured" : "unconfigured";
    }
  };

  const coreSectionSummary = (id: CoreSectionId): string => {
    switch (id) {
      case "resources":
        return `${cpus} cpu \u00b7 ${memory} \u00b7 ${disk}`;
      case "provider":
        return providerType || "";
      case "network":
        return gatewayPort !== "18789" ? `port ${gatewayPort}` : "defaults";
      case "bootstrap":
        return agentName || "";
    }
  };

  const toggleSection = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const isSelectMode =
    selectingProviderType || selectingMemory || selectingDisk || selectingDynamicField !== null;

  const findParentSection = (focusId: string): string | null => {
    for (const sectionId of allSectionIds()) {
      if (sectionChildren(sectionId).includes(focusId)) return sectionId;
    }
    return null;
  };

  // Input handling
  useInput(
    (input, key) => {
      if (isSelectMode) return;

      if (phase === "review") {
        if (key.escape) {
          setPhase("form");
          return;
        }
        if (key.return) {
          const { errors } = validate();
          if (errors.length === 0) onComplete(buildConfig());
          return;
        }
        if (input.toLowerCase() === "s" && onSaveOnly) {
          onSaveOnly(buildConfig());
          return;
        }
        return;
      }

      if (editing) {
        if (key.return || key.escape) {
          setEditing(false);
          if (currentFocus === "name" && !project && name) {
            setProject(`${DEFAULT_PROJECT_BASE}/${name.trim()}`);
          }
        }
        return;
      }

      if (key.upArrow) {
        setFocusIdx((i) => Math.max(0, i - 1));
      } else if (key.downArrow || key.tab) {
        setFocusIdx((i) => Math.min(focusList.length - 1, i + 1));
      } else if (key.return) {
        if (isSection(currentFocus)) {
          toggleSection(currentFocus);
        } else if (currentFocus === "action") {
          setPhase("review");
        } else if (currentFocus === "provider.type") {
          setSelectingProviderType(true);
        } else if (currentFocus === "resources.memory") {
          setSelectingMemory(true);
        } else if (currentFocus === "resources.disk") {
          setSelectingDisk(true);
        } else if (isDynamicSelectField(currentFocus)) {
          setSelectingDynamicField(currentFocus);
        } else {
          setEditing(true);
        }
      } else if (key.escape) {
        const parent = findParentSection(currentFocus);
        if (parent) {
          toggleSection(parent);
          const newList = buildFocusList(new Set([...expanded].filter((s) => s !== parent)));
          const sectionIdx = newList.indexOf(parent);
          if (sectionIdx >= 0) setFocusIdx(sectionIdx);
        }
      } else if (input.toLowerCase() === "r") {
        setPhase("review");
      }
    },
    { isActive: !isSelectMode },
  );

  // Review screen
  if (phase === "review") {
    const { errors, warnings } = validate();
    return (
      <Box flexGrow={1}>
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

  const fieldStatus = (id: string) => {
    if (currentFocus === id && editing) return "editing" as const;
    if (currentFocus === id) return "focused" as const;
    return "idle" as const;
  };

  const providerTypeItems = ALL_PROVIDER_TYPES.map((t) => ({ label: t, value: t }));

  // Resolve focused field within a dynamic section for CapabilitySection props
  const dynamicSectionProps = (section: DynamicSection) => {
    const vals = dynamicValues[section.key] ?? {};
    const focusedField = fieldPathOf(section, currentFocus);
    const selectingField =
      selectingDynamicField != null ? fieldPathOf(section, selectingDynamicField) : null;
    return {
      configDef: section.configDef,
      values: vals,
      onChange: (path: string, value: string) => setDynamicValue(section.key, path, value),
      focused: currentFocus === section.key,
      expanded: expanded.has(section.key),
      focusedField,
      editing,
      selectingField,
      onSelectDone: () => setSelectingDynamicField(null),
    };
  };

  return (
    <Box flexGrow={1}>
      <Box flexDirection="column" flexGrow={1}>
        <Box borderStyle="round" borderColor="cyan" paddingX={2} flexDirection="column">
          <Text bold> clawctl create</Text>
          <Text dimColor> Configure a new OpenClaw instance</Text>
        </Box>

        <Box flexDirection="column" marginTop={1} flexGrow={1} overflow="hidden">
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
                  placeholder={
                    name ? `${DEFAULT_PROJECT_BASE}/${name}` : `${DEFAULT_PROJECT_BASE}/my-agent`
                  }
                />
              </Box>
            ) : (
              <FormField
                label="Project"
                value={project}
                status={fieldStatus("project")}
                placeholder={
                  name ? `${DEFAULT_PROJECT_BASE}/${name}` : `${DEFAULT_PROJECT_BASE}/my-agent`
                }
              />
            )}
          </Box>

          <Text> </Text>

          {/* Sections */}
          <Box flexDirection="column" marginLeft={2}>
            {/* Resources */}
            <FormSection
              label="Resources"
              status={coreSectionStatus("resources")}
              summary={coreSectionSummary("resources")}
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
              status={coreSectionStatus("provider")}
              summary={coreSectionSummary("provider")}
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

            {/* Network */}
            <FormSection
              label="Network"
              status={coreSectionStatus("network")}
              summary={coreSectionSummary("network")}
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
            </FormSection>

            {/* Dynamic sections (capabilities + channels) */}
            {DYNAMIC_SECTIONS.map((section) => (
              <CapabilitySection key={section.key} {...dynamicSectionProps(section)} />
            ))}

            {/* Bootstrap / Agent Identity */}
            <FormSection
              label="Agent Identity"
              status={coreSectionStatus("bootstrap")}
              summary={coreSectionSummary("bootstrap")}
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
        <Box marginLeft={2}>
          <Text dimColor>
            [{"\u2191\u2193"}] navigate {"\u00b7"} [Enter] {editing ? "confirm" : "edit/expand"}{" "}
            {"\u00b7"} [Esc] {editing ? "cancel" : "collapse"} {"\u00b7"} [R] review
          </Text>
        </Box>
      </Box>

      <Box marginLeft={2}>
        <Sidebar title={sidebarContent.title} lines={sidebarContent.lines} />
      </Box>
    </Box>
  );
}
