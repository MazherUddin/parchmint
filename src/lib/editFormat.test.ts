import { describe, it, expect } from "vitest";
import {
  wrapInline,
  setHeading,
  toggleLinePrefix,
  makeLink,
  insertBlock,
  type Splice,
} from "./editFormat";

/** Apply a Splice, returning the new text and the selected substring. */
function apply(text: string, s: Splice): { text: string; selected: string } {
  const next = text.slice(0, s.from) + s.insert + text.slice(s.to);
  return { text: next, selected: next.slice(s.selFrom, s.selTo) };
}

describe("wrapInline", () => {
  it("wraps a selection in the marker and keeps it selected", () => {
    const text = "make bold here";
    const r = apply(text, wrapInline(text, 5, 9, "**"));
    expect(r.text).toBe("make **bold** here");
    expect(r.selected).toBe("bold");
  });

  it("unwraps when the selection is already wrapped just outside", () => {
    const text = "make **bold** here";
    // select "bold" (between the markers)
    const r = apply(text, wrapInline(text, 7, 11, "**"));
    expect(r.text).toBe("make bold here");
    expect(r.selected).toBe("bold");
  });

  it("unwraps when the markers are inside the selection", () => {
    const text = "make **bold** here";
    // select "**bold**"
    const r = apply(text, wrapInline(text, 5, 13, "**"));
    expect(r.text).toBe("make bold here");
    expect(r.selected).toBe("bold");
  });

  it("inserts an empty pair with the caret between on no selection", () => {
    const text = "x";
    const s = wrapInline(text, 1, 1, "**");
    const r = apply(text, s);
    expect(r.text).toBe("x****");
    expect(s.selFrom).toBe(3);
    expect(s.selTo).toBe(3);
  });

  it("handles single-character markers (inline code)", () => {
    const text = "run npm test";
    const r = apply(text, wrapInline(text, 4, 12, "`"));
    expect(r.text).toBe("run `npm test`");
    expect(r.selected).toBe("npm test");
  });

  it("handles strikethrough", () => {
    const text = "wrong";
    const r = apply(text, wrapInline(text, 0, 5, "~~"));
    expect(r.text).toBe("~~wrong~~");
  });
});

describe("setHeading", () => {
  it("adds a heading marker to a plain line", () => {
    const text = "Title\nbody";
    const r = apply(text, setHeading(text, 0, 0, 2));
    expect(r.text).toBe("## Title\nbody");
  });

  it("changes an existing heading level", () => {
    const text = "## Title";
    const r = apply(text, setHeading(text, 4, 4, 1));
    expect(r.text).toBe("# Title");
  });

  it("removes the heading when re-applying the current level", () => {
    const text = "### Title";
    const r = apply(text, setHeading(text, 5, 5, 3));
    expect(r.text).toBe("Title");
  });

  it("operates on the line containing the cursor, not the whole doc", () => {
    const text = "first\nsecond\nthird";
    const r = apply(text, setHeading(text, 8, 8, 1)); // cursor on "second"
    expect(r.text).toBe("first\n# second\nthird");
  });
});

describe("toggleLinePrefix", () => {
  it("adds a bullet to a single line", () => {
    const text = "item";
    const r = apply(text, toggleLinePrefix(text, 0, 4, "bullet"));
    expect(r.text).toBe("- item");
  });

  it("removes bullets when every line already has one", () => {
    const text = "- a\n- b";
    const r = apply(text, toggleLinePrefix(text, 0, 7, "bullet"));
    expect(r.text).toBe("a\nb");
  });

  it("numbers ordered lists sequentially", () => {
    const text = "a\nb\nc";
    const r = apply(text, toggleLinePrefix(text, 0, 5, "ordered"));
    expect(r.text).toBe("1. a\n2. b\n3. c");
  });

  it("adds blockquote markers and skips blank lines", () => {
    const text = "para\n\nmore";
    const r = apply(text, toggleLinePrefix(text, 0, text.length, "quote"));
    expect(r.text).toBe("> para\n\n> more");
  });

  it("toggles off a blockquote", () => {
    const text = "> quoted";
    const r = apply(text, toggleLinePrefix(text, 0, 8, "quote"));
    expect(r.text).toBe("quoted");
  });
});

describe("makeLink", () => {
  it("wraps selected text and selects the url placeholder", () => {
    const text = "see docs";
    const r = apply(text, makeLink(text, 4, 8));
    expect(r.text).toBe("see [docs](url)");
    expect(r.selected).toBe("url");
  });

  it("inserts a full placeholder with no selection and selects the text slot", () => {
    const text = "";
    const r = apply(text, makeLink(text, 0, 0));
    expect(r.text).toBe("[text](url)");
    expect(r.selected).toBe("text");
  });
});

describe("insertBlock", () => {
  it("inserts into empty text without stray blank lines", () => {
    const r = apply("", insertBlock("", 0, 0, "| a | b |\n| - | - |"));
    expect(r.text).toBe("| a | b |\n| - | - |");
  });

  it("separates the block from surrounding prose with blank lines", () => {
    const text = "before";
    const r = apply(text, insertBlock(text, 6, 6, "BLOCK"));
    expect(r.text).toBe("before\n\nBLOCK");
  });

  it("selects the placeholder token when present", () => {
    const text = "x\n";
    const s = insertBlock(text, 2, 2, "<tag-name>\n\n</tag-name>", "tag-name");
    const r = apply(text, s);
    expect(r.selected).toBe("tag-name");
  });

  it("replaces an existing selection", () => {
    const text = "keep DROP keep";
    const r = apply(text, insertBlock(text, 5, 9, "NEW"));
    expect(r.text).toBe("keep \n\nNEW\n\n keep");
  });
});
