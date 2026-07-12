import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { open, save, ask } from "@tauri-apps/plugin-dialog";
import { load, type Store } from "@tauri-apps/plugin-store";
import type { RecentsState } from "./recents";

/**
 * Native yes/no dialog. Used instead of window.confirm(), which does not render
 * reliably inside the Tauri webview. Returns true when the user chooses Yes.
 */
export async function confirmDiscard(message: string): Promise<boolean> {
  return ask(message, { title: "Parchmint", kind: "warning" });
}

/**
 * Intercept the native window close (titlebar ✕ / Alt+F4) so unsaved work can be
 * guarded. `proceed` is called for every close request; returning false (e.g.
 * after the user cancels a confirm) keeps the window open, true closes it. The
 * native close is always prevented first, then we explicitly destroy() on a yes —
 * so a synchronous window.confirm inside `proceed` works fine.
 */
export function onCloseRequested(
  proceed: () => boolean | Promise<boolean>,
): Promise<UnlistenFn> {
  const win = getCurrentWindow();
  return win.onCloseRequested(async (event) => {
    event.preventDefault();
    if (await proceed()) await win.destroy();
  });
}

export interface MarkdownFile {
  name: string;
  path: string;
}

export async function openFolderDialog(): Promise<string | null> {
  const result = await open({ directory: true, multiple: false, title: "Open folder" });
  return typeof result === "string" ? result : null;
}

export async function openFileDialog(): Promise<string | null> {
  const result = await open({
    multiple: false,
    title: "Open Markdown file",
    filters: [{ name: "Markdown", extensions: ["md", "markdown"] }],
  });
  return typeof result === "string" ? result : null;
}

export async function saveFileDialog(defaultName = "untitled.md"): Promise<string | null> {
  const result = await save({
    defaultPath: defaultName,
    filters: [{ name: "Markdown", extensions: ["md", "markdown"] }],
  });
  return result ?? null;
}

export async function saveHtmlDialog(defaultName: string): Promise<string | null> {
  const result = await save({
    defaultPath: defaultName,
    filters: [{ name: "HTML", extensions: ["html"] }],
  });
  return result ?? null;
}

export function readTextFile(path: string): Promise<string> {
  return invoke<string>("read_text_file", { path });
}

export function writeTextFile(path: string, contents: string): Promise<void> {
  return invoke<void>("write_text_file", { path, contents });
}

export function listMarkdownFiles(dir: string): Promise<MarkdownFile[]> {
  return invoke<MarkdownFile[]>("list_markdown_files", { dir });
}

export function linkExists(dir: string, target: string): Promise<boolean> {
  return invoke<boolean>("link_exists", { dir, target });
}

/** Whether a path (file or folder) still exists — used to grey out stale recents. */
export function pathExists(path: string): Promise<boolean> {
  return invoke<boolean>("path_exists", { path });
}

// ---- Persisted settings (recents) ---------------------------------------
// All persistence hides behind this seam so components stay backend-agnostic
// (see docs/adr/0004). Today: tauri-plugin-store → settings.json.

const SETTINGS_FILE = "settings.json";
const SETTINGS_VERSION = 1;
const RECENTS_KEY = "recents";

let storePromise: Promise<Store> | null = null;
function settingsStore(): Promise<Store> {
  return (storePromise ??= load(SETTINGS_FILE));
}

/** Load persisted recents, or null on a fresh install. */
export async function loadRecents(): Promise<RecentsState | null> {
  try {
    const store = await settingsStore();
    return (await store.get<RecentsState>(RECENTS_KEY)) ?? null;
  } catch (e) {
    console.error("Failed to load recents:", e);
    return null;
  }
}

/** Persist recents (stamps a schema version for future migrations). */
export async function saveRecents(state: RecentsState): Promise<void> {
  try {
    const store = await settingsStore();
    await store.set("version", SETTINGS_VERSION);
    await store.set(RECENTS_KEY, state);
    await store.save();
  } catch (e) {
    console.error("Failed to save recents:", e);
  }
}

// ---- Layout state -------------------------------------------------------

const LAYOUT_KEY = "layout";

export interface LayoutState {
  paneMode: "source" | "split" | "preview";
  sidebarVisible: boolean;
  /** Absent in layouts saved before sidebar resizing existed. */
  sidebarWidth?: number;
}

