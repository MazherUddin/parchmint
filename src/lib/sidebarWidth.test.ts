import { describe, it, expect } from "vitest";
import { clampSidebarWidth, SIDEBAR_DEFAULT_WIDTH, SIDEBAR_MIN_WIDTH } from "./sidebarWidth";

describe("clampSidebarWidth", () => {
  it("passes through a width already in range", () => {
    expect(clampSidebarWidth(300, 1200)).toBe(300);
  });

  it("clamps below the minimum up to 160", () => {
    expect(clampSidebarWidth(40, 1200)).toBe(SIDEBAR_MIN_WIDTH);
  });

  it("clamps above half the window down to half", () => {
    expect(clampSidebarWidth(900, 1200)).toBe(600);
  });

  it("keeps the minimum even when half the window is smaller", () => {
    expect(clampSidebarWidth(400, 200)).toBe(SIDEBAR_MIN_WIDTH);
  });

  it("falls back to the default for missing or corrupt persisted values", () => {
    expect(clampSidebarWidth(undefined, 1200)).toBe(SIDEBAR_DEFAULT_WIDTH);
    expect(clampSidebarWidth(null, 1200)).toBe(SIDEBAR_DEFAULT_WIDTH);
    expect(clampSidebarWidth("300", 1200)).toBe(SIDEBAR_DEFAULT_WIDTH);
    expect(clampSidebarWidth(NaN, 1200)).toBe(SIDEBAR_DEFAULT_WIDTH);
    expect(clampSidebarWidth(Infinity, 1200)).toBe(SIDEBAR_DEFAULT_WIDTH);
  });
});
