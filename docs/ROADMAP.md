# Parchmint — Roadmap

> **Orientation — read these first:**
> - [`CONTEXT.md`](../CONTEXT.md) — the glossary (what every term means)
> - [`docs/adr/`](./adr/) — the hard-to-reverse decisions and *why* (stack, token counting, honest-preview model)
> - This file — what to build, in what order, and what's done so far.

## What Parchmint is

A cross-platform desktop Markdown editor (Windows, macOS, Linux) for documents whose real consumer is an **AI** — software specs, skill files, prompts, agent instructions. Its differentiator is an **honest preview**: a beautiful rendered view *plus* an Insights panel that shows what the model actually ingests (tokens, frontmatter, structure, warnings). See ADR-0003.

## Decisions already locked

| Area | Decision | Ref |
|---|---|---|
| Editing model | Split-pane: Source pane + right-hand area | CONTEXT.md |
| Desktop stack | Tauri v2 + React + TypeScript | ADR-0001 |
| Source editor | CodeMirror 6 | — |
| Right pane | Rendered Preview pane + Insights panel | ADR-0003 |
| Token counting | Local tiktoken approximation, offline, labeled approximate | ADR-0002 |
| File model | Folder Workspace + sidebar tree + tabs | CONTEXT.md |
| Document types | Skill file, ADR, Generic-frontmatter, Plain; auto-detected non-invasively + manual override | ADR-0003 |
| Templates | Built-in "New" scaffolds per type | — |
| Markdown features | GFM + syntax-highlighted code + Mermaid + KaTeX | — |
| Pseudo-tags | Rendered as visible labeled blocks; raw HTML sanitized | ADR-0003 |
| Look & feel | Native Windows 11 Fluent (Mica, system light/dark + accent) | — |
| Output | Save .md + copy-as-Markdown + HTML/PDF export | — |
| Distribution | Unsigned NSIS/MSI installer; signing/auto-update deferred | — |
| Name | Parchmint | — |

## Phases

Status legend: ◻ not started · ◐ in progress · ☑ done

Each phase is meant to be **usable on its own**. Plan a phase in detail only when you're about to start it; deepen this file with task-level notes at that point. Record any new hard decision as an ADR when it arises.

### ☑ Phase 1 — Runnable core
**Goal:** something you can use to edit a real `.md` file every day.
- ☑ Tauri v2 + React + TS project skeleton (Vite).
- ☑ Open a folder as a Workspace; sidebar lists Markdown files, grouped by sub-folder (collapsible).
- ☑ Source pane on CodeMirror 6 (`@uiw/react-codemirror`) with Markdown syntax highlighting.
- ☑ Live Preview pane rendering GFM + syntax-highlighted code blocks (debounced 150ms).
- ☑ Multi-tab open documents; per-tab dirty state; close with unsaved-changes guard; Ctrl+S / Ctrl+W.
- ☑ Open file / Save / Save As; "New" blank document.
- ☑ Draggable splitter between Source and Preview panes.
- ☑ Live token count (whole doc) in the status bar, labeled approximate.

**Library decisions made at Phase 1 start (reversible, not ADR-worthy):**
- Markdown engine: **markdown-it** (`html:true`, `linkify:true`) + `markdown-it-task-lists`. Chosen over remark for its simple synchronous render and plugin ecosystem.
- Syntax highlighting: **highlight.js** (synchronous, simple) rather than Shiki. Shiki is a possible later swap for nicer themes.
- Tokenizer: **`gpt-tokenizer`** `o200k_base` encoding (pure-JS, offline) — realizes ADR-0002.
- File I/O: custom Rust commands (`read_text_file`, `write_text_file`, `list_markdown_files`) + `@tauri-apps/plugin-dialog` for native pickers, avoiding fs-plugin scope friction.

**Known notes:**
- Preview renders markdown-it output unsanitized (trusted local files); sanitization + pseudo-tag rendering is Phase 2.
- JS bundle is large (~3.9MB) mostly due to o200k_base rank data; code-split later if needed.

### ☑ Phase 2 — Honest preview essentials
**Goal:** the preview stops lying.
- ☑ Render pseudo-tags (`<what-to-do>`) as visible labeled blocks (`renderPreview` transforms unknown elements before sanitizing).
- ☑ Sanitize raw HTML in the preview (DOMPurify).
- ☑ **Insights panel** introduced (collapsible, below the Preview) with an issue count.
- ☑ Lint warnings: unclosed/stray pseudo-tags, broken relative links (checked against the filesystem via the `link_exists` Rust command), zero-width/invisible characters, non-breaking spaces, BOM.
- **Deferred:** type-specific frontmatter validation + structure outline (Phase 3).

**Library decision (Phase 2):** **DOMPurify** for sanitization. The "known HTML tag" set lives in `src/lib/htmlTags.ts`, shared by the preview transform and the linter.

**Gotcha (fixed):** the pseudo-tag transform must only touch **HTML-namespace** elements. KaTeX emits MathML (`<math>`/`<mrow>`/`<mi>`…) and Mermaid emits SVG — their tag names aren't "known HTML", so an unguarded transform turned them into labeled blocks. `transformPseudoTags` now skips any element whose `namespaceURI` isn't `http://www.w3.org/1999/xhtml`.

