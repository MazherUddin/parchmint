# The preview is "honest": rendered HTML plus an Insights panel, and the document is never mutated

**Context.** Parchmint's documents are written to be consumed by an LLM, which reads the *raw* Markdown — not the rendered HTML. A conventional "beautiful live preview" therefore lies to the author: it hides frontmatter, collapses whitespace, and silently swallows pseudo-tags (`<what-to-do>`) that a browser treats as invisible unknown HTML. The visual rendering is for the human; it is not what the model sees.

**Decision.** The right-hand area has two coordinated parts:
1. **Preview pane** — the beautiful rendered HTML (the human's view), but with pseudo-tags rendered as *visible labeled blocks* rather than invisible wrappers, and raw HTML sanitized.
2. **Insights panel** — the "what the AI sees" view: live token count, frontmatter validation against the detected document type, a structure outline, and lint warnings (unclosed pseudo-tags, broken links).

Document type is detected **non-invasively** from location, filename, and frontmatter shape — Parchmint never writes a `type:` field (or any other marker) back into the document, because that would pollute the text the model reads.

**Considered options.**
- **Plain rendered preview only** (Typora-style) — simplest and prettiest, but recreates the exact "preview lies" problem Parchmint exists to solve. Rejected.
- **Raw "what the AI sees" view only** — maximally honest but abandons the "beautiful viewer" the product also wants. Rejected in favor of showing both.

**Consequences.** The right pane is more complex than a standard Markdown preview. Pseudo-tag detection needs a rule for "XML-ish tag that isn't standard HTML." Frontmatter/structure validation requires per-document-type schemas (Skill file, ADR, Generic, Plain). The non-invasive-detection constraint means type inference can be wrong, which is why a manual override exists.
