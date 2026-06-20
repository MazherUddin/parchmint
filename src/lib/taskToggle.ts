// Flip a GitHub task-list checkbox marker on a single source line.
// `lineIndex` is 0-based (matches markdown-it's token.map[0], which is what the
// preview stamps onto each checkbox as data-task-line). Only the task marker is
// touched — list bullet, indentation, and the item text are left untouched.
// Supports `-`/`*`/`+` and ordered (`1.` / `1)`) bullets. If the target line
// isn't a task item (race during a fast edit), the content is returned unchanged.
const TASK_MARKER = /^(\s*(?:[-*+]|\d+[.)])\s+\[)[ xX](\])/;

export function toggleTaskLine(content: string, lineIndex: number, checked: boolean): string {
  const lines = content.split("\n");
  if (lineIndex < 0 || lineIndex >= lines.length) return content;
  const marker = checked ? "x" : " ";
  const next = lines[lineIndex].replace(TASK_MARKER, `$1${marker}$2`);
  if (next === lines[lineIndex]) return content;
  lines[lineIndex] = next;
  return lines.join("\n");
}
