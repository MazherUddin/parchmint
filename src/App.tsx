import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { EditorView } from "@codemirror/view";
import { Tabs } from "./components/Tabs";
import type { PaneMode } from "./components/Tabs";
import { Sidebar } from "./components/Sidebar";
import { SplitPane } from "./components/SplitPane";
import { SourcePane } from "./components/SourcePane";
import { PreviewPane } from "./components/PreviewPane";
import { StatusBar } from "./components/StatusBar";
import { ConflictBanner } from "./components/ConflictBanner";
import type { ConflictKind } from "./components/ConflictBanner";
import { ConflictCompare } from "./components/ConflictCompare";
import { ShortcutsHelp } from "./components/ShortcutsHelp";
import { AboutDialog } from "./components/AboutDialog";
import { renderPreview } from "./lib/preview";
import { toggleTaskLine } from "./lib/taskToggle";
import { countTokens } from "./lib/tokens";
import { lintDocument, extractRelativeLinks } from "./lib/lint";
import type { LintWarning } from "./lib/lint";
import { parseFrontmatter } from "./lib/frontmatter";
import { detectType, TEMPLATES } from "./lib/docType";
import type { DocType } from "./lib/docType";
import { validateDocument } from "./lib/validate";
import { buildOutline, outlineWarnings } from "./lib/outline";
import type { Heading } from "./lib/outline";
import { buildStandaloneHtml } from "./lib/exporter";
import type { MarkdownFile } from "./lib/api";
import {
  listMarkdownFiles,
  openFolderDialog,
  openFileDialog,
  saveFileDialog,
  saveHtmlDialog,
  readTextFile,
  writeTextFile,
  linkExists,
  pathExists,
  takeLaunchFile,
  onOpenFile,
  setWatchRoots,
  onFileChanged,
  loadRecents,
  saveRecents,
  onCloseRequested,
  confirmDiscard,
} from "./lib/api";
import type { RecentsState } from "./lib/recents";
import {
  emptyRecents,
  record as recordRecent,
  pin as pinRecent,
  unpin as unpinRecent,
  remove as removeRecent,
  clearRecent as clearRecentList,
} from "./lib/recents";
import type { RecentsBundle } from "./components/RecentsMenu";
import { loadLayout, saveLayout } from "./lib/api";

interface OpenDoc {
  id: string;
  path: string | null;
  content: string;
  savedContent: string;
  /** Last on-disk text Parchmint knows about (baseline for our-own-write detection). */
  diskContent: string;
  conflict: ConflictKind;
  /** On-disk text awaiting a conflict decision (for the banner + Compare). */
  incomingDisk: string | null;
  /** Transient marker after a silent background reload. */
  flash: boolean;
  typeOverride: DocType | null;
}

const WELCOME_ID = "welcome";

const WELCOME = [
  "# Welcome to Parchmint",
  "",
  "A Markdown editor for documents your **AI** will read — specs, skill files, prompts.",
  "",
  "- Type on the left, see it render on the right.",
  "- The status bar shows the detected **document type** (override it there).",
  "- **Insights** below the preview shows the outline, token-level warnings, and validation.",
  "- Use **New ▾** to start a Skill file, ADR, or generic doc; **Export ▾** to copy or export.",
  "",
  "<what-to-do>",
  "Pseudo-tags like this one render as a labeled block instead of vanishing.",
  "</what-to-do>",
  "",
  "```ts",
  'const hello: string = "world";',
  "```",
  "",
  "## Math",
  "",
  "Inline $E = mc^2$ and a display equation:",
  "",
  "$$\\int_0^1 x^2\\,dx = \\tfrac{1}{3}$$",
  "",
  "## Diagram",
  "",
  "```mermaid",
  "flowchart LR",
  "  A[Write] --> B[Preview] --> C[Ship]",
  "```",
  "",
  "> Tip: Ctrl+S saves, Ctrl+W closes a tab.",
].join("\n");

