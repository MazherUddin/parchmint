export type DocType = "skill" | "adr" | "generic" | "plain";

export const DOC_TYPES: DocType[] = ["skill", "adr", "generic", "plain"];

export const TYPE_LABELS: Record<DocType, string> = {
  skill: "Skill file",
  adr: "ADR",
  generic: "Generic frontmatter",
  plain: "Plain Markdown",
};

function basename(p: string): string {
  return p.split(/[\\/]/).pop() ?? p;
}

// Non-invasive type detection: infer from frontmatter shape, filename, and
// location only. Never writes anything back into the document (see ADR-0003).
export function detectType(
  path: string | null,
  data: Record<string, unknown> | null,
  hasFrontmatter: boolean,
): DocType {
  if (data && typeof data.name === "string" && typeof data.description === "string") {
    return "skill";
  }
  if (path) {
    const base = basename(path).toLowerCase();
    if (base === "skill.md") return "skill";
    if (/[\\/]docs[\\/]adr[\\/]/i.test(path) || /^\d{4}-.+\.md$/i.test(base)) return "adr";
  }
  if (hasFrontmatter) return "generic";
  return "plain";
}

export const TEMPLATES: Record<DocType, string> = {
  skill: [
    "---",
    "name: skill-name",
    "description: One sentence on when this skill should be used.",
    "---",
    "",
    "# Instructions",
    "",
    "Explain what to do when this skill runs.",
    "",
  ].join("\n"),
  adr: [
    "# Short title of the decision",
    "",
    "**Context.** What is the situation that calls for a decision?",
    "",
    "**Decision.** What did we decide, and why?",
    "",
    "**Consequences.** What follows from this choice?",
    "",
  ].join("\n"),
  generic: ["---", "title: Untitled", "---", "", "# Untitled", "", ""].join("\n"),
  plain: "",
};
