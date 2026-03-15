import * as skills from "../../tools/skills.js";
import * as opCli from "../../tools/op-cli.js";
import type { ProvisionStage } from "./stages.js";

export const workspaceStage: ProvisionStage = {
  name: "workspace",
  phase: "provision-workspace",
  steps: [
    {
      name: "skill-checkpoint",
      label: "Checkpoint skill",
      run: () => skills.provisionCheckpointSkill(),
    },
    {
      name: "skill-secret-management",
      label: "Secret management skill",
      run: () => skills.provisionSecretManagementSkill(),
    },
    {
      name: "op-wrapper",
      label: "1Password CLI wrapper",
      run: () => opCli.provisionOpWrapper(),
    },
    {
      name: "exec-approvals",
      label: "Exec approvals",
      run: () => opCli.provisionExecApprovals(),
    },
  ],
};
