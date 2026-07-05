import { describe, it, expect } from "vitest";
import { classifyLink, isMarkdownTarget } from "./linkNav";

describe("classifyLink", () => {
  it("classifies a bare relative .md link as local", () => {
    expect(classifyLink("GLOSSARY.md")).toEqual({ kind: "local", target: "GLOSSARY.md" });
  });

  it("classifies ./ and ../ relative paths as local", () => {
    expect(classifyLink("./sub/notes.md")).toEqual({ kind: "local", target: "./sub/notes.md" });
    expect(classifyLink("../up.md")).toEqual({ kind: "local", target: "../up.md" });
  });

  it("strips an in-target fragment", () => {
    expect(classifyLink("GLOSSARY.md#predictability")).toEqual({
      kind: "local",
      target: "GLOSSARY.md",
    });
  });

  it("decodes percent-escapes in local targets", () => {
    expect(classifyLink("My%20Notes.md")).toEqual({ kind: "local", target: "My Notes.md" });
  });

  it("keeps a malformed percent-escape as-is", () => {
    expect(classifyLink("bad%2.md")).toEqual({ kind: "local", target: "bad%2.md" });
  });

  it("treats a Windows drive path as local, not a URL scheme", () => {
    expect(classifyLink("C:\\docs\\a.md")).toEqual({ kind: "local", target: "C:\\docs\\a.md" });
    expect(classifyLink("C:/docs/a.md")).toEqual({ kind: "local", target: "C:/docs/a.md" });
  });

  it("leaves in-page anchors to the webview", () => {
    expect(classifyLink("#section")).toEqual({ kind: "none" });
    expect(classifyLink("#")).toEqual({ kind: "none" });
  });

  it("leaves inert schemes to the webview", () => {
    expect(classifyLink("data:image/png;base64,x")).toEqual({ kind: "none" });
    expect(classifyLink("blob:abc")).toEqual({ kind: "none" });
    expect(classifyLink("asset://localhost/x")).toEqual({ kind: "none" });
    expect(classifyLink("javascript:alert(1)")).toEqual({ kind: "none" });
  });

  it("routes web and mailto links to the system browser", () => {
    expect(classifyLink("https://example.com/a")).toEqual({
      kind: "external",
      url: "https://example.com/a",
    });
    expect(classifyLink("http://example.com")).toEqual({
      kind: "external",
      url: "http://example.com",
    });
    expect(classifyLink("mailto:a@b.c")).toEqual({ kind: "external", url: "mailto:a@b.c" });
  });

  it("routes unknown multi-letter schemes external", () => {
    expect(classifyLink("vscode://file/x")).toEqual({ kind: "external", url: "vscode://file/x" });
  });

  it("returns none for empty or missing hrefs", () => {
    expect(classifyLink("")).toEqual({ kind: "none" });
    expect(classifyLink("   ")).toEqual({ kind: "none" });
    expect(classifyLink(null)).toEqual({ kind: "none" });
    expect(classifyLink(undefined)).toEqual({ kind: "none" });
  });
});

describe("isMarkdownTarget", () => {
  it("accepts .md and .markdown regardless of case", () => {
    expect(isMarkdownTarget("GLOSSARY.md")).toBe(true);
    expect(isMarkdownTarget("README.MD")).toBe(true);
    expect(isMarkdownTarget("notes.markdown")).toBe(true);
  });

  it("rejects other extensions", () => {
    expect(isMarkdownTarget("logo.png")).toBe(false);
    expect(isMarkdownTarget("data.json")).toBe(false);
    expect(isMarkdownTarget("md")).toBe(false);
  });
});
