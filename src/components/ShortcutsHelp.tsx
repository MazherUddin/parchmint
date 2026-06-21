import { useEffect, useMemo } from "react";
import { SHORTCUT_GROUPS, isMacPlatform, formatToken } from "../lib/shortcuts";

interface ShortcutsHelpProps {
  onClose: () => void;
  onAbout: () => void;
}

/**
 * Cheatsheet overlay: every keyboard shortcut plus the non-obvious mouse
 * interactions (right-click-to-edit, checkbox toggle, outline jump). Mirrors the
 * ConflictCompare modal pattern. Owns Escape while open and stops it propagating
 * so closing the sheet never also drops the user out of zen mode.
 */
export function ShortcutsHelp({ onClose, onAbout }: ShortcutsHelpProps) {
  const mac = useMemo(() => isMacPlatform(), []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
    };
    // Capture phase so this wins over the global zen Escape handler.
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [onClose]);

  return (
    <div className="help-overlay" onClick={onClose}>
      <div className="help-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="help-header">
          <span className="help-title">Shortcuts &amp; interactions</span>
          <button className="tab-close" title="Close" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="help-groups">
          {SHORTCUT_GROUPS.map((group) => (
            <section key={group.title} className="help-group">
              <h3 className="help-group-title">{group.title}</h3>
              <ul className="help-rows">
                {group.rows.map((row, i) => (
                  <li key={i} className="help-row">
                    <span className="help-keys">
                      {row.kind === "key" ? (
                        row.combo.map((chord, ci) => (
                          <span key={ci} className="help-chord">
                            {ci > 0 && <span className="help-then">then</span>}
                            {chord.map((token, ti) => (
                              <kbd key={ti}>{formatToken(token, mac)}</kbd>
                            ))}
                          </span>
                        ))
                      ) : (
                        <kbd className="kbd-gesture">{row.gesture}</kbd>
                      )}
                    </span>
                    <span className="help-desc">{row.desc}</span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
        <div className="help-foot">
          <span>
            Press <kbd>{formatToken("mod", mac)}</kbd><kbd>/</kbd> any time to reopen this.
          </span>
          <span className="help-foot-spacer" />
          <button className="about-link" onClick={onAbout}>
            About Parchmint
          </button>
        </div>
      </div>
    </div>
  );
}
