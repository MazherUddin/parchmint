import { describe, it, expect } from "vitest";
import { parseFrontmatter } from "./frontmatter";

describe("parseFrontmatter", () => {
  it("reports absent frontmatter", () => {
    const fm = parseFrontmatter("# Just a heading\n\nbody");
    expect(fm.present).toBe(false);
    expect(fm.data).toBeNull();
    expect(fm.bodyLine).toBe(1);
  });

  it("parses a valid mapping and reports the body line", () => {
    const fm = parseFrontmatter("---\nname: thing\ndescription: does stuff\n---\nbody");
    expect(fm.present).toBe(true);
    expect(fm.error).toBeNull();
    expect(fm.data).toEqual({ name: "thing", description: "does stuff" });
    expect(fm.bodyLine).toBe(5);
  });

  it("flags frontmatter that is not a key/value mapping", () => {
    const fm = parseFrontmatter("---\njust a string\n---\n");
    expect(fm.present).toBe(true);
    expect(fm.data).toBeNull();
    expect(fm.error).toMatch(/mapping/i);
  });

  it("captures a YAML parse error", () => {
    const fm = parseFrontmatter("---\nname: [unterminated\n---\n");
    expect(fm.present).toBe(true);
    expect(fm.data).toBeNull();
    expect(fm.error).not.toBeNull();
  });

  it("strips a leading BOM before parsing", () => {
    const fm = parseFrontmatter("﻿---\nname: x\n---\n");
    expect(fm.present).toBe(true);
    expect(fm.data).toEqual({ name: "x" });
  });

  it("handles CRLF line endings", () => {
    const fm = parseFrontmatter("---\r\nname: x\r\n---\r\nbody");
    expect(fm.present).toBe(true);
    expect(fm.data).toEqual({ name: "x" });
  });
});
