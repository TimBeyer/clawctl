import * as openclaw from "../../tools/openclaw.js";
import type { ProvisionStage } from "./stages.js";

export const openclawStage: ProvisionStage = {
  name: "openclaw",
  phase: "provision-openclaw",
  steps: [
    { name: "openclaw", label: "OpenClaw", run: () => openclaw.provision() },
    { name: "env-vars", label: "Environment variables", run: () => openclaw.provisionEnvVars() },
    {
      name: "npm-global-path",
      label: "npm-global PATH",
      run: () => openclaw.provisionNpmGlobalPath(),
    },
    {
      name: "gateway-stub",
      label: "Gateway service stub",
      run: () => openclaw.provisionGatewayStub(),
    },
  ],
};
