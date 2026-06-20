# Count tokens locally with tiktoken, accepting approximation across models

**Context.** Parchmint's headline Insights feature is a live token count for AI-consumed documents. Tokenizers are model-specific. The real target audience often writes for Claude (skill files, Claude Code), but exact Claude counts require Anthropic's `count_tokens` API — a network call, an API key, and sending document text off-machine. Specs and skill files are frequently confidential.

**Decision.** Compute token counts locally using a bundled OpenAI tokenizer (o200k/cl100k via a JS/WASM port). Counts are exact for GPT models and a close approximation (~±10–15%) for Claude and others. The count is always labeled with the tokenizer/model family used.

**Considered options.**
- **Anthropic `count_tokens` API** — exact for the true target (Claude), but requires an API key, adds per-keystroke network latency, and transmits potentially confidential document text. Rejected as the V1 default for privacy and zero-setup reasons.
- **char ÷ 4 heuristic** — instant and dependency-free, but too crude for code-heavy docs to be a headline feature.

**Consequences.** Claude token counts are approximate; the UI must label them as such to avoid implying false precision. An opt-in Anthropic-API mode for exact Claude counts is a natural later addition (see "Both" option) and would not invalidate this decision.
