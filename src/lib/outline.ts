import type { LintWarning } from "./lint";

export interface Heading {
  level: number;
  text: string;
  line: number;
}

export function buildOutline(src: string): Heading[] {
  const lines = src.split("\n");
  const headings: Heading[] = [];
  let inFence = false;
  let marker = "";
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trimStart();
    const fence = trimmed.match(/^(```|~~~)/);
    if (fence) {
      if (!inFence) {
        inFence = true;
        marker = fence[1];
      } else if (trimmed.startsWith(marker)) {
        inFence = false;
      }
      continue;
    }
    if (inFence) continue;
    const h = line.match(/^(#{1,6})\s+(.*?)\s*#*\s*$/);
    if (h) headings.push({ level: h[1].length, text: h[2].trim(), line: i + 1 });
  }
  return headings;
}

export function outlineWarnings(headings: Heading[]): LintWarning[] {
  const warnings: LintWarning[] = [];
  const seen = new Map<string, number>();
  let prevLevel = 0;
  for (const h of headings) {
    if (!h.text) {
      warnings.push({ severity: "info", message: "Empty heading", line: h.line });
    }
    if (prevLevel && h.level > prevLevel + 1) {
      warnings.push({
        severity: "info",
        message: `Heading level jumps from H${prevLevel} to H${h.level}`,
        line: h.line,
      });
    }
    prevLevel = h.level;
    if (h.text) {
      const key = h.text.toLowerCase();
      const count = (seen.get(key) ?? 0) + 1;
      seen.set(key, count);
      if (count === 2) {
        warnings.push({ severity: "info", message: `Duplicate heading: "${h.text}"`, line: h.line });
      }
    }
  }
  return warnings;
}
