import { encode } from "gpt-tokenizer/encoding/o200k_base";

// Local, offline token counting via OpenAI's o200k_base tokenizer. Exact for
// modern GPT models; an approximation (~±10–15%) for Claude and others. See
// ADR-0002 — the UI labels this count as approximate.
export function countTokens(text: string): number {
  if (!text) return 0;
  try {
    return encode(text).length;
  } catch {
    // Defensive fallback: rough estimate if the tokenizer ever throws.
    return Math.ceil(text.length / 4);
  }
}
