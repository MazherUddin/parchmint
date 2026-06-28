import { useEffect, useMemo, useRef, useState } from "react";
import { fuzzyMatch, fuzzyRank } from "../lib/fuzzy";

export interface Command {
  id: string;
  /** Shown in the list and used as the primary search target. */
  title: string;
  /** Section heading the command is grouped under when the query is empty. */
  group: string;
  /** Right-aligned keyboard hint, already formatted (e.g. "Ctrl S"). */
  hint?: string;
  /** Extra words that should also match this command (not displayed). */
  keywords?: string;
  run: () => void;
}

export interface PaletteFile {
  name: string;
  path: string;
}

interface CommandPaletteProps {
  commands: Command[];
  files: PaletteFile[];
  folder: string | null;
  onOpenFile: (path: string) => void;
  onClose: () => void;
}

type Row =
  | { kind: "header"; label: string }
  | { kind: "command"; cmd: Command; positions: number[] }
  | { kind: "file"; file: PaletteFile; positions: number[]; rel: string };

const FILE_LIMIT = 50;

/** Relative display path for a workspace file (folder prefix stripped). */
function relativePath(path: string, folder: string | null): string {
  if (folder && path.toLowerCase().startsWith(folder.toLowerCase())) {
    return path.slice(folder.length).replace(/^[\\/]+/, "");
  }
  return path;
}

/** Split `text` into highlighted (matched) and plain runs for rendering. */
function highlight(text: string, positions: number[]): React.ReactNode {
  if (positions.length === 0) return text;
  const set = new Set(positions);
  const out: React.ReactNode[] = [];
  let run = "";
  let runMatched = false;
  const flush = (key: number) => {
    if (!run) return;
    out.push(runMatched ? <mark key={key}>{run}</mark> : <span key={key}>{run}</span>);
    run = "";
  };
  for (let i = 0; i < text.length; i++) {
    const matched = set.has(i);
    if (matched !== runMatched) {
      flush(i);
      runMatched = matched;
    }
    run += text[i];
  }
  flush(text.length);
  return out;
}

/**
 * Ctrl/Cmd-K palette: a single box for running any command and jumping to any
 * file in the workspace. An empty query lists every command grouped by section
 * (discovery); typing ranks commands and files by fuzzy match. A leading ">"
 * restricts results to commands. Owns Escape (capture phase) so closing it never
 * also drops the user out of zen mode — mirrors ShortcutsHelp.
 */
export function CommandPalette({ commands, files, folder, onOpenFile, onClose }: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);

  const commandsOnly = query.startsWith(">");
  const q = (commandsOnly ? query.slice(1) : query).trim();

  const rows = useMemo<Row[]>(() => {
    const result: Row[] = [];

    if (q === "") {
      // Discovery landing: every command, grouped by section, files hidden.
      let lastGroup = "";
      for (const cmd of commands) {
        if (cmd.group !== lastGroup) {
          result.push({ kind: "header", label: cmd.group });
          lastGroup = cmd.group;
        }
        result.push({ kind: "command", cmd, positions: [] });
      }
      return result;
    }

    // Command matches: by title, falling back to keywords (slightly penalised).
    const cmdMatches: { cmd: Command; score: number; positions: number[] }[] = [];
    for (const cmd of commands) {
      const titleMatch = fuzzyMatch(q, cmd.title);
      if (titleMatch) {
        cmdMatches.push({ cmd, score: titleMatch.score, positions: titleMatch.positions });
      } else if (cmd.keywords) {
        const kwMatch = fuzzyMatch(q, cmd.keywords);
        if (kwMatch) cmdMatches.push({ cmd, score: kwMatch.score - 5, positions: [] });
      }
    }
    cmdMatches.sort((a, b) => b.score - a.score);
    if (cmdMatches.length > 0) {
      result.push({ kind: "header", label: "Commands" });
      for (const m of cmdMatches) result.push({ kind: "command", cmd: m.cmd, positions: m.positions });
    }

    if (!commandsOnly && files.length > 0) {
      const ranked = fuzzyRank(q, files, (f) => f.name).slice(0, FILE_LIMIT);
      if (ranked.length > 0) {
        result.push({ kind: "header", label: "Files" });
        for (const r of ranked) {
          result.push({
            kind: "file",
            file: r.item,
            positions: r.result.positions,
            rel: relativePath(r.item.path, folder),
          });
        }
      }
    }
    return result;
  }, [q, commandsOnly, commands, files, folder]);

  // Indices of the selectable (non-header) rows, in display order.
  const selectable = useMemo(() => rows.map((r, i) => (r.kind === "header" ? -1 : i)).filter((i) => i >= 0), [rows]);

  // Reset the highlight to the first result whenever the result set changes.
  useEffect(() => setActive(0), [q, commandsOnly]);

  const activeRowIndex = selectable[active] ?? -1;

  // Keep the highlighted row in view as the user arrows through a long list.
  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>(`[data-row="${activeRowIndex}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [activeRowIndex]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const exec = (rowIndex: number) => {
    const row = rows[rowIndex];
    if (!row || row.kind === "header") return;
    onClose();
    if (row.kind === "command") row.cmd.run();
    else onOpenFile(row.file.path);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => (selectable.length ? (a + 1) % selectable.length : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => (selectable.length ? (a - 1 + selectable.length) % selectable.length : 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (activeRowIndex >= 0) exec(activeRowIndex);
    }
  };

  // Escape closes the palette and must not propagate to the global zen handler.
  useEffect(() => {
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener("keydown", onEsc, true);
    return () => window.removeEventListener("keydown", onEsc, true);
  }, [onClose]);

  return (
    <div className="palette-overlay" onClick={onClose}>
      <div className="palette" onClick={(e) => e.stopPropagation()}>
        <input
          ref={inputRef}
          className="palette-input"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Run a command, or type to find a file…   ( > for commands only )"
          spellCheck={false}
          autoComplete="off"
        />
        <div className="palette-list" ref={listRef}>
          {rows.length === 0 && <div className="palette-empty">No matches</div>}
          {rows.map((row, i) =>
            row.kind === "header" ? (
              <div key={`h${i}`} className="palette-header">
                {row.label}
              </div>
            ) : (
              <div
                key={row.kind === "command" ? row.cmd.id : row.file.path}
                data-row={i}
                className={"palette-row" + (i === activeRowIndex ? " active" : "")}
                onMouseMove={() => {
                  const sel = selectable.indexOf(i);
                  if (sel >= 0 && sel !== active) setActive(sel);
                }}
                onClick={() => exec(i)}
              >
                {row.kind === "command" ? (
                  <>
                    <span className="palette-title">{highlight(row.cmd.title, row.positions)}</span>
                    {row.cmd.hint && <span className="palette-hint">{row.cmd.hint}</span>}
                  </>
                ) : (
                  <>
                    <span className="palette-title">{highlight(row.file.name, row.positions)}</span>
                    <span className="palette-path">{row.rel}</span>
                  </>
                )}
              </div>
            ),
          )}
        </div>
      </div>
    </div>
  );
}
