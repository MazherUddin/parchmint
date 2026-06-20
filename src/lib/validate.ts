import type { LintWarning } from "./lint";
import type { Frontmatter } from "./frontmatter";
import type { DocType } from "./docType";

// Per-type frontmatter / structure validation, surfaced in the Insights panel.
export function validateDocument(type: DocType, source: string, fm: Frontmatter): LintWarning[] {
  const warnings: LintWarning[] = [];

  if (fm.present && fm.error) {
    warnings.push({ severity: "warning", message: `Invalid frontmatter YAML: ${fm.error}` });
    return warnings; // can't validate fields against broken YAML
  }

  if (type === "skill") {
    const d = fm.data;
    if (!fm.present || !d) {
      warnings.push({
        severity: "warning",
        message: "Skill file is missing YAML frontmatter (needs 'name' and 'description')",
      });
    } else {
      if (typeof d.name !== "string" || !d.name.trim()) {
        warnings.push({ severity: "warning", message: "Skill frontmatter: 'name' is required" });
      }
      if (typeof d.description !== "string" || !d.description.trim()) {
        warnings.push({ severity: "warning", message: "Skill frontmatter: 'description' is required" });
      }
    }
  } else if (type === "adr") {
    if (!/^#\s+\S/m.test(source)) {
      warnings.push({ severity: "warning", message: "ADR has no top-level (#) title" });
    }
  }

  return warnings;
}
