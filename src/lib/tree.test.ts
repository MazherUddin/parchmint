import { describe, it, expect } from "vitest";
import { buildTree, ancestorChain, relativeDir } from "./tree";
import type { MarkdownFile } from "./api";

const FOLDER = "C:\\skills";

function file(rel: string): MarkdownFile {
  const path = `${FOLDER}\\${rel.replace(/\//g, "\\")}`;
  const parts = rel.split("/");
  return { name: parts[parts.length - 1], path };
}

describe("relativeDir", () => {
  it("returns '' for a file at the workspace root", () => {
    expect(relativeDir(FOLDER, `${FOLDER}\\readme.md`)).toBe("");
  });

  it("joins nested segments with forward slashes", () => {
    expect(relativeDir(FOLDER, `${FOLDER}\\a\\b\\c.md`)).toBe("a/b");
  });

  it("handles forward-slash paths", () => {
    expect(relativeDir("/home/x", "/home/x/a/b.md")).toBe("a");
  });
});

describe("ancestorChain", () => {
  it("returns [] for the root", () => {
    expect(ancestorChain("")).toEqual([]);
  });

  it("returns every prefix, outermost first", () => {
    expect(ancestorChain("a/b/c")).toEqual(["a", "a/b", "a/b/c"]);
  });
});

describe("buildTree", () => {
  it("puts root files on the root node", () => {
    const tree = buildTree(FOLDER, [file("readme.md")]);
    expect(tree.files.map((f) => f.name)).toEqual(["readme.md"]);
    expect(tree.dirs).toEqual([]);
  });

  it("nests directories instead of flattening full paths", () => {
    const tree = buildTree(FOLDER, [file("deprecated/qa/notes.md")]);
    expect(tree.dirs.map((d) => d.path)).toEqual(["deprecated"]);
    expect(tree.dirs[0].dirs.map((d) => d.path)).toEqual(["deprecated/qa"]);
    expect(tree.dirs[0].dirs[0].files.map((f) => f.name)).toEqual(["notes.md"]);
  });

  it("creates intermediate dirs that have no files of their own", () => {
    const tree = buildTree(FOLDER, [file("a/b/deep.md")]);
    const a = tree.dirs[0];
    expect(a.name).toBe("a");
    expect(a.files).toEqual([]);
    expect(a.dirs[0].name).toBe("b");
  });

  it("keeps a dir's own files and subdirs separate", () => {
    const tree = buildTree(FOLDER, [file("eng/skill.md"), file("eng/tdd/skill.md")]);
    const eng = tree.dirs[0];
    expect(eng.files.map((f) => f.name)).toEqual(["skill.md"]);
    expect(eng.dirs.map((d) => d.name)).toEqual(["tdd"]);
  });

  it("sorts dirs and files alphabetically at every level", () => {
    const tree = buildTree(FOLDER, [
      file("zeta/x.md"),
      file("alpha/y.md"),
      file("alpha/b.md"),
      file("alpha/a.md"),
    ]);
    expect(tree.dirs.map((d) => d.name)).toEqual(["alpha", "zeta"]);
    expect(tree.dirs[0].files.map((f) => f.name)).toEqual(["a.md", "b.md", "y.md"]);
  });

  it("does not duplicate a dir node shared by several files", () => {
    const tree = buildTree(FOLDER, [file("eng/a.md"), file("eng/b.md")]);
    expect(tree.dirs).toHaveLength(1);
    expect(tree.dirs[0].files).toHaveLength(2);
  });
});
