import { describe, it, expect } from "vitest";
import { toggleTaskLine } from "./taskToggle";

describe("toggleTaskLine", () => {
  it("checks an unchecked task", () => {
    expect(toggleTaskLine("- [ ] do it", 0, true)).toBe("- [x] do it");
  });

  it("unchecks a checked task", () => {
    expect(toggleTaskLine("- [x] done", 0, false)).toBe("- [ ] done");
  });

  it("only touches the target line", () => {
    const src = "- [ ] a\n- [ ] b\n- [ ] c";
    expect(toggleTaskLine(src, 1, true)).toBe("- [ ] a\n- [x] b\n- [ ] c");
  });

  it("supports ordered-list task markers", () => {
    expect(toggleTaskLine("1. [ ] step", 0, true)).toBe("1. [x] step");
  });

  it("preserves indentation and bullet style", () => {
    expect(toggleTaskLine("  * [ ] nested", 0, true)).toBe("  * [x] nested");
  });

  it("returns content unchanged for an out-of-range line", () => {
    const src = "- [ ] a";
    expect(toggleTaskLine(src, 5, true)).toBe(src);
  });

  it("returns content unchanged for a non-task line", () => {
    const src = "just a paragraph";
    expect(toggleTaskLine(src, 0, true)).toBe(src);
  });
});