export async function loadLayout(): Promise<LayoutState | null> {
  try {
    const store = await settingsStore();
    return (await store.get<LayoutState>(LAYOUT_KEY)) ?? null;
  } catch (e) {
    console.error("Failed to load layout:", e);
    return null;
  }
}

export async function saveLayout(state: LayoutState): Promise<void> {
  try {
    const store = await settingsStore();
    await store.set(LAYOUT_KEY, state);
    await store.save();
  } catch (e) {
    console.error("Failed to save layout:", e);
  }
}

// ---- Session (workspace folder + last active file) ----------------------
// Restored on launch so Parchmint reopens where you left off. We persist only
// paths (re-read from disk on restore), never buffer contents — see
// docs/adr/0005. Multi-tab restore is deliberately deferred to the recents list.

const SESSION_KEY = "session";

export interface SessionState {
  /** Last open Workspace folder, or null if none was open. */
  folder: string | null;
  /** Path of the active document tab, or null if it was Welcome/untitled. */
  activePath: string | null;
}

export async function loadSession(): Promise<SessionState | null> {
  try {
    const store = await settingsStore();
    return (await store.get<SessionState>(SESSION_KEY)) ?? null;
  } catch (e) {
    console.error("Failed to load session:", e);
    return null;
  }
}

export async function saveSession(state: SessionState): Promise<void> {
  try {
    const store = await settingsStore();
    await store.set(SESSION_KEY, state);
    await store.save();
  } catch (e) {
    console.error("Failed to save session:", e);
  }
}

// ---- Default Markdown editor ---------------------------------------------

/** `unavailable` = becoming default is impossible here (bare Linux AppImage). */
export type DefaultHandlerStatus = "default" | "not_default" | "unavailable";

export function defaultHandlerStatus(): Promise<DefaultHandlerStatus> {
  return invoke<DefaultHandlerStatus>("default_handler_status");
}

/**
 * Try to become the default Markdown editor. Resolves to "set" when switched
 * directly (macOS/Linux) or "settings_opened" when the user must finish the
 * switch in Windows Settings (defaults are user-choice protected there).
 */
export function makeDefaultMdHandler(): Promise<"set" | "settings_opened"> {
  return invoke<"set" | "settings_opened">("make_default_md_handler");
}

const DEFAULT_PROMPT_KEY = "defaultEditorPromptDone";

/** Whether the one-time "make default?" prompt has already been answered. */
export async function loadDefaultPromptDone(): Promise<boolean> {
  try {
    const store = await settingsStore();
    return (await store.get<boolean>(DEFAULT_PROMPT_KEY)) ?? false;
  } catch {
    return true; // fail closed: never nag if persistence is broken
  }
}

export async function saveDefaultPromptDone(): Promise<void> {
  try {
    const store = await settingsStore();
    await store.set(DEFAULT_PROMPT_KEY, true);
    await store.save();
  } catch (e) {
    console.error("Failed to save default-prompt flag:", e);
  }
}

/**
 * Path Parchmint was launched with via a Windows file association
 * (double-clicking an associated `.md` file on a cold start). Returns null if
 * the app was opened normally. Cleared after the first call.
 */
export function takeLaunchFile(): Promise<string | null> {
  return invoke<string | null>("take_launch_file");
}

/**
 * Subscribe to associated files opened while Parchmint is already running
 * (Windows forwards them to the live instance). Returns an unlisten function.
 */
export function onOpenFile(handler: (path: string) => void): Promise<UnlistenFn> {
  return listen<string>("open-file", (event) => handler(event.payload));
}

/**
 * (Re)configure the filesystem watcher. `recursive` roots (the workspace) are
 * watched recursively; `flat` roots (parent directories of open documents
 * outside the workspace) non-recursively.
 */
export function setWatchRoots(recursive: string[], flat: string[]): Promise<void> {
  return invoke<void>("set_watch_roots", { recursive, flat });
}

/**
 * Subscribe to debounced filesystem changes under the watched roots. The payload
 * is the list of affected paths. Returns an unlisten function.
 */
export function onFileChanged(handler: (paths: string[]) => void): Promise<UnlistenFn> {
  return listen<string[]>("file-changed", (event) => handler(event.payload));
}
