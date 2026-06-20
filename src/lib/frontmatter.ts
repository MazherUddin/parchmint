import { load } from "js-yaml";

export interface Frontmatter {
  /** Whether a leading `---` … `---` block is present. */
  present: boolean;
  /** Parsed mapping, or null if absent / not a mapping / failed to parse. */
  data: Record<string, unknown> | null;
  /** YAML parse error message, if any. */
  error: string | null;
  /** 1-based line on which the document body begins. */
  bodyLine: number;
}

const EMPTY: Frontmatter = { present: false, data: null, error: null, bodyLine: 1 };

export function parseFrontmatter(src: string): Frontmatter {
  const norm = src.charCodeAt(0) === 0xfeff ? src.slice(1) : src;
  const m = norm.match(/^---\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)/);
  if (!m) return EMPTY;
  const bodyLine = m[0].split("\n").length;
  try {
    const data = load(m[1]);
    if (data && typeof data === "object" && !Array.isArray(data)) {
      return { present: true, data: data as Record<string, unknown>, error: null, bodyLine };
    }
    return { present: true, data: null, error: "Frontmatter is not a key/value mapping", bodyLine };
  } catch (e) {
    return { present: true, data: null, error: (e as Error).message, bodyLine };
  }
}
