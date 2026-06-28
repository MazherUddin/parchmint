import { describe, it, expect } from "vitest";
import { validateDocument } from "./validate";
import type { Frontmatter } from "./frontmatter";

const noFm: Frontmatter = { present: false, data: null, error: null, bodyLine: 1 };
const fm = (data: Record<string, unknown>): Frontmatter => ({
  present: true,
  data,
  error: null,
  bodyLine: 1,
});

describe("validateDocument — skill", () => {
  it("warns when a skill file has no frontmatter", () => {
    const w = validateDocument("skill", "# body", noFm);
    expect(w.some((x) => /missing YAML frontmatter/.test(x.message))).toBe(true);
  });

  it("accepts a skill file with name and description", () => {
    const w = validateDocument("skill", "# body", fm({ name: "x", description: "y" }));
    expect(w).toEqual([]);
  });

  it("warns when description is missing", () => {
    const w = validateDocument("skill", "# body", fm({ name: "x" }));
    expect(w.some((x) => /'description' is required/.test(x.message))).toBe(true);
    expect(w.some((x) => /'name' is required/.test(x.message))).toBe(false);
  });

  it("warns when name is blank", () => {
    const w = validateDocument("skill", "# body", fm({ name: "  ", description: "y" }));
    expect(w.some((x) => /'name' is required/.test(x.message))).toBe(true);
  });
});

describe("validateDocument — adr", () => {
  it("warns when an ADR has no top-level title", () => {
    const w = validateDocument("adr", "no heading here", noFm);
    expect(w.some((x) => /no top-level .* title/.test(x.message))).toBe(true);
  });

  it("accepts an ADR with a top-level title", () => {
    expect(validateDocument("adr", "# A decision", noFm)).toEqual([]);
  });
});

describe("validateDocument — general", () => {
  it("reports broken YAML and stops", () => {
    const broken: Frontmatter = { present: true, data: null, error: "bad", bodyLine: 1 };
    const w = validateDocument("skill", "# body", broken);
    expect(w).toHaveLength(1);
    expect(w[0].message).toMatch(/Invalid frontmatter YAML/);
  });

  it("is silent for plain documents", () => {
    expect(validateDocument("plain", "anything at all", noFm)).toEqual([]);
  });
});
