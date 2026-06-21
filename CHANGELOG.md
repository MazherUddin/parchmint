# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Cross-platform support (macOS + Linux alongside Windows): per-OS window
  material — Mica on Windows, vibrancy on macOS, opaque on Linux — and macOS
  Finder file-open via Apple Events (`.md` double-click parity). See ADR-0006.
- About dialog (icon, version, maintainer attribution, Website/GitHub/License
  links) reachable from the status bar and the shortcuts sheet.

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
