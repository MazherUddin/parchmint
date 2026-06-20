import { useEffect, useRef } from "react";
import { MergeView } from "@codemirror/merge";
import { EditorView } from "@codemirror/view";
import { markdown, markdownLanguage } from "@codemirror/lang-markdown";

interface ConflictCompareProps {
  /** The user's current (unsaved) buffer. */
  mine: string;
  /** The version currently on disk. */
  disk: string;
  onTakeDisk: () => void;
  onKeepMine: () => void;
  onClose: () => void;
}

/**
 * Modal overlay showing a side-by-side diff of the user's buffer (left) against
 * the on-disk version (right) via @codemirror/merge, so a real edit-vs-agent
 * clash can be inspected before choosing. Both sides are read-only.
 */
export function ConflictCompare({ mine, disk, onTakeDisk, onKeepMine, onClose }: ConflictCompareProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const readOnly = [EditorView.editable.of(false), markdown({ base: markdownLanguage })];
    const view = new MergeView({
      parent: host,
      a: { doc: mine, extensions: readOnly },
      b: { doc: disk, extensions: readOnly },
    });
    return () => view.destroy();
  }, [mine, disk]);

  return (
    <div className="compare-overlay" onClick={onClose}>
      <div className="compare-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="compare-header">
          <span>Compare — left: yours · right: disk</span>
          <button className="tab-close" title="Close" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="compare-body" ref={hostRef} />
        <div className="compare-actions">
          <button onClick={onKeepMine}>Keep mine</button>
          <button className="primary" onClick={onTakeDisk}>
            Take disk
          </button>
        </div>
      </div>
    </div>
  );
}
