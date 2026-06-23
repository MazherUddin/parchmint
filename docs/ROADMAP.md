# Parchmint — Roadmap

Where Parchmint is and where it's headed. This is a direction, not a promise — priorities
shift with feedback. Have an idea or a strong need? Open an
[issue](https://github.com/MazherUddin/parchmint/issues) or a discussion.

For *why* the core design decisions were made, see the [ADRs](./adr/).

## Shipped — v0.1.0

- **Honest preview** — pseudo-tags rendered as labeled blocks, raw HTML surfaced/sanitized.
- **Insights panel** — live token count, per-type frontmatter validation, structure outline,
  and lint warnings (unclosed tags, broken links, invisible characters).
- **Live agent reconciliation** — files rewritten on disk by AI agents live-reload clean tabs
  and raise a diff on conflict, never clobbering changes.
- **Document types & templates** — non-invasive detection of Skill files, ADRs, and
  frontmatter docs, with per-type scaffolds.
- **Rich rendering** — GFM, syntax highlighting, KaTeX math, Mermaid diagrams.
- **Export** — copy as Markdown/selection, standalone HTML, and PDF.
- **Cross-platform** — Windows, macOS (signed & notarized), and Linux, with native theming.

## Planned

- **Auto-update** — self-updating installs so users stay current without re-downloading
  (Tauri updater; needs an update endpoint + signing key). See ADR-0001.
- **Exact Claude token counts** — an opt-in mode that uses the Anthropic API for exact,
  model-accurate counts, alongside the offline approximate count. See ADR-0002.
- **Command palette** — keyboard-driven access to every command (Cmd/Ctrl-K).

## Ideas — under consideration

- Additional document types and templates.
- Embedded fonts in HTML export (so exported math is self-contained).
- Editor theme options beyond system light/dark.

Nothing here is scheduled; the [Planned](#planned) list is where active effort goes next.
