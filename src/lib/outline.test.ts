import { describe, it, expect } from "vitest";
import { buildOutline, outlineWarnings } from "./outline";

describe("buildOutline", () => {
  it("extracts headings with level, text, and 1-based line", () => {
    expect(buildOutline("# A\n\n## B\ntext\n### C")).toEqual([
      { level: 1, text: "A", line: 1 },
      { level: 2, text: "B", line: 3 },
      { level: 3, text: "C", line: 5 },
    ]);
  });

  it("ignores headings inside fenced code blocks", () => {
    const out = buildOutline("# Real\n```\n# Not a heading\n```\n## Also real");
    expect(out.map((h) => h.text)).toEqual(["Real", "Also real"]);
  });

  it("strips trailing closing hashes", () => {
    expect(buildOutline("# Title #")[0].text).toBe("Title");
  });

  it("does not treat a non-heading hash as a heading", () => {
    expect(buildOutline("#nospace")).toEqual([]);
  });
});

describe("outlineWarnings", () => {
  it("warns on a heading level jump", () => {
    const w = outlineWarnings(buildOutline("# A\n### C"));
    expect(w.some((x) => /jumps from H1 to H3/.test(x.message))).toBe(true);
  });

  it("warns on a duplicate heading (case-insensitive), on the second occurrence", () => {
    const w = outlineWarnings(buildOutline("# Setup\n## setup"));
    const dup = w.filter((x) => /Duplicate heading/.test(x.message));
    expect(dup).toHaveLength(1);
    expect(dup[0].line).toBe(2);
  });

  it("warns on an empty heading", () => {
    const w = outlineWarnings(buildOutline("# \n"));
    expect(w.some((x) => /Empty heading/.test(x.message))).toBe(true);
  });

  it("is silent for a clean, well-nested document", () => {
    expect(outlineWarnings(buildOutline("# A\n## B\n### C\n## D"))).toEqual([]);
  });
});