function uid(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function basename(p: string): string {
  return p.split(/[\\/]/).pop() ?? p;
}

/** Last path segment of a folder, for display in Recent Workspaces. */
function folderName(p: string): string {
  const parts = p.split(/[\\/]/).filter(Boolean);
  return parts[parts.length - 1] ?? p;
}

function dirname(p: string): string {
  const idx = Math.max(p.lastIndexOf("/"), p.lastIndexOf("\\"));
  return idx >= 0 ? p.slice(0, idx) : "";
}

/** Compare two filesystem paths tolerant of separator and case (Windows). */
function samePath(a: string, b: string): boolean {
  const norm = (s: string) => s.replace(/[\\/]+/g, "\\").toLowerCase();
  return norm(a) === norm(b);
}

function docTitle(d: OpenDoc): string {
  return d.path ? basename(d.path) : "Untitled";
}

function useDebounced<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

export default function App() {
  const [folder, setFolder] = useState<string | null>(null);
  const [files, setFiles] = useState<MarkdownFile[]>([]);
  const [docs, setDocs] = useState<OpenDoc[]>(() => [
    {
      id: WELCOME_ID,
      path: null,
      content: WELCOME,
      savedContent: WELCOME,
      diskContent: WELCOME,
      conflict: "none",
      incomingDisk: null,
      flash: false,
      typeOverride: null,
    },
  ]);
  const [activeId, setActiveId] = useState<string | null>(WELCOME_ID);
  const [recents, setRecents] = useState<RecentsState>(emptyRecents);
  const [linkWarnings, setLinkWarnings] = useState<LintWarning[]>([]);
  const [toast, setToast] = useState<{ text: string; key: number } | null>(null);
  const [isDark, setIsDark] = useState(
    () => window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false,
  );
  const viewRef = useRef<EditorView | null>(null);
  // Set by "Edit here" when the editor isn't mounted yet (preview-only → split):
  // the jump is flushed once onEditorReady fires.
  const pendingEditLineRef = useRef<number | null>(null);
  const previewScrollRef = useRef<HTMLDivElement | null>(null);
  const [activeLine, setActiveLine] = useState<number | null>(null);
  const [compareId, setCompareId] = useState<string | null>(null);
  const [paneMode, setPaneMode] = useState<PaneMode>("split");
  const [sidebarVisible, setSidebarVisible] = useState(true);
  const [isZen, setIsZen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);

  // Latest values mirrored into refs so the filesystem-change subscription (set
  // up once) always reconciles against current state without re-subscribing.
  const docsRef = useRef(docs);
  docsRef.current = docs;
  const folderRef = useRef(folder);
  folderRef.current = folder;
  const activeIdRef = useRef(activeId);
  activeIdRef.current = activeId;
  const isZenRef = useRef(isZen);
  isZenRef.current = isZen;
  const layoutLoadedRef = useRef(false);

  const showToast = useCallback((text: string) => setToast({ text, key: Date.now() }), []);

  // Load persisted recents once on mount (fresh installs return null).
  useEffect(() => {
    void (async () => {
      const loaded = await loadRecents();
      if (loaded) setRecents(loaded);
    })();
  }, []);

  // Load persisted layout; mark loaded so subsequent changes are saved.
  useEffect(() => {
    void (async () => {
      const layout = await loadLayout();
      if (layout) {
        setPaneMode(layout.paneMode);
        setSidebarVisible(layout.sidebarVisible);
      }
      layoutLoadedRef.current = true;
    })();
  }, []);

  // Persist layout whenever it changes (skip the initial render).
  useEffect(() => {
    if (!layoutLoadedRef.current) return;
    void saveLayout({ paneMode, sidebarVisible });
  }, [paneMode, sidebarVisible]);

  // Apply a pure recents transform and persist the result. setRecents-on-load
  // bypasses this, so we never write the empty initial state over stored data.
  const mutateRecents = useCallback((fn: (s: RecentsState) => RecentsState) => {
    setRecents((prev) => {
      const next = fn(prev);
      void saveRecents(next);
      return next;
    });
  }, []);

  const activeDoc = docs.find((d) => d.id === activeId) ?? null;
  const compareDoc = docs.find((d) => d.id === compareId) ?? null;
  const activePath = activeDoc?.path ?? null;
  const override = activeDoc?.typeOverride ?? null;
  const content = activeDoc?.content ?? "";
  const debounced = useDebounced(content, 150);

  const [html, setHtml] = useState<string>("");
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const result = await renderPreview(debounced);
        if (!cancelled) setHtml(result);
      } catch (e) {
        console.error("renderPreview failed:", e);
        if (!cancelled) setHtml("<pre>Preview render error</pre>");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [debounced]);
  const tokens = useMemo(() => countTokens(debounced), [debounced]);
  const fm = useMemo(() => parseFrontmatter(debounced), [debounced]);
  const detected = useMemo(() => detectType(activePath, fm.data, fm.present), [activePath, fm]);
  const effectiveType = override ?? detected;

  const syncWarnings = useMemo(() => lintDocument(debounced), [debounced]);
  const validationWarnings = useMemo(
    () => validateDocument(effectiveType, debounced, fm),
    [effectiveType, debounced, fm],
  );
  const outline = useMemo(() => buildOutline(debounced), [debounced]);
  const structuralWarnings = useMemo(() => outlineWarnings(outline), [outline]);
  const allWarnings = useMemo(
    () => [...validationWarnings, ...syncWarnings, ...structuralWarnings, ...linkWarnings],
    [validationWarnings, syncWarnings, structuralWarnings, linkWarnings],
  );

  const chars = content.length;
  const lines = content.length === 0 ? 0 : content.split("\n").length;

  const updateDoc = useCallback((id: string, patch: Partial<OpenDoc>) => {
    setDocs((ds) => ds.map((d) => (d.id === id ? { ...d, ...patch } : d)));
  }, []);

  const refreshFiles = useCallback(async (dir: string) => {
    try {
      setFiles(await listMarkdownFiles(dir));
    } catch (e) {
      console.error("Failed to list files:", e);
    }
  }, []);

  // Open a folder as the Workspace (sidebar root). Used by the Open Folder
  // dialog and by clicking a Recent/Pinned Workspace. A vanished folder is
  // pruned from recents instead of silently showing an empty tree.
  const openWorkspace = useCallback(
    async (dir: string) => {
      if (!(await pathExists(dir))) {
        showToast("Folder no longer exists");
        mutateRecents((s) => removeRecent(s, "workspaces", dir));
        return;
      }
      setFolder(dir);
      mutateRecents((s) => recordRecent(s, "workspaces", dir));
      await refreshFiles(dir);
    },
    [refreshFiles, mutateRecents, showToast],
  );

  const handleOpenFolder = useCallback(async () => {
    const dir = await openFolderDialog();
    if (!dir) return;
    await openWorkspace(dir);
  }, [openWorkspace]);

  const openPath = useCallback(
    async (filePath: string) => {
      const existing = docs.find((d) => d.path === filePath);
      if (existing) {
        setActiveId(existing.id);
        return;
      }
      try {
        const text = await readTextFile(filePath);
        const id = uid();
        setDocs((ds) => [
          ...ds,
          {
            id,
            path: filePath,
            content: text,
            savedContent: text,
            diskContent: text,
            conflict: "none",
            incomingDisk: null,
            flash: false,
            typeOverride: null,
          },
        ]);
        setActiveId(id);
        mutateRecents((s) => recordRecent(s, "documents", filePath));
      } catch (e) {
        console.error("Failed to open file:", e);
        // A failed open means the path is stale — drop it from recents.
        mutateRecents((s) => removeRecent(s, "documents", filePath));
        window.alert("Could not open file:\n" + filePath);
      }
    },
    [docs, mutateRecents],
  );

  const handleSelectFile = useCallback((f: MarkdownFile) => void openPath(f.path), [openPath]);

  // Open documents handed to Parchmint by a Windows file association: the path
  // from a cold start, plus any files opened while the app is already running.
  const openPathRef = useRef(openPath);
  openPathRef.current = openPath;
  useEffect(() => {
    void (async () => {
      const launchFile = await takeLaunchFile();
      if (launchFile) void openPathRef.current(launchFile);
    })();
    const unlisten = onOpenFile((path) => void openPathRef.current(path));
    return () => {
      void unlisten.then((fn) => fn());
    };
  }, []);

  const handleOpenFile = useCallback(async () => {
    const fp = await openFileDialog();
    if (fp) void openPath(fp);
  }, [openPath]);

  const handleNewTyped = useCallback((t: DocType) => {
    const id = uid();
    setDocs((ds) => [
      ...ds,
      {
        id,
        path: null,
        content: TEMPLATES[t],
        savedContent: "",
        diskContent: "",
        conflict: "none",
        incomingDisk: null,
        flash: false,
        typeOverride: t === "plain" ? null : t,
      },
    ]);
    setActiveId(id);
    setPaneMode((prev) => (prev === "preview" ? "split" : prev));
  }, []);

  const handleSave = useCallback(async () => {
    if (!activeDoc) return;
    // Save guard: an unacknowledged external change must be reconciled through
    // the banner, not silently clobbered. (A deleted file is recreated by saving.)
    if (activeDoc.conflict === "changed") {
      showToast("File changed on disk — resolve the banner first");
      return;
    }
    let target = activeDoc.path;
    const wasNew = !target;
    if (!target) {
      target = await saveFileDialog();
      if (!target) return;
    }
    try {
      await writeTextFile(target, activeDoc.content);
      updateDoc(activeDoc.id, {
        path: target,
        savedContent: activeDoc.content,
        diskContent: activeDoc.content,
        conflict: "none",
        incomingDisk: null,
      });
      // A just-saved Untitled doc is now a real file worth reopening later.
      if (wasNew) mutateRecents((s) => recordRecent(s, "documents", target!));
      if (folder) void refreshFiles(folder);
    } catch (e) {
      console.error("Failed to save file:", e);
      window.alert("Could not save file.");
    }
  }, [activeDoc, folder, refreshFiles, updateDoc, showToast, mutateRecents]);

  const closeTab = useCallback(
    async (id: string) => {
      const idx = docs.findIndex((d) => d.id === id);
      if (idx === -1) return;
      const doc = docs[idx];
      if (doc.content !== doc.savedContent) {
        if (!(await confirmDiscard(`Discard unsaved changes to ${docTitle(doc)}?`))) return;
      }
      const next = docs.filter((d) => d.id !== id);
      setDocs(next);
      if (activeId === id) {
        const neighbor = next[idx] ?? next[idx - 1] ?? null;
        setActiveId(neighbor ? neighbor.id : null);
      }
    },
    [docs, activeId],
  );

  // ---- External-change reconciliation -------------------------------------

  // Debounced workspace rescan so the sidebar reflects files an agent creates,
  // deletes, or renames without a manual reload.
  const rescanTimer = useRef<number | null>(null);
  const scheduleRescan = useCallback(
    (dir: string) => {
      if (rescanTimer.current) window.clearTimeout(rescanTimer.current);
      rescanTimer.current = window.setTimeout(() => void refreshFiles(dir), 300);
    },
    [refreshFiles],
  );

  // Apply a fresh on-disk version to a clean document. The active tab is updated
  // through a CodeMirror transaction so the reload is undoable and keeps the
  // caret; background tabs update in state and briefly flash a marker.
  const applyExternalReload = useCallback(
    (doc: OpenDoc, disk: string) => {
      const isActive = doc.id === activeIdRef.current;
      const view = viewRef.current;
      if (isActive && view) {
        const pos = Math.min(view.state.selection.main.head, disk.length);
        view.dispatch({
          changes: { from: 0, to: view.state.doc.length, insert: disk },
          selection: { anchor: pos },
        });
      }
      setDocs((ds) =>
        ds.map((d) =>
          d.id === doc.id
            ? {
                ...d,
                content: disk,
                savedContent: disk,
                diskContent: disk,
                conflict: "none",
                incomingDisk: null,
                flash: !isActive,
              }
            : d,
        ),
      );
      if (isActive) showToast("Updated from disk");
      else window.setTimeout(() => updateDoc(doc.id, { flash: false }), 2000);
    },
    [showToast, updateDoc],
  );

  // Decide what a filesystem change means for one path: reload a clean tab,
  // raise a conflict on a dirty one, flag a vanished file, or — if no document
  // owns the path — just refresh the sidebar.
  const reconcilePath = useCallback(
    async (changedPath: string) => {
      const match = docsRef.current.find((d) => d.path && samePath(d.path, changedPath));
      if (!match) {
        const f = folderRef.current;
        if (f) scheduleRescan(f);
        return;
      }
      let disk: string | null = null;
      try {
        disk = await readTextFile(match.path!);
      } catch {
        disk = null;
      }
      // Re-read the latest doc state: it may have changed during the await.
      const cur = docsRef.current.find((d) => d.id === match.id);
      if (!cur) return;
      if (disk === null) {
        if (cur.conflict !== "deleted") updateDoc(cur.id, { conflict: "deleted" });
        return;
      }
      if (disk === cur.diskContent && cur.conflict === "none") return; // our own write / no real change
      if (cur.content === cur.savedContent) {
        applyExternalReload(cur, disk);
      } else {
        updateDoc(cur.id, { conflict: "changed", incomingDisk: disk, diskContent: disk });
      }
      const f = folderRef.current;
      if (f && cur.path && cur.path.startsWith(f)) scheduleRescan(f);
    },
    [applyExternalReload, scheduleRescan, updateDoc],
  );

  const reconcileRef = useRef(reconcilePath);
  reconcileRef.current = reconcilePath;
  useEffect(() => {
    const unlisten = onFileChanged((paths) => {
      for (const p of paths) void reconcileRef.current(p);
    });
    return () => {
      void unlisten.then((fn) => fn());
    };
  }, []);

  // (Re)register watch roots whenever the workspace or the set of open file
  // paths changes: the workspace recursively, plus the parent directory of any
  // open document that lives outside it.
  const openPathsKey = docs.map((d) => d.path ?? "").join("|");
  useEffect(() => {
    const recursive = folder ? [folder] : [];
    const flat = new Set<string>();
    for (const d of docsRef.current) {
      if (d.path && !(folder && d.path.startsWith(folder))) flat.add(dirname(d.path));
    }
    void setWatchRoots(recursive, Array.from(flat));
  }, [folder, openPathsKey]);

  // Banner / Compare actions, all targeting the active document.
  const handleReloadFromDisk = useCallback(() => {
    const d = docsRef.current.find((x) => x.id === activeIdRef.current);
    if (d && d.incomingDisk != null) applyExternalReload(d, d.incomingDisk);
  }, [applyExternalReload]);

  const handleKeepMine = useCallback(() => {
    const id = activeIdRef.current;
    if (id) updateDoc(id, { conflict: "none", incomingDisk: null });
  }, [updateDoc]);

  const handleCloseActive = useCallback(() => {
    const id = activeIdRef.current;
    if (id) closeTab(id);
  }, [closeTab]);

  const handleCompareTakeDisk = useCallback(() => {
    const d = docsRef.current.find((x) => x.id === compareId);
    if (d && d.incomingDisk != null) applyExternalReload(d, d.incomingDisk);
    setCompareId(null);
  }, [applyExternalReload, compareId]);

  const handleCompareKeepMine = useCallback(() => {
    if (compareId) updateDoc(compareId, { conflict: "none", incomingDisk: null });
    setCompareId(null);
  }, [compareId, updateDoc]);

  const handleChange = useCallback(
    (value: string) => {
      if (activeId) updateDoc(activeId, { content: value });
    },
    [activeId, updateDoc],
  );

  // Place the editor caret at the start of a 1-based source line and reveal it.
  const jumpToLine = useCallback((view: EditorView, line: number) => {
    const lineNo = Math.min(Math.max(line, 1), view.state.doc.lines);
    const pos = view.state.doc.line(lineNo).from;
    view.dispatch({
      selection: { anchor: pos },
      effects: EditorView.scrollIntoView(pos, { y: "center" }),
    });
    view.focus();
  }, []);

  // Right-click "Edit here" in the Preview → jump the source caret to that line.
  // In preview-only mode the editor isn't mounted, so switch to split and defer
  // the jump to onEditorReady via pendingEditLineRef.
  const handleEditAt = useCallback(
    (line: number) => {
      const view = viewRef.current;
      if (view && paneMode !== "preview") {
        jumpToLine(view, line);
      } else {
        pendingEditLineRef.current = line;
        setPaneMode("split");
      }
    },
    [paneMode, jumpToLine],
  );

  // Toggle a task-list checkbox clicked in the Preview. Uses functional setDocs
  // so the edit is computed from the live content (not a stale closure), then
  // flips the marker on the stamped source line — which marks the doc dirty.
  const handleToggleTask = useCallback(
    (line: number, checked: boolean) => {
      if (!activeId) return;
      setDocs((ds) =>
        ds.map((d) =>
          d.id === activeId ? { ...d, content: toggleTaskLine(d.content, line, checked) } : d,
        ),
      );
    },
    [activeId],
  );

  const handleChangeType = useCallback(
    (t: DocType | null) => {
      if (activeId) updateDoc(activeId, { typeOverride: t });
    },
    [activeId, updateDoc],
  );

  // Outline click: move the Source-pane caret onto the heading text and scroll
  // the Preview pane to the matching element. The outline comes from debounced
  // content, so clamp the line before touching the live editor doc.
  const handleNavigate = useCallback((h: Heading) => {
    const view = viewRef.current;
    if (view) {
      const lineNo = Math.min(Math.max(h.line, 1), view.state.doc.lines);
      const line = view.state.doc.line(lineNo);
      const marker = line.text.match(/^\s*#{1,6}\s+/);
      const pos = line.from + (marker ? marker[0].length : 0);
      view.dispatch({
        selection: { anchor: pos },
        effects: EditorView.scrollIntoView(pos, { y: "center" }),
      });
      view.focus();
    }
    const container = previewScrollRef.current;
    const el = container?.querySelector<HTMLElement>(`[data-source-line="${h.line}"]`);
    if (container && el) {
      const top =
        el.getBoundingClientRect().top -
        container.getBoundingClientRect().top +
        container.scrollTop -
        12;
      container.scrollTo({ top, behavior: "smooth" });
    }
  }, []);

  const handleCopyAll = useCallback(async () => {
    if (!activeDoc) return;
    try {
      await navigator.clipboard.writeText(activeDoc.content);
      showToast(
        `Copied ${activeDoc.content.length.toLocaleString()} chars · ~${countTokens(
          activeDoc.content,
        ).toLocaleString()} tokens`,
      );
    } catch (e) {
      console.error("Copy failed:", e);
      window.alert("Copy failed.");
    }
  }, [activeDoc, showToast]);

  const handleCopySelection = useCallback(async () => {
    const v = viewRef.current;
    if (!v) return;
    const { from, to } = v.state.selection.main;
    const text = from === to ? "" : v.state.sliceDoc(from, to);
    if (!text) {
      showToast("Nothing selected");
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      showToast(
        `Copied selection · ${text.length.toLocaleString()} chars · ~${countTokens(
          text,
        ).toLocaleString()} tokens`,
      );
    } catch (e) {
      console.error("Copy failed:", e);
      window.alert("Copy failed.");
    }
  }, [showToast]);

  const handleExportHtml = useCallback(async () => {
    const previewEl = document.querySelector(".preview.markdown-body");
    const bodyHtml = previewEl ? previewEl.innerHTML : html;
    const title = activeDoc ? docTitle(activeDoc) : "document";
    const defaultName = (title.replace(/\.(md|markdown)$/i, "") || "document") + ".html";
    const target = await saveHtmlDialog(defaultName);
    if (!target) return;
    try {
      await writeTextFile(target, buildStandaloneHtml(title, bodyHtml));
      showToast("Exported HTML");
    } catch (e) {
      console.error("Export failed:", e);
      window.alert("Could not export HTML.");
    }
  }, [html, activeDoc, showToast]);

  const handleExportPdf = useCallback(() => {
    // Uses the system print dialog; a print stylesheet isolates the preview.
    window.print();
  }, []);

  // Check relative links against the filesystem (async, follows the debounce).
  useEffect(() => {
    let cancelled = false;
    if (!activePath) {
      setLinkWarnings([]);
      return;
    }
    const dir = dirname(activePath);
    const links = extractRelativeLinks(debounced);
    void (async () => {
      const results: LintWarning[] = [];
      for (const lnk of links) {
        try {
          const ok = await linkExists(dir, lnk.target);
          if (!ok) {
            results.push({ severity: "warning", message: `Broken link: ${lnk.target}`, line: lnk.line });
          }
        } catch (e) {
          console.error("Link check failed:", e);
        }
      }
      if (!cancelled) setLinkWarnings(results);
    })();
    return () => {
      cancelled = true;
    };
  }, [debounced, activePath]);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 2500);
    return () => clearTimeout(id);
  }, [toast]);

  // Scroll-spy: highlight the Outline heading whose section is being read. The
  // Preview pane's scroll is the sole driver (the Source caret has no effect).
  // Each frame, pick the lowest heading whose top has scrolled above the
  // detection line; it stays active through long sections and blanks only above
  // the first heading. Re-runs on `html` so a re-render re-evaluates against the
  // fresh heading nodes (PreviewPane replaces them wholesale).
  useEffect(() => {
    const container = previewScrollRef.current;
    if (!container) return;
    let raf = 0;
    const compute = () => {
      raf = 0;
      const threshold = container.getBoundingClientRect().top + 12;
      const headings = container.querySelectorAll<HTMLElement>("[data-source-line]");
      let active: number | null = null;
      for (const el of headings) {
        if (el.getBoundingClientRect().top <= threshold + 1) {
          active = Number(el.getAttribute("data-source-line"));
        } else {
          break;
        }
      }
      setActiveLine(active);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(compute);
    };
    container.addEventListener("scroll", onScroll, { passive: true });
    compute();
    return () => {
      container.removeEventListener("scroll", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [html]);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e: MediaQueryListEvent) => setIsDark(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  // Guard the native window close (titlebar ✕ / Alt+F4) against unsaved work in
  // ANY open tab — closeTab already covers per-tab closes. Reads docs through the
  // ref so the once-registered handler always sees current state.
  useEffect(() => {
    let unlisten: (() => void) | undefined;
    void onCloseRequested(() => {
      const dirty = docsRef.current.filter((d) => d.content !== d.savedContent);
      if (dirty.length === 0) return true;
      const msg =
        dirty.length === 1
          ? `Discard unsaved changes to ${docTitle(dirty[0])}?`
          : `Discard unsaved changes to ${dirty.length} open documents?`;
      return confirmDiscard(msg);
    }).then((fn) => {
      unlisten = fn;
    });
    return () => unlisten?.();
  }, []);

  // Global shortcuts. NOTE: the cheatsheet in src/lib/shortcuts.ts mirrors these
  // for display — keep the two in sync when adding or changing a binding.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey;

      if (mod && e.key.toLowerCase() === "s") {
        e.preventDefault();
        void handleSave();
      } else if (mod && e.key.toLowerCase() === "w") {
        e.preventDefault();
        if (activeId) closeTab(activeId);
      } else if (mod && e.key === "1") {
        e.preventDefault();
        setPaneMode("source");
      } else if (mod && e.key === "2") {
        e.preventDefault();
        setPaneMode("split");
      } else if (mod && e.key === "3") {
        e.preventDefault();
        setPaneMode("preview");
      } else if (mod && e.key.toLowerCase() === "b") {
        e.preventDefault();
        setSidebarVisible((v) => !v);
      } else if (mod && e.key === ".") {
        e.preventDefault();
        setIsZen((z) => !z);
      } else if (mod && e.key === "/") {
        e.preventDefault();
        setHelpOpen((o) => !o);
      } else if (e.key === "Escape" && isZenRef.current) {
        setIsZen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [handleSave, closeTab, activeId]);

  const activeDirty = activeDoc ? activeDoc.content !== activeDoc.savedContent : false;
  const canSave = !!activeDoc && (activeDirty || activeDoc.path === null);
  const tabList = docs.map((d) => ({
    id: d.id,
    title: docTitle(d),
    dirty: d.content !== d.savedContent,
    conflict: d.conflict === "none" ? undefined : d.conflict,
    flash: d.flash,
  }));

  const recentDocuments: RecentsBundle = {
    list: recents.documents,
    emptyHint: "No recent documents",
    displayName: basename,
    onOpen: (p) => void openPath(p),
    onPin: (p) => mutateRecents((s) => pinRecent(s, "documents", p)),
    onUnpin: (p) => mutateRecents((s) => unpinRecent(s, "documents", p)),
    onRemove: (p) => mutateRecents((s) => removeRecent(s, "documents", p)),
    onClearRecent: () => mutateRecents((s) => clearRecentList(s, "documents")),
  };
  const recentWorkspaces: RecentsBundle = {
    list: recents.workspaces,
    emptyHint: "No recent folders",
    displayName: folderName,
    onOpen: (p) => void openWorkspace(p),
    onPin: (p) => mutateRecents((s) => pinRecent(s, "workspaces", p)),
    onUnpin: (p) => mutateRecents((s) => unpinRecent(s, "workspaces", p)),
    onRemove: (p) => mutateRecents((s) => removeRecent(s, "workspaces", p)),
    onClearRecent: () => mutateRecents((s) => clearRecentList(s, "workspaces")),
  };

  const sourcePaneEl = activeDoc ? (
    <SourcePane
      key={activeDoc.id}
      value={activeDoc.content}
      onChange={handleChange}
      theme={isDark ? "dark" : "light"}
      onEditorReady={(v) => {
        viewRef.current = v;
        if (pendingEditLineRef.current !== null) {
          const line = pendingEditLineRef.current;
          pendingEditLineRef.current = null;
          // Defer to next frame so the freshly-mounted editor has laid out and
          // scrollIntoView measures against real geometry.
          requestAnimationFrame(() => jumpToLine(v, line));
        }
      }}
    />
  ) : null;

  const previewPaneEl = (
    <div className="right-side">
      <div className="preview-scroll" ref={previewScrollRef}>
        <PreviewPane html={html} onToggleTask={handleToggleTask} onEditAt={handleEditAt} />
      </div>
    </div>
  );

  let paneContent: React.ReactNode;
  if (!activeDoc) {
    paneContent = (
      <div className="empty-state">
        <p>No document open.</p>
        <button onClick={() => handleNewTyped("plain")}>New document</button>
      </div>
    );
  } else if (paneMode === "source") {
    paneContent = (
      <div className="split">
        <div className="split-left" style={{ width: "100%", borderRight: "none" }}>
          {sourcePaneEl}
        </div>
      </div>
    );
  } else if (paneMode === "preview") {
    paneContent = (
      <div className="split">
        <div className="split-right">{previewPaneEl}</div>
      </div>
    );
  } else {
    paneContent = (
      <SplitPane left={sourcePaneEl!} right={previewPaneEl} />
    );
  }

  return (
    <div className={"app" + (isZen ? " zen" : "")}>
      {!isZen && (
        <Tabs
          docs={tabList}
          activeId={activeId}
          onSelect={setActiveId}
          onClose={closeTab}
          onNew={() => handleNewTyped("plain")}
          onOpenFolder={handleOpenFolder}
          onOpenFile={handleOpenFile}
          recentDocuments={recentDocuments}
          recentWorkspaces={recentWorkspaces}
          onNewTyped={handleNewTyped}
          onSave={handleSave}
          canSave={canSave}
          onCopyAll={handleCopyAll}
          onCopySelection={handleCopySelection}
          onExportHtml={handleExportHtml}
          onExportPdf={handleExportPdf}
          paneMode={paneMode}
          onPaneMode={setPaneMode}
          sidebarVisible={sidebarVisible}
          onToggleSidebar={() => setSidebarVisible((v) => !v)}
        />
      )}
      {activeDoc && (
        <ConflictBanner
          conflict={activeDoc.conflict}
          onReload={handleReloadFromDisk}
          onKeepMine={handleKeepMine}
          onCompare={() => setCompareId(activeDoc.id)}
          onRecreate={handleSave}
          onClose={handleCloseActive}
        />
      )}
      <div className="body">
        {!isZen && sidebarVisible && (
          <Sidebar
            folder={folder}
            files={files}
            activePath={activePath}
            onSelect={handleSelectFile}
            onOpenFolder={handleOpenFolder}
            outline={outline}
            activeLine={activeLine}
            onNavigate={handleNavigate}
          />
        )}
        {paneContent}
      </div>
      {!isZen && (
        <StatusBar
          tokens={tokens}
          chars={chars}
          lines={lines}
          path={activePath}
          detected={detected}
          override={override}
          onChangeType={handleChangeType}
          warnings={allWarnings}
          onShowHelp={() => setHelpOpen(true)}
          onShowAbout={() => setAboutOpen(true)}
        />
      )}
      {helpOpen && (
        <ShortcutsHelp
          onClose={() => setHelpOpen(false)}
          onAbout={() => {
            setHelpOpen(false);
            setAboutOpen(true);
          }}
        />
      )}
      {aboutOpen && <AboutDialog onClose={() => setAboutOpen(false)} />}
      {compareDoc && compareDoc.incomingDisk != null && (
        <ConflictCompare
          mine={compareDoc.content}
          disk={compareDoc.incomingDisk}
          onTakeDisk={handleCompareTakeDisk}
          onKeepMine={handleCompareKeepMine}
          onClose={() => setCompareId(null)}
        />
      )}
      {toast && <div className="toast">{toast.text}</div>}
    </div>
  );
}
