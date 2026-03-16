import { useState } from "react";
import { useInput } from "ink";

export function useVerboseMode() {
  const [verbose, setVerbose] = useState(false);

  useInput((input) => {
    if (input === "v") {
      setVerbose((prev) => !prev);
    }
  });

  return { verbose };
}
