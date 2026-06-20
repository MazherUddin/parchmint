// Pure logic for Recent / Pinned Documents and Workspaces. No I/O here — the
// `api.ts` seam loads and persists the resulting state. See CONTEXT.md for the
// Recent/Pinned vocabulary and docs/adr/0004 for where it is stored.

/** One MRU list with a pinned section promoted out of it. */
export interface RecentList {
  /** Deliberately pinned, never auto-evicted, newest-pinned first. */
  pinned: string[];
  /** Auto-managed MRU, newest first, capped — excludes pinned paths. */
  recent: string[];
}

export interface RecentsState {
  documents: RecentList;
  workspaces: RecentList;
}

export type RecentKind = "documents" | "workspaces";

/** Cap applies to the `recent` section only; pinned is uncapped. */
export const RECENT_CAP = 10;

export function emptyRecents(): RecentsState {
  return { documents: { pinned: [], recent: [] }, workspaces: { pinned: [], recent: [] } };
}

/** Normalize a path for identity comparison, tolerant of separator and case
 * (Windows) and a trailing separator (matters for folders). */
function norm(p: string): string {
  return p.replace(/[\\/]+/g, "\\").replace(/\\+$/, "").toLowerCase();
}

function same(a: string, b: string): boolean {
  return norm(a) === norm(b);
}

function without(list: string[], path: string): string[] {
  return list.filter((p) => !same(p, path));
}

function has(list: string[], path: string): boolean {
  return list.some((p) => same(p, path));
}

// ---- Single-list operations (return a new list) -------------------------

function recordIn(list: RecentList, path: string): RecentList {
  // A pinned entry stays pinned when re-opened — don't demote it into recent.
  if (has(list.pinned, path)) return list;
  return { pinned: list.pinned, recent: [path, ...without(list.recent, path)].slice(0, RECENT_CAP) };
}

function pinIn(list: RecentList, path: string): RecentList {
  if (has(list.pinned, path)) return list;
  return { pinned: [path, ...without(list.pinned, path)], recent: without(list.recent, path) };
}

function unpinIn(list: RecentList, path: string): RecentList {
  if (!has(list.pinned, path)) return list;
  return {
    pinned: without(list.pinned, path),
    recent: [path, ...without(list.recent, path)].slice(0, RECENT_CAP),
  };
}

function removeIn(list: RecentList, path: string): RecentList {
  return { pinned: without(list.pinned, path), recent: without(list.recent, path) };
}

function clearRecentIn(list: RecentList): RecentList {
  return { pinned: list.pinned, recent: [] };
}

// ---- State operations (return a new RecentsState) -----------------------

function update(s: RecentsState, kind: RecentKind, fn: (l: RecentList) => RecentList): RecentsState {
  return { ...s, [kind]: fn(s[kind]) };
}

/** Move `path` to the front of `kind`'s recent list (no-op if already pinned). */
export function record(s: RecentsState, kind: RecentKind, path: string): RecentsState {
  return update(s, kind, (l) => recordIn(l, path));
}

export function pin(s: RecentsState, kind: RecentKind, path: string): RecentsState {
  return update(s, kind, (l) => pinIn(l, path));
}

export function unpin(s: RecentsState, kind: RecentKind, path: string): RecentsState {
  return update(s, kind, (l) => unpinIn(l, path));
}

export function remove(s: RecentsState, kind: RecentKind, path: string): RecentsState {
  return update(s, kind, (l) => removeIn(l, path));
}

export function clearRecent(s: RecentsState, kind: RecentKind): RecentsState {
  return update(s, kind, clearRecentIn);
}
