import { KNOWN_HTML_TAGS } from "./htmlTags";

export interface LintWarning {
  severity: "warning" | "info";
  message: string;
  line?: number;
}

export interface RelLink {
  target: string;
  line: number;
}

const VOID_TAGS = new Set([
  "area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta",
  "param", "source", "track", "wbr",
]);

function isPseudoTag(tag: string): boolean {
  return !KNOWN_HTML_TAGS.has(tag.toLowerCase());
}

// Blank out fenced code blocks and inline code spans (preserving newlines) so the
// scanners below don't treat literal tags/links inside code as structural.
function maskCode(src: string): string {
  const lines = src.split("\n");
  let inFence = false;
  let fenceMarker = "";
  const out: string[] = [];
  for (const line of lines) {
    const trimmed = line.trimStart();
    const fence = trimmed.match(/^(```|~~~)/);
    if (fence) {
      const marker = fence[1];
      if (!inFence) {
        inFence = true;
        fenceMarker = marker;
        out.push(" ".repeat(line.length));
        continue;
      }
      if (trimmed.startsWith(fenceMarker)) {
        inFence = false;
        out.push(" ".repeat(line.length));
        continue;
      }
    }
    if (inFence) {
      out.push(" ".repeat(line.length));
      continue;
    }
    out.push(line.replace(/`[^`]*`/g, (m) => " ".repeat(m.length)));
  }
  return out.join("\n");
}

function lineOf(src: string, index: number): number {
  let line = 1;
  const end = Math.min(index, src.length);
  for (let i = 0; i < end; i++) if (src[i] === "\n") line++;
  return line;
}

function checkPseudoTags(masked: string, original: string): LintWarning[] {
  const warnings: LintWarning[] = [];
  const re = /<(\/?)([a-zA-Z][\w-]*)([^>]*?)(\/?)>/g;
  const stack: { name: string; index: number }[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(masked))) {
    const name = m[2];
    if (!isPseudoTag(name)) continue;
    const closing = m[1] === "/";
    const selfClose = m[4] === "/" || VOID_TAGS.has(name.toLowerCase());
    if (selfClose) continue;
    const lower = name.toLowerCase();
    if (!closing) {
      stack.push({ name: lower, index: m.index });
    } else {
      let found = -1;
      for (let i = stack.length - 1; i >= 0; i--) {
        if (stack[i].name === lower) {
          found = i;
          break;
        }
      }
      if (found === -1) {
        warnings.push({
          severity: "warning",
          message: `Stray closing tag </${name}> with no matching opener`,
          line: lineOf(original, m.index),
        });
      } else {
        stack.splice(found, 1);
      }
    }
  }
  for (const open of stack) {
    warnings.push({
      severity: "warning",
      message: `Unclosed pseudo-tag <${open.name}>`,
      line: lineOf(original, open.index),
    });
  }
  return warnings;
}

function checkWhitespace(src: string): LintWarning[] {
  const warnings: LintWarning[] = [];
  const hasBom = src.charCodeAt(0) === 0xfeff;
  if (hasBom) {
    warnings.push({ severity: "info", message: "File begins with a byte-order mark (BOM)" });
  }
  const body = hasBom ? src.slice(1) : src;
  const zeroWidth = (body.match(/[​-‍⁠﻿]/g) || []).length;
  if (zeroWidth > 0) {
    warnings.push({
      severity: "warning",
      message: `${zeroWidth} zero-width / invisible character(s) present`,
    });
  }
  const nbsp = (body.match(/ /g) || []).length;
  if (nbsp > 0) {
    warnings.push({
      severity: "info",
      message: `${nbsp} non-breaking space(s) present`,
    });
  }
  return warnings;
}

export function lintDocument(source: string): LintWarning[] {
  const masked = maskCode(source);
  return [...checkPseudoTags(masked, source), ...checkWhitespace(source)];
}

// Markdown links/images whose target is a local relative path (candidates for an
// existence check). External URLs and pure anchors are skipped.
export function extractRelativeLinks(source: string): RelLink[] {
  const masked = maskCode(source);
  const re = /\[[^\]]*\]\(([^)]+)\)/g;
  const links: RelLink[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(masked))) {
    let target = m[1].trim();
    const sp = target.search(/\s/);
    if (sp !== -1) target = target.slice(0, sp); // drop optional "title"
    if (!target) continue;
    if (/^(https?:|mailto:|tel:|data:|#|\/\/)/i.test(target)) continue;
    links.push({ target, line: lineOf(source, m.index) });
  }
  return links;
}