### ☑ Phase 3 — Document types, validation & templates
**Goal:** Parchmint understands *what kind* of document it's editing.
- ☑ Non-invasive document-type detection (`detectType`: frontmatter shape + filename + location) with a manual override in the status bar (per document); never writes type back into the doc.
- ☑ Frontmatter parsing (`js-yaml`) + per-type validation: Skill file requires name/description; ADR requires a top-level title; Generic = valid YAML; Plain = none. Invalid YAML is flagged.
- ☑ Structure outline (heading tree) in the Insights panel + structural warnings: skipped levels, duplicate headings, empty headings.
- ☑ Built-in "New ▾" templates per type (Skill file, ADR, Generic, Plain).

**Library decision (Phase 3):** **js-yaml** for frontmatter parsing. Document-type model + templates live in `src/lib/docType.ts`; validation in `src/lib/validate.ts`; outline in `src/lib/outline.ts`.

**Known notes:**
- The outline is display-only (no click-to-jump yet — a small follow-up that needs an imperative handle into CodeMirror to scroll to a line).

### ☑ Phase 4 — Rich rendering
**Goal:** richer documents render correctly.
- ☑ KaTeX inline (`$…$`) and block (`$$…$$`) math, via `@vscode/markdown-it-katex` (KaTeX CSS imported in `main.tsx`).
- ☑ Mermaid diagram blocks (```mermaid). A markdown-it `fence` rule emits `<div class="mermaid">source</div>`; `PreviewPane` renders them with **`mermaid.run({ nodes })`** after the DOM updates — idempotent (marks `data-processed`), so it survives StrictMode double-invokes and re-renders cleanly.

**Library decisions (Phase 4):** `@vscode/markdown-it-katex` + `katex` for math; `mermaid` for diagrams (rendered with `securityLevel: "strict"`, theme follows OS light/dark).

**Note:** Mermaid is statically imported for reliability (an earlier dynamic-import + manual `mermaid.render` approach failed to render). It now lives in the main bundle rather than a lazy chunk — re-introducing lazy loading is a possible later size optimization.

### ☑ Phase 5 — Output & sharing
**Goal:** get documents out.
- ☑ Copy-as-Markdown (whole doc) and Copy-selection, each with a toast reporting chars + ~tokens copied. Selection read from the captured CodeMirror `EditorView`.
- ☑ Export rendered Preview to **standalone HTML** (`buildStandaloneHtml` inlines the app CSS + KaTeX CSS via Vite `?inline`; captures the live preview DOM so rendered Mermaid SVG + KaTeX are included).
- ☑ Export to **PDF** via the system print dialog (`window.print()`), with a `@media print` stylesheet that isolates the preview.
- All actions live in an **Export ▾** toolbar menu (reusable `Menu` component, also used by New ▾).

**Known notes:**
- HTML export references KaTeX fonts externally, so math falls back to system fonts when the file is opened standalone (layout preserved). Embedding fonts as base64 is a possible later enhancement.

### ☑ Phase 6 — Fluent polish
**Goal:** feels native to Windows 11.
- ☑ Mica window material via `windowEffects: ["mica"]` + transparent window; chrome (toolbar/tabs/sidebar/status bar) is translucent over Mica while editor/preview stay solid. Rounded corners are provided by the OS.
- ☑ Automatic light/dark following the system theme (`prefers-color-scheme`, `color-scheme`), including dark-mode highlight.js tokens, a dark CodeMirror theme, and a dark Mermaid theme.
- ☑ Live Windows accent color via the `AccentColor` system color (with `color-mix` for soft tints) under `@supports`.
- ☑ Fluent-style controls (rounded, accent hover, `:focus-visible` rings, themed scrollbars) and a typography pass (Segoe UI Variable / Cascadia Code, antialiasing).

**Library decision (Phase 6):** no new libraries — Mica via Tauri's built-in `windowEffects`; theming via CSS + `prefers-color-scheme`.

## Open items (not yet decided)
- **Save behavior** — manual Ctrl+S + dirty indicator vs autosave (assumed manual for now).
- **Command palette** — keyboard-driven command access (nice-to-have; unplaced in phases).

## Current status
**All six phases are complete — the roadmap is done.** Parchmint is a desktop Markdown editor for AI-consumed documents (built Windows-first; cross-platform macOS/Linux support is the next milestone): tabbed editing with a workspace sidebar; an honest preview (pseudo-tags as labeled blocks, sanitized HTML) with GFM + syntax highlighting + KaTeX math + Mermaid diagrams; an Insights panel (outline + lint + structural + per-type validation); document-type detection with manual override; per-type templates (**New ▾**); export via **Export ▾** (copy as Markdown / selection, standalone HTML, PDF); and Fluent polish (Mica, system light/dark + accent, themed controls). Frontend builds clean (`npm run build`); Rust compiles (`cargo check`).

**Possible follow-ups (not yet scheduled):** outline click-to-jump; embed KaTeX fonts in HTML export; exact-Claude token counts via the Anthropic API (see ADR-0002, the "Both" option); JS bundle code-splitting; signed installer + auto-update (ADR-0001) if distributing widely.
