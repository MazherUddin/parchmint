import type { MarkdownFile } from "./api";

/** A directory node in the workspace file tree. The root has path "" and name "". */
export interface TreeDir {
  /** Own segment name ("design-an-interface"). */
  name: string;
  /** Path relative to the workspace root, "/"-separated ("deprecated/design-an-interface"). */
  path: string;
  /** Child directories, sorted alphabetically. */
  dirs: TreeDir[];
  /** Files directly in this directory, sorted alphabetically by name. */
  files: MarkdownFile[];
}

/** Sub-folder of a file relative to the workspace root ("" means root). */
export function relativeDir(folder: string, filePath: string): string {
  let rel = filePath.startsWith(folder) ? filePath.slice(folder.length) : filePath;
  rel = rel.replace(/^[\\/]+/, "");
  const parts = rel.split(/[\\/]/);
  parts.pop(); // drop the filename
  return parts.join("/");
}

/** All ancestor paths of a relative dir, outermost first: "a/b/c" → ["a", "a/b", "a/b/c"]. */
export function ancestorChain(relDir: string): string[] {
  if (relDir === "") return [];
  const parts = relDir.split("/");
  return parts.map((_, i) => parts.slice(0, i + 1).join("/"));
}

/**
 * Build the nested directory tree for the sidebar from a flat file listing.
 * Intermediate directories appear even when they hold no files directly.
 */
export function buildTree(folder: string, files: MarkdownFile[]): TreeDir {
  const root: TreeDir = { name: "", path: "", dirs: [], files: [] };
  const byPath = new Map<string, TreeDir>([["", root]]);

  const dirFor = (path: string): TreeDir => {
    const existing = byPath.get(path);
    if (existing) return existing;
    const cut = path.lastIndexOf("/");
    const node: TreeDir = { name: path.slice(cut + 1), path, dirs: [], files: [] };
    byPath.set(path, node);
    dirFor(cut === -1 ? "" : path.slice(0, cut)).dirs.push(node);
    return node;
  };

  for (const f of files) dirFor(relativeDir(folder, f.path)).files.push(f);

  for (const node of byPath.values()) {
    node.dirs.sort((a, b) => a.name.localeCompare(b.name));
    node.files.sort((a, b) => a.name.localeCompare(b.name));
  }
  return root;
}
