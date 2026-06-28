import { describe, it, expect } from "vitest";
import { lintDocument, extractRelativeLinks } from "./lint";

describe("lintDocument — pseudo-tags", () => {
  it("warns about an unclosed pseudo-tag", () => {
    const w = lintDocument("<what-to-do>\nsome guidance");
    expect(w.some((x) => /Unclosed pseudo-tag <what-to-do>/.test(x.message))).toBe(true);
  });

  it("does not warn when pseudo-tags are balanced", () => {
    const w = lintDocument("<what-to-do>\nguidance\n</what-to-do>");
    expect(w.some((x) => /Unclosed|Stray/.test(x.message))).toBe(false);
  });

  it("warns about a stray closing tag", () => {
    const w = lintDocument("</what-to-do>");
    expect(w.some((x) => /Stray closing tag/.test(x.message))).toBe(true);
  });

  it("ignores standard HTML tags", () => {
    const w = lintDocument("<div>\nunclosed but standard");
    expect(w.some((x) => /Unclosed/.test(x.message))).toBe(false);
  });

  it("ignores tags inside fenced code blocks", () => {
    const w = lintDocument("```\n<what-to-do>\n```");
    expect(w.some((x) => /Unclosed|Stray/.test(x.message))).toBe(false);
  });

  it("reports the line of an unclosed tag", () => {
    const w = lintDocument("line one\n\n<my-tag>");
    const hit = w.find((x) => /Unclosed pseudo-tag <my-tag>/.test(x.message));
    expect(hit?.line).toBe(3);
  });
});

describe("lintDocument — whitespace", () => {
  it("warns about zero-width characters", () => {
    const w = lintDocument("hello​world");
    expect(w.some((x) => /zero-width/.test(x.message))).toBe(true);
  });
});

describe("extractRelativeLinks", () => {
  it("returns local relative targets with their line", () => {
    const links = extractRelativeLinks("see [docs](./guide.md) for more");
    expect(links).toEqual([{ target: "./guide.md", line: 1 }]);
  });

  it("skips external URLs and pure anchors", () => {
    const links = extractRelativeLinks("[a](https://example.com) [b](#section) [c](mailto:x@y.z)");
    expect(links).toEqual([]);
  });

  it("drops an optional link title", () => {
    const links = extractRelativeLinks('[a](./x.md "title")');
    expect(links[0].target).toBe("./x.md");
  });

  it("ignores links inside code spans", () => {
    expect(extractRelativeLinks("`[a](./x.md)`")).toEqual([]);
  });
});
