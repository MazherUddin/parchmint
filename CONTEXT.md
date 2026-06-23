# Parchmint

A cross-platform desktop Markdown editor (Windows, macOS, Linux) whose documents are written to be consumed by AI — software specs, skill files, prompts, and agent instructions. The user writes Markdown as raw text in one pane and sees the rendered result update live in an adjacent pane. Because the document's ultimate reader is often an LLM (which reads the *raw* Markdown), Parchmint cares about structure, well-formedness, and token budget as much as visual rendering.

## Language

**Source pane**:
The left-hand editing area where the user types raw Markdown text, with syntax highlighting.
_Avoid_: Editor (ambiguous — the whole app is also "the editor"), code pane

**Preview pane**:
The right-hand area that shows the rendered HTML output, updating live as the user types in the Source pane. It pairs with the Insights panel.
_Avoid_: Live viewer, renderer, output pane

**Insights panel**:
The part of the right-hand area that reports how an AI will perceive the Document — Token count, Frontmatter validation, structure/heading outline, and warnings (unclosed pseudo-tags, broken links). The "honest" counterpart to the visually-rendered Preview pane.
_Avoid_: AI lens, stats panel, linter

**Outline**:
The heading hierarchy of the Document, shown in the Insights panel. It is a *navigation control*, not just a display: selecting a heading moves the Source pane caret to that heading and scrolls the Preview pane to it. As the Preview pane scrolls, the Outline highlights the heading of the section currently being read (the **active heading**). The Source pane and Preview pane are the two views the Outline coordinates.
_Avoid_: TOC, table of contents (reserve for a heading list rendered *into* the Document), heading list

**Active heading**:
The single Outline entry highlighted to show where the reader currently is. It is driven by the Preview pane's scroll position — the lowest heading whose section the reader has scrolled into — and is not affected by the Source pane caret.
_Avoid_: Current section, selected heading (reserve "selected" for a deliberate click)

**Token count**:
The number of tokens the Document occupies, measured by a tokenizer. Always relative to a specific model family, so the count is meaningful only alongside the model/tokenizer it was computed with.
_Avoid_: Word count, length

**Pseudo-tag**:
An XML-like tag in a Document that is not a standard HTML element (e.g. `<what-to-do>`, `<system-reminder>`), used to delimit sections for an AI reader. The Preview pane renders pseudo-tags as visible labeled blocks rather than hiding them, and the Insights panel warns when one is unclosed.
_Avoid_: Custom tag, XML tag, prompt tag

**Document**:
A single Markdown file the user has open. Its text lives in the Source pane; its rendering appears in the Preview pane. A Document is typically an **AI-consumed document** — its real audience is a language model, not (only) a human reader.
_Avoid_: File (reserve "file" for the on-disk artifact), note

**Workspace**:
A folder the user has opened in Parchmint (typically a repo or a skills directory). Its Markdown files are listed in a sidebar tree; opened Documents appear as tabs.
_Avoid_: Project, vault, folder (reserve "folder" for the OS concept)

**AI-consumed document**:
The category of documents Parchmint is built for: Markdown intended to be read by an LLM rather than (or in addition to) a human. Examples: software specs, skill files, prompts, agent instructions.
_Avoid_: AI document, prompt (too narrow)

**Skill file**:
A specific kind of AI-consumed document: a Markdown file with YAML frontmatter (e.g. `name`, `description`) plus a body of instructions, used to define an agent capability.
_Avoid_: Agent file

**Frontmatter**:
The YAML metadata block delimited by `---` at the top of a Document. Structurally significant for skill files and many specs; not part of the rendered prose.
_Avoid_: Header, metadata block

**Document type**:
The recognized category of a Document — Skill file, ADR, Generic frontmatter doc, or Plain Markdown — which selects the frontmatter schema and lint rules applied. Inferred non-invasively from location, filename, and frontmatter shape, with a manual override. Parchmint never writes the detected type back into the Document.
_Avoid_: Kind, format, schema (reserve "schema" for the validation rules themselves)

**Recent Documents**:
The most-recently-opened Documents, remembered across launches so the user can reopen one without re-navigating the filesystem. A Document, not a tab — closing a tab does not remove it from the list. Auto-managed (most-recent-first, capped, self-evicting). A **Pinned Document** is promoted *out* of this list and is no longer counted as recent. Distinct from **Recent Workspaces**.
_Avoid_: Recent files, history, MRU

**Recent Workspaces**:
The most-recently-opened Workspaces (folders), remembered across launches so the user can reopen one as the sidebar root without re-navigating. Auto-managed like **Recent Documents**; a **Pinned Workspace** is promoted out of it. Distinct from **Recent Documents** — a Workspace is a folder, a Document is a single file.
_Avoid_: Recent folders, recent projects

**Pinned Document**:
A Document the user has deliberately pinned so it stays one click away regardless of how many other Documents are opened afterwards. Promoted out of the **Recent Documents** MRU and never auto-evicted; shown in its own section above the recent list. Unpinning returns it to **Recent Documents**.
_Avoid_: Favorite, bookmark, starred

**Pinned Workspace**:
A Workspace the user has deliberately pinned, promoted out of **Recent Workspaces** and never auto-evicted; shown above the recent list. Unpinning returns it to **Recent Workspaces**.
_Avoid_: Favorite, bookmark, starred

**Session**:
The state restored on launch so Parchmint reopens where you left off: the last open **Workspace** folder plus the last active **Document**. Only paths are persisted (contents are re-read from disk); restore is best-effort and silent for paths that no longer exist. Full multi-tab restore is deliberately deferred to **Recent Documents**. See docs/adr/0005.
_Avoid_: State, snapshot, history (reserve "history" for nothing — avoid entirely here)

## Flagged ambiguities

- The user's original phrase "editor and live viewer" maps to **Source pane** + **Preview pane** respectively. The editing model is split-pane source + live preview — NOT WYSIWYG/inline rendering.
