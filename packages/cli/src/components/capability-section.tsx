/**
 * Generic capability form section — renders any capability's configDef
 * as a FormSection with FormField children.
 *
 * This component is data-driven: it receives a CapabilityConfigDef and
 * renders the appropriate input widgets (text, password, select) based
 * on each field's type. No capability-specific logic lives here.
 */

import React from "react";
import { Text, Box } from "ink";
import TextInput from "ink-text-input";
import SelectInput from "ink-select-input";
import { FormField } from "./form-field.js";
import { FormSection } from "./form-section.js";
import type { CapabilityConfigDef } from "@clawctl/types";

export interface CapabilitySectionProps {
  /** The capability's config definition (from configDef on CapabilityDef). */
  configDef: CapabilityConfigDef;
  /** Current field values, keyed by field path. */
  values: Record<string, string>;
  /** Called when a field value changes. */
  onChange: (path: string, value: string) => void;
  /** Whether this section header is focused. */
  focused: boolean;
  /** Whether this section is expanded (showing fields). */
  expanded: boolean;
  /** The currently focused field path within this section (null if section header is focused). */
  focusedField: string | null;
  /** Whether the focused field is in editing mode. */
  editing: boolean;
  /** The field path currently showing a select dropdown (null if none). */
  selectingField: string | null;
  /** Called when a select dropdown completes. */
  onSelectDone: () => void;
}

export function CapabilitySection({
  configDef,
  values,
  onChange,
  focused,
  expanded,
  focusedField,
  editing,
  selectingField,
  onSelectDone,
}: CapabilitySectionProps) {
  const summary = configDef.summary ? configDef.summary(values) : "";
  const hasAnyValue = configDef.fields.some((f) => values[f.path as string]);
  const status = hasAnyValue ? ("configured" as const) : ("unconfigured" as const);

  return (
    <FormSection
      label={configDef.sectionLabel}
      status={status}
      summary={summary}
      focused={focused}
      expanded={expanded}
    >
      {configDef.fields.map((field) => {
        const path = field.path as string;
        const isFocused = focusedField === path;
        const isEditing = isFocused && editing;
        const isSelecting = selectingField === path;

        if (field.type === "select" && isSelecting) {
          return (
            <Box key={path} flexDirection="column">
              <Text bold>{field.label}</Text>
              <SelectInput
                items={(field.options ?? []).map((o) => ({ label: o.label, value: o.value }))}
                initialIndex={Math.max(
                  0,
                  (field.options ?? []).findIndex(
                    (o) => o.value === (values[path] || field.defaultValue),
                  ),
                )}
                onSelect={(item) => {
                  onChange(path, item.value);
                  onSelectDone();
                }}
              />
            </Box>
          );
        }

        if ((field.type === "text" || field.type === "password") && isEditing) {
          return (
            <Box key={path}>
              <Box width={14}>
                <Text bold>{field.label}</Text>
              </Box>
              <TextInput
                value={values[path] ?? ""}
                onChange={(v) => onChange(path, v)}
                mask={field.type === "password" ? "*" : undefined}
                placeholder={field.placeholder}
              />
            </Box>
          );
        }

        return (
          <FormField
            key={path}
            label={field.label}
            value={values[path] ?? ""}
            status={isFocused ? "focused" : "idle"}
            masked={field.secret}
            placeholder={field.placeholder ?? (field.type === "select" ? "Select..." : undefined)}
          />
        );
      })}
    </FormSection>
  );
}
