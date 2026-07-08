import { useEffect, useMemo, useState } from "react";
import type { MarkdownFile } from "../lib/api";
import type { Heading } from "../lib/outline";
import { ancestorChain, buildTree, relativeDir, type TreeDir } from "../lib/tree";

interface SidebarProps {
  folder: string | null;
  files: MarkdownFile[];
  activePath: string | null;
  onSelect: (file: MarkdownFile) => void;
  onOpenFolder: () => void;
  outline: Heading[];
  activeLine: number | null;
  onNavigate: (heading: Heading) => void;
}

function folderName(p: string): string {
  const parts = p.split(/[\\/]/).filter(Boolean);
  return parts[parts.length - 1] ?? p;
}

const INDENT = 12;

interface TreeNodeProps {
  dir: TreeDir;
  depth: number;
  expanded: Record<string, boolean>;
  onToggle: (path: string) => void;
  activePath: string | null;
  onSelect: (file: MarkdownFile) => void;
}

/** One directory row plus, when expanded, its children (dirs first, then files). */
function TreeNode({ dir, depth, expanded, onToggle, activePath, onSelect }: TreeNodeProps) {
  const open = !!expanded[dir.path];
  return (
    <div className="tree-dir">
      <button
        className="group-header"
        style={{ paddingLeft: depth * INDENT + 6 }}
        onClick={() => onToggle(dir.path)}
        title={dir.path}
      >
        <span className="group-caret">{open ? "▾" : "▸"}</span>
        <span className="tree-label">{dir.name}</span>
      </button>
      {open && (
        <TreeChildren
          dir={dir}
          depth={depth + 1}
          expanded={expanded}
          onToggle={onToggle}
          activePath={activePath}
          onSelect={onSelect}
        />
      )}
    </div>
  );
}

function TreeChildren({ dir, depth, expanded, onToggle, activePath, onSelect }: TreeNodeProps) {
  return (
    <>
      {dir.dirs.map((d) => (
        <TreeNode
          key={d.path}
          dir={d}
          depth={depth}
          expanded={expanded}
          onToggle={onToggle}
          activePath={activePath}
          onSelect={onSelect}
        />
      ))}
      {dir.files.length > 0 && (
        <ul className="file-list">
          {dir.files.map((f) => (
            <li key={f.path}>
              <button
                className={"file-item" + (f.path === activePath ? " active" : "")}
                style={{ paddingLeft: depth * INDENT + 8 }}
                onClick={() => onSelect(f)}
                title={f.path}
              >
                {f.name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

export function Sidebar({ folder, files, activePath, onSelect, onOpenFolder, outline, activeLine, onNavigate }: SidebarProps) {
  // Folders start collapsed; only the active file's ancestor chain is auto-expanded.
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setExpanded({});
  }, [folder]);

  useEffect(() => {
    if (!activePath || !folder) return;
    const chain = ancestorChain(relativeDir(folder, activePath));
    if (chain.length === 0) return;
    setExpanded((e) => {
      if (chain.every((k) => e[k])) return e;
      const next = { ...e };
      for (const k of chain) next[k] = true;
      return next;
    });
  }, [folder, activePath]);

  const tree = useMemo(() => (folder ? buildTree(folder, files) : null), [folder, files]);

  const toggle = (k: string) => setExpanded((e) => ({ ...e, [k]: !e[k] }));

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <span className="sidebar-title" title={folder ?? undefined}>
          {folder ? folderName(folder) : "No folder"}
        </span>
        <button className="link-btn" onClick={onOpenFolder}>
          Open…
        </button>
      </div>
      <div className="sidebar-files">
        {files.length === 0 || !tree ? (
          <p className="sidebar-empty">
            {folder ? "No Markdown files found." : "Open a folder to browse Markdown files."}
          </p>
        ) : (
          <div className="file-tree">
            <TreeChildren
              dir={tree}
              depth={0}
              expanded={expanded}
              onToggle={toggle}
              activePath={activePath}
              onSelect={onSelect}
            />
          </div>
        )}
      </div>
      <div className="sidebar-outline">
        <div className="sidebar-section-label">Outline</div>
        {outline.length === 0 ? (
          <p className="sidebar-empty">No headings.</p>
        ) : (
          <ul className="outline-list">
            {outline.map((h, i) => (
              <li key={i} className="outline-item" style={{ paddingLeft: (h.level - 1) * 14 + 4 }}>
                <button
                  className={"outline-link" + (h.line === activeLine ? " active" : "")}
                  onClick={() => onNavigate(h)}
                  title={h.text || "(empty)"}
                >
                  <span className="outline-level">H{h.level}</span>
                  <span className="outline-text">{h.text || "(empty)"}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </aside>
  );
}
