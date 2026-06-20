import { Menu } from "./Menu";
import { RecentsMenu } from "./RecentsMenu";
import type { RecentsBundle } from "./RecentsMenu";
import type { DocType } from "../lib/docType";
import { DOC_TYPES, TYPE_LABELS } from "../lib/docType";

export type PaneMode = "source" | "split" | "preview";

export interface TabInfo {
  id: string;
  title: string;
  dirty: boolean;
  conflict?: "changed" | "deleted";
  flash?: boolean;
}

interface TabsProps {
  // Tab strip
  docs: TabInfo[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onClose: (id: string) => void;
  onNew: () => void;
  // Toolbar content
  onOpenFolder: () => void;
  onOpenFile: () => void;
  recentDocuments: RecentsBundle;
  recentWorkspaces: RecentsBundle;
  onNewTyped: (type: DocType) => void;
  onSave: () => void;
  canSave: boolean;
  onCopyAll: () => void;
  onCopySelection: () => void;
  onExportHtml: () => void;
  onExportPdf: () => void;
  // Layout controls
  paneMode: PaneMode;
  onPaneMode: (mode: PaneMode) => void;
  sidebarVisible: boolean;
  onToggleSidebar: () => void;
}

export function Tabs({
  docs, activeId, onSelect, onClose, onNew,
  onOpenFolder, onOpenFile, recentDocuments, recentWorkspaces,
  onNewTyped, onSave, canSave, onCopyAll, onCopySelection, onExportHtml, onExportPdf,
  paneMode, onPaneMode, sidebarVisible, onToggleSidebar,
}: TabsProps) {
  return (
    <div className="tabs">
      <div className="tabs-menus">
        <button
          className={"pane-btn sidebar-toggle" + (sidebarVisible ? " active" : "")}
          title="Toggle sidebar (Ctrl+B)"
          onClick={onToggleSidebar}
        >
          ▐
        </button>
        <div className="tabs-menus-sep" />
        <RecentsMenu primaryLabel="Open Folder" onPrimary={onOpenFolder} {...recentWorkspaces} />
        <RecentsMenu primaryLabel="Open File" onPrimary={onOpenFile} {...recentDocuments} />
        <Menu
          label="New ▾"
          items={DOC_TYPES.map((t) => ({ label: TYPE_LABELS[t], onClick: () => onNewTyped(t) }))}
        />
        <Menu
          label="Export ▾"
          items={[
            { label: "Copy as Markdown", onClick: onCopyAll },
            { label: "Copy selection", onClick: onCopySelection },
            { label: "Export to HTML…", onClick: onExportHtml },
            { label: "Export to PDF…", onClick: onExportPdf },
          ]}
        />
      </div>

      <div className="tabs-strip">
        {docs.map((t) => (
          <div
            key={t.id}
            className={"tab" + (t.id === activeId ? " active" : "")}
            onClick={() => onSelect(t.id)}
            title={t.title}
          >
            <span className="tab-title">{t.title}</span>
            {t.conflict && (
              <span
                className="tab-conflict"
                title={t.conflict === "deleted" ? "Deleted on disk" : "Changed on disk"}
              >
                {t.conflict === "deleted" ? "⚠" : "↻"}
              </span>
            )}
            {t.flash && <span className="tab-flash" title="Updated from disk" />}
            {t.dirty && <span className="tab-dirty">●</span>}
            <button
              className="tab-close"
              title="Close"
              onClick={(e) => {
                e.stopPropagation();
                onClose(t.id);
              }}
            >
              ×
            </button>
          </div>
        ))}
        <button className="tab-new" title="New document" onClick={onNew}>
          +
        </button>
      </div>

      <div className="tabs-actions">
        <div className="pane-switcher" role="group" aria-label="Layout">
          <button
            className={"pane-btn" + (paneMode === "source" ? " active" : "")}
            title="Source only (Ctrl+1)"
            onClick={() => onPaneMode("source")}
          >
            ◧
          </button>
          <button
            className={"pane-btn" + (paneMode === "split" ? " active" : "")}
            title="Split (Ctrl+2)"
            onClick={() => onPaneMode("split")}
          >
            ⬛
          </button>
          <button
            className={"pane-btn" + (paneMode === "preview" ? " active" : "")}
            title="Preview only (Ctrl+3)"
            onClick={() => onPaneMode("preview")}
          >
            ◨
          </button>
        </div>
        <button className="tabs-save" onClick={onSave} disabled={!canSave}>
          Save
        </button>
      </div>
    </div>
  );
}
