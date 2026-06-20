import { useState } from "react";
import type { MarkdownFile } from "../lib/api";
import type { Heading } from "../lib/outline";

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

/** Sub-folder of a file relative to the workspace root ("" means root). */
function relativeDir(folder: string, filePath: string): string {
  let rel = filePath.startsWith(folder) ? filePath.slice(folder.length) : filePath;
  rel = rel.replace(/^[\\/]+/, "");
  const parts = rel.split(/[\\/]/);
  parts.pop(); // drop the filename
  return parts.join("/");
}

export function Sidebar({ folder, files, activePath, onSelect, onOpenFolder, outline, activeLine, onNavigate }: SidebarProps) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const groups = new Map<string, MarkdownFile[]>();
  for (const f of files) {
    const key = folder ? relativeDir(folder, f.path) : "";
    const arr = groups.get(key);
    if (arr) arr.push(f);
    else groups.set(key, [f]);
  }
  const groupKeys = Array.from(groups.keys()).sort((a, b) => {
    if (a === "") return -1;
    if (b === "") return 1;
    return a.localeCompare(b);
  });

  const toggle = (k: string) => setCollapsed((c) => ({ ...c, [k]: !c[k] }));

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
      {files.length === 0 ? (
        <p className="sidebar-empty">
          {folder ? "No Markdown files found." : "Open a folder to browse Markdown files."}
        </p>
      ) : (
        <div className="file-tree">
          {groupKeys.map((key) => (
            <div className="file-group" key={key || "."}>
              {key !== "" && (
                <button className="group-header" onClick={() => toggle(key)}>
                  <span className="group-caret">{collapsed[key] ? "▸" : "▾"}</span>
                  {key}
                </button>
              )}
              {!collapsed[key] && (
                <ul className="file-list">
                  {groups.get(key)!.map((f) => (
                    <li key={f.path}>
                      <button
                        className={"file-item" + (f.path === activePath ? " active" : "")}
                        onClick={() => onSelect(f)}
                        title={f.path}
                      >
                        {f.name}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}
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
