# Persist app settings (starting with recents) via tauri-plugin-store

**Context.** Parchmint had no persistence whatsoever — `folder`, open `docs`, and `activeId` are in-memory React state, so every launch starts fresh. The Recent Documents / Recent Workspaces feature (and the Pinned variants) is the first state that must survive a restart, and whatever we pick becomes the precedent for future persisted settings (session restore, theme override, type-detection overrides).

**Decision.** Use `tauri-plugin-store`, writing a single `settings.json` (with a top-level `version` field for future migration) in the app config dir, and access it only through `src/lib/api.ts`. Components call seam functions like `loadRecents()` / `pushRecentDocument()` and never import the store directly.

**Considered options.**
- **WebView `localStorage`** — zero dependency, ~10 lines, but it lives in the webview data dir (wiped with a cache clear), isn't a real home for richer future settings, and offers no migration story.
- **Hand-rolled JSON file** — a new Rust command to expose the config dir plus the existing `read_text_file`/`write_text_file`. No new dependency, but reimplements atomic writes and schema handling the plugin already provides.
- **tauri-plugin-store (chosen)** — official, atomic, JSON in the config dir, survives webview-cache clears, and is the idiomatic home for all future settings.

**Consequences.** Adds a JS + Rust dependency. There is no *incremental* lock-in: Parchmint is already fully Tauri-coupled (all file I/O, watching, dialogs, and file associations go through Tauri commands). Swappability is preserved not by the backend choice but by the `api.ts` seam — replacing the store later is a one-file change because no component depends on it directly.
