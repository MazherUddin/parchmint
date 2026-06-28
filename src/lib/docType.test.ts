import { describe, it, expect } from "vitest";
import { detectType, TEMPLATES, DOC_TYPES } from "./docType";

describe("detectType", () => {
  it("detects a skill from name + description frontmatter", () => {
    expect(detectType(null, { name: "x", description: "y" }, true)).toBe("skill");
  });

  it("detects a skill from a SKILL.md filename", () => {
    expect(detectType("/repo/skills/foo/SKILL.md", null, false)).toBe("skill");
  });

  it("detects an ADR from a docs/adr path", () => {
    expect(detectType("/repo/docs/adr/0003-thing.md", null, false)).toBe("adr");
  });

  it("detects an ADR from a NNNN- filename", () => {
    expect(detectType("/notes/0012-some-decision.md", null, false)).toBe("adr");
  });

  it("falls back to generic when frontmatter is present but not a skill", () => {
    expect(detectType("/x/notes.md", { title: "t" }, true)).toBe("generic");
  });

  it("falls back to plain with no frontmatter and no signal", () => {
    expect(detectType("/x/notes.md", null, false)).toBe("plain");
  });

  it("does not treat partial frontmatter (name only) as a skill", () => {
    expect(detectType(null, { name: "x" }, true)).toBe("generic");
  });
});

describe("TEMPLATES", () => {
  it("has a template for every document type", () => {
    for (const t of DOC_TYPES) expect(typeof TEMPLATES[t]).toBe("string");
  });

  it("the skill template carries name and description keys", () => {
    expect(TEMPLATES.skill).toMatch(/name:/);
    expect(TEMPLATES.skill).toMatch(/description:/);
  });

  it("the plain template is empty", () => {
    expect(TEMPLATES.plain).toBe("");
  });
});
