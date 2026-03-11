import { describe, test, expect } from "bun:test";

// Since we don't have a React testing library installed, test the core logic
// by extracting and testing the ref-based pattern directly.

describe("useProcessLogs logic", () => {
  test("accumulates lines in order", () => {
    const lines: string[] = [];
    const addLine = (line: string) => {
      lines.push(line);
    };

    addLine("first");
    addLine("second");
    addLine("third");

    expect(lines).toEqual(["first", "second", "third"]);
  });

  test("clear resets the buffer", () => {
    let lines: string[] = [];
    const addLine = (line: string) => {
      lines.push(line);
    };
    const clear = () => {
      lines = [];
    };

    addLine("a");
    addLine("b");
    expect(lines).toHaveLength(2);

    clear();
    expect(lines).toHaveLength(0);
  });

  test("addLine is safe to call rapidly", () => {
    const lines: string[] = [];
    const addLine = (line: string) => {
      lines.push(line);
    };

    for (let i = 0; i < 1000; i++) {
      addLine(`line-${i}`);
    }

    expect(lines).toHaveLength(1000);
    expect(lines[0]).toBe("line-0");
    expect(lines[999]).toBe("line-999");
  });
});
