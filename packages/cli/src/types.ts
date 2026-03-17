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
