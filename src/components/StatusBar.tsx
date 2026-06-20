import { useState } from "react";
import type { DocType } from "../lib/docType";
import { DOC_TYPES, TYPE_LABELS } from "../lib/docType";
import type { LintWarning } from "../lib/lint";

interface StatusBarProps {
  tokens: number;
  chars: number;
  lines: number;
  path: string | null;
  detected: DocType;
  override: DocType | null;
  onChangeType: (type: DocType | null) => void;
  warnings: LintWarning[];
  onShowHelp: () => void;
}

export function StatusBar({ tokens, chars, lines, path, detected, override, onChangeType, warnings, onShowHelp }: StatusBarProps) {
  const [warningsOpen, setWarningsOpen] = useState(false);
  const count = warnings.length;

  return (
    <footer className="statusbar">
      <label className="type-select">
        <span className="type-select-label">Type:</span>
        <select
          value={override ?? "auto"}
          onChange={(e) =>
            onChangeType(e.target.value === "auto" ? null : (e.target.value as DocType))
          }
        >
          <option value="auto">Auto · {TYPE_LABELS[detected]}</option>
          {DOC_TYPES.map((t) => (
            <option key={t} value={t}>
              {TYPE_LABELS[t]}
            </option>
          ))}
        </select>
      </label>
      <span className="status-path" title={path ?? undefined}>
        {path ?? "Unsaved document"}
      </span>
      <span className="status-spacer" />
      <span title="Approximate — counted with o200k_base (see ADR-0002)">
        ~{tokens.toLocaleString()} tokens
      </span>
      <span>{chars.toLocaleString()} chars</span>
      <span>{lines.toLocaleString()} lines</span>
      <div className="issues-wrap">
        <button
          className={"issues-badge" + (count ? " has-issues" : "")}
          onClick={() => setWarningsOpen((o) => !o)}
        >
          {count === 0 ? "No issues" : `${count} issue${count === 1 ? "" : "s"}`}
        </button>
        {warningsOpen && (
          <>
            <div className="menu-backdrop" onClick={() => setWarningsOpen(false)} />
            <div className="issues-popover">
              {count === 0 ? (
                <p className="issues-empty">No issues detected.</p>
              ) : (
                <ul className="warning-list">
                  {warnings.map((w, i) => (
                    <li key={i} className={"warning warning-" + w.severity}>
                      <span className="warning-dot" />
                      <span className="warning-msg">{w.message}</span>
                      {w.line != null && <span className="warning-line">line {w.line}</span>}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        )}
      </div>
      <button className="help-button" title="Shortcuts & help (Ctrl / ⌘ + /)" onClick={onShowHelp}>
        ?
      </button>
    </footer>
  );
}
