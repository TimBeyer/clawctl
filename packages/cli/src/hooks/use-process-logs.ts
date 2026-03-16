import { useRef, useState, useCallback } from "react";

/**
 * Hook for accumulating real-time process output lines.
 * Uses a ref for the mutable buffer to avoid stale closure issues,
 * and a counter to trigger re-renders on each new line.
 */
export function useProcessLogs() {
  const linesRef = useRef<string[]>([]);
  const [, setTick] = useState(0);

  const addLine = useCallback((line: string) => {
    linesRef.current = [...linesRef.current, line];
    setTick((t) => t + 1);
  }, []);

  return { lines: linesRef.current, addLine };
}
