import { createContext, useContext } from "react";

export const VerboseContext = createContext(false);

export function useVerbose(): boolean {
  return useContext(VerboseContext);
}
