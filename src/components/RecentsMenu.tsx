import { useEffect, useState } from "react";
import type { RecentList } from "../lib/recents";
import { pathExists } from "../lib/api";

/** Everything a recents dropdown needs for one kind (Documents or Workspaces). */
export interface RecentsBundle {
  /** The Recent + Pinned entries for this kind. */
  list: RecentList;
  /** Shown when there are no recent (non-pinned) entries. */
  emptyHint: string;
  /** Render a path as its display label (basename / folder name). */
  displayName: (path: string) => string;
  onOpen: (path: string) => void;
  onPin: (path: string) => void;
  onUnpin: (path: string) => void;
  onRemove: (path: string) => void;
  onClearRecent: () => void;
}

type RecentsMenuProps = RecentsBundle & {
  /** Primary action label, e.g. "Open File" / "Open Folder". */
  primaryLabel: string;
  /** Click the main button — opens the native dialog. */
  onPrimary: () => void;
};

/**
 * Split button: clicking the label runs the open dialog; the caret reveals the
 * Pinned + Recent lists for this kind. Stale entries (path no longer on disk)
 * are greyed and disabled — existence is checked each time the menu opens.
 */
export function RecentsMenu({
  primaryLabel,
  onPrimary,
  list,
  emptyHint,
  displayName,
  onOpen,
  onPin,
  onUnpin,
  onRemove,
  onClearRecent,
}: RecentsMenuProps) {
  const [open, setOpen] = useState(false);
  const [missing, setMissing] = useState<Set<string>>(new Set());

  // Stat every visible path when the menu opens so dead entries grey out.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const paths = [...list.pinned, ...list.recent];
    void (async () => {
      const gone = new Set<string>();
      await Promise.all(
        paths.map(async (p) => {
          try {
            if (!(await pathExists(p))) gone.add(p);
          } catch {
            /* treat check failure as "present" — don't falsely disable */
          }
        }),
      );
      if (!cancelled) setMissing(gone);
    })();
    return () => {
      cancelled = true;
    };
  }, [open, list]);

  const close = () => setOpen(false);

  const row = (path: string, pinned: boolean) => {
    const gone = missing.has(path);
    return (
      <div className={"recent-row" + (gone ? " missing" : "")} key={path}>
        <button
          className="recent-open"
          disabled={gone}
          title={gone ? `Missing: ${path}` : path}
          onClick={() => {
            onOpen(path);
            close();
          }}
        >
          <span className="recent-name">{displayName(path)}</span>
          <span className="recent-path">{path}</span>
        </button>
        <button
          className={"recent-act recent-pin" + (pinned ? " on" : "")}
          title={pinned ? "Unpin" : "Pin"}
          onClick={() => (pinned ? onUnpin(path) : onPin(path))}
        >
          📌
        </button>
        <button
          className="recent-act recent-remove"
          title="Remove from list"
          onClick={() => onRemove(path)}
        >
          ×
        </button>
      </div>
    );
  };

  return (
    <div className="split-btn">
      <button className="split-primary" onClick={onPrimary}>
        {primaryLabel}
      </button>
      <button
        className="split-caret"
        title={`Recent — ${primaryLabel}`}
        aria-label={`Recent ${primaryLabel}`}
        onClick={() => setOpen((o) => !o)}
      >
        ▾
      </button>
      {open && (
        <>
          <div className="menu-backdrop" onClick={close} />
          <div className="recents-list">
            {list.pinned.length > 0 && (
              <>
                <div className="recents-section">Pinned</div>
                {list.pinned.map((p) => row(p, true))}
              </>
            )}
            <div className="recents-section">Recent</div>
            {list.recent.length > 0 ? (
              list.recent.map((p) => row(p, false))
            ) : (
              <div className="recents-empty">{emptyHint}</div>
            )}
            <div className="recents-divider" />
            <button
              className="recents-clear"
              disabled={list.recent.length === 0}
              onClick={() => {
                onClearRecent();
                close();
              }}
            >
              Clear recent
            </button>
          </div>
        </>
      )}
    </div>
  );
}
