# External edits are watched and reconciled by dirty-state: live-reload when clean, banner when in conflict

**Context.** Parchmint's documents are written to be consumed by an LLM, and in practice those same files — `CLAUDE.md`, skill files, agent instructions — are rewritten *on disk* by coding agents (Claude Code, Cursor, Copilot) while the user has them open. Until now Parchmint read a file once on open and only re-read on an explicit reopen. An external edit therefore left the in-memory buffer stale, and Ctrl+S would silently overwrite the agent's changes — a data-loss hazard in exactly the human-plus-agent workflow Parchmint exists to serve. The buffer must stay live, and a save must never clobber an unseen external change.

**Decision.** Watch the filesystem and reconcile external changes according to the tab's dirty state (`content` vs `savedContent`).

1. **Watcher.** A Rust filesystem watcher (`notify` via `notify-debouncer-mini`, ~200 ms debounce) watches the workspace folder recursively, plus the parent directory of any open document that lives outside the workspace, and emits a debounced `file-changed` event carrying the affected paths. The frontend keeps a per-document `diskContent` baseline so Parchmint's *own* writes are a no-op (disk == baseline ⇒ ignore); reconciliation keys off exact content comparison, so a byte-identical write is correctly nothing.
2. **Clean tab → live reload.** If the tab has no unsaved edits, reload it in place. The active tab is updated via a single CodeMirror transaction (so the reload is **undoable** and cursor/scroll are preserved) with a brief "Updated from disk" toast; background tabs update silently with a fading marker on the tab.
3. **Conflicting tab → non-blocking banner.** If the tab has unsaved edits *and* the disk content diverged, show a banner: **Reload** (discard mine), **Keep mine** (overwrite on next save), or **Compare** (side-by-side diff via `@codemirror/merge`). A conflict on a background tab shows a badge and raises the banner when the tab is activated.
4. **Deleted / renamed / moved → keep, don't close.** If an open file's path disappears, the buffer is retained (never auto-closed); the tab is flagged "deleted on disk" with **Save to recreate** / **Close**. A rename is treated as deletion of the old path.
5. **Save guard.** An unresolved conflict routes Ctrl+S to the banner instead of overwriting; once the user resolves it (including via Keep mine) the save proceeds. This catches the race where a write lands between the last sync and the save.
6. **Sidebar.** The workspace file tree is refreshed from the same watcher, so files an agent creates, deletes, or renames appear without a manual reload.

The watcher is on by default with no preference toggle (there is no settings system yet), and untitled buffers (no path) are not watched.

**Considered options.**
- **Re-read only on window focus or on save** — cheapest and poll-free, but leaves the buffer visibly stale and forfeits the live "watch the agent work" feel that is the point of the feature. Rejected.
- **Always prompt on any external change, even when clean** — safe, but loses live reload and nags constantly during an agent's write bursts. Rejected.
- **Blocking modal on conflict (or on every save)** — guarantees the user notices, but interrupts and contradicts the non-blocking editing model. Rejected in favor of a banner.
- **Auto-follow renames** — nicer when it works, but `notify` reports a rename as delete-then-create and pairing the two is racy across platforms. Deferred behind "treat rename as delete"; can be layered on later.

**Consequences.** Adds a native dependency (`notify`) and a debounced event channel from Rust to the frontend. A document now carries a third piece of state — a `diskContent` baseline and a `conflict` flag — beyond `content`/`savedContent`, and the save path is no longer an unconditional write. The Compare view pulls in `@codemirror/merge`. Because the watcher emits on the workspace recursively, it also fires for Parchmint's own saves; the baseline comparison makes those no-ops, and sidebar rescans are idempotent. Recreating the debouncer on every watch-root change (tab open/close, folder switch) is simpler than diffing watch sets and only risks missing events in the sub-second gap, which is acceptable here.
