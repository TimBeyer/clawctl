export interface PrereqStatus {
  isMacOS: boolean;
  isArm64: boolean;
  hasHomebrew: boolean;
  hasVMBackend: boolean;
  vmBackendVersion?: string;
}

export interface ProvisioningStep {
  label: string;
  status: "pending" | "running" | "done" | "error";
  error?: string;
}

export interface CredentialConfig {
  opToken?: string;
  tailscaleAuthKey?: string;
  tailscaleMode?: "off" | "serve" | "funnel";
}

export type WizardStep =
  | "welcome"
  | "configure"
  | "host-setup"
  | "create-vm"
  | "provision"
  | "credentials"
  | "onboard"
  | "finish";
