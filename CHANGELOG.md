# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Command palette (`Ctrl`/`Cmd`+`K`): run any command, or type to fuzzy-jump to
  any file in the workspace. A leading `>` restricts results to commands.
- In-editor formatting without hand-typing the markup: `Ctrl`/`Cmd`+`B` (bold)
  and `Ctrl`/`Cmd`+`I` (italic), plus palette commands for headings, lists,
  links, inline code, and quotes — and insert snippets for tables, Mermaid
  diagrams, math blocks, code blocks, and pseudo-tags.
- Test suite (Vitest) covering the core libraries (tokens, lint, frontmatter,
  outline, document-type detection, validation, formatting), run in CI.
- Cross-platform support (macOS + Linux alongside Windows): per-OS window
  material — Mica on Windows, vibrancy on macOS, opaque on Linux — and macOS
  Finder file-open via Apple Events (`.md` double-click parity). See ADR-0006.
- About dialog (icon, version, maintainer attribution, Website/GitHub/License
  links) reachable from the status bar and the shortcuts sheet.

### Changed
- `Ctrl`/`Cmd`+`B` now toggles **bold** when the Source pane is focused and
  toggles the sidebar otherwise (the sidebar also has a toolbar button and a
  palette command).

## [0.1.0] - 2026-06-20

Initial public release.

### Added
- Markdown editor with an *honest preview* of exactly what an LLM reads — raw text, not a
  prettified render.
- Live token counting.
- Split source/preview panes with soft-wrap toggle.
- File tabs, recents, and external-change reconciliation.
- Syntax highlighting, KaTeX math, Mermaid diagrams, and task-list support.
- Cross-platform builds for Windows, macOS, and Linux.

[Unreleased]: https://github.com/MazherUddin/parchmint/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/MazherUddin/parchmint/releases/tag/v0.1.0
