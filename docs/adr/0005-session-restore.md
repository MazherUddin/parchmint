# Restore the previous session on launch (folder + last active file)

**Context.** ADR 0004 added persisted settings via `tauri-plugin-store` and named "session restore" as an anticipated follow-on. Until now every launch started fresh: `folder`, `docs`, and `activeId` are in-memory React state, so the workspace and open document were forgotten on restart. The recents list (ADR 0004) already makes any individual file or workspace cheap to reopen, but it does not bring you back to where you were automatically.

**Decision.** On launch, restore the **Workspace folder** and the **single last active file**, and nothing more. We persist a new `session` key in `settings.json` holding only paths — `{ folder, activePath }` — and re-read file contents from disk on restore. Access stays behind the `src/lib/api.ts` seam (`loadSession` / `saveSession`), like all other persisted settings.

Behavioural rules:
- **Paths only, re-read from disk.** We never persist buffer contents. A restored tab is identical to opening that file today. Persisting unsaved buffers would make `settings.json` a shadow autosave that can drift from disk — that is a separate autosave/recovery feature, deliberately out of scope.
- **Best-effort and silent.** A folder or file that no longer exists is dropped without a toast (mirrors how recents treat stale paths). Folder and active file restore independently — a loose file with no surviving workspace still reopens.
- **Launch file augments the session.** A file-association cold start opens *on top of* the restored session and takes focus; the existing single-file open path dedups if it was already restored.
- **Hydrate before persist.** A `hydratedRef` gate stops the initial empty state from overwriting the stored session before it is loaded.
- **Debounced write** on folder / active-file change, so rapid tab switches coalesce.

**Considered options.**
- **Full multi-tab restore** (all open tabs, order, active tab) — the obvious "reopen everything." Rejected for now: it carries almost all the complexity (ordered batch reads, per-tab stale handling, active-path mapping, launch-file merge) for marginal value over recents, which already makes the other tabs one click away. Deferred, not refused.
- **Folder only** — simplest, repopulates the sidebar. Good, but leaving the actual open document closed is a needless papercut when the single-file open path already exists and reusing it is nearly free.
- **Folder + last active file (chosen)** — restores the workspace *and* the document you were in, reusing the existing folder-open and single-file-open paths verbatim. Small change, covers the common "reopen where I was" case; recents covers the rest.

**Consequences.** One new `session` key in `settings.json` (no per-key version — the file's top-level `version` from ADR 0004 covers migration). Restore reuses existing open paths, so there is no new batch loader and the filesystem watcher reconfigures automatically off `folder`/`docs`. If you want several documents back, reopen them from the recents list. Promoting to full multi-tab restore later is purely additive — the `session` shape can grow an `openPaths` array without breaking the stored single-active-file form.
