// Pure text transforms behind the palette's formatting and insert commands. Each
// takes the document text plus a selection [from, to) and returns a single Splice
// describing the change and the resulting selection. Keeping these pure (no
// EditorView, no DOM) means the markup logic is unit-tested directly; App.tsx
// only translates a Splice into a CodeMirror transaction.

export interface Splice {
  /** Replace the range [from, to) … */
  from: number;
  to: number;
  /** … with this text. */
  insert: string;
  /** Resulting selection anchor, as an offset in the new document. */
  selFrom: number;
  /** Resulting selection head, as an offset in the new document. */
  selTo: number;
}

/** Start offset of the line containing `pos`. */
function lineStart(text: string, pos: number): number {
  return text.lastIndexOf("\n", pos - 1) + 1;
}

/** End offset (exclusive of the newline) of the line containing `pos`. */
function lineEnd(text: string, pos: number): number {
  const nl = text.indexOf("\n", pos);
  return nl === -1 ? text.length : nl;
}

/**
 * Toggle an inline marker (`**`, `*`, `~~`, `` ` ``) around the selection.
 * Removes the marker when the selection is already wrapped (inside or just
 * outside); otherwise adds it. With no selection, inserts an empty pair and puts
 * the caret between the markers.
 */
export function wrapInline(text: string, from: number, to: number, marker: string): Splice {
  const len = marker.length;
  const selected = text.slice(from, to);

  // Already wrapped just outside the selection: …**[sel]**… → unwrap.
  if (
    from >= len &&
    to + len <= text.length &&
    text.slice(from - len, from) === marker &&
    text.slice(to, to + len) === marker
  ) {
    return {
      from: from - len,
      to: to + len,
      insert: selected,
      selFrom: from - len,
      selTo: from - len + selected.length,
    };
  }

  // The selection itself is wrapped: [**sel**] → unwrap the inner text.
  if (selected.length >= 2 * len && selected.startsWith(marker) && selected.endsWith(marker)) {
    const inner = selected.slice(len, selected.length - len);
    return { from, to, insert: inner, selFrom: from, selTo: from + inner.length };
  }

  // Empty selection: drop an empty pair and place the caret inside.
  if (from === to) {
    return { from, to, insert: marker + marker, selFrom: from + len, selTo: from + len };
  }

  // Wrap, keeping the original text selected (now offset by the leading marker).
  return {
    from,
    to,
    insert: marker + selected + marker,
    selFrom: from + len,
    selTo: from + len + selected.length,
  };
}

/**
 * Set the heading level of the line at the selection. Re-applying the current
 * level removes the heading (toggle back to plain text).
 */
export function setHeading(text: string, from: number, _to: number, level: number): Splice {
  const ls = lineStart(text, from);
  const le = lineEnd(text, from);
  const line = text.slice(ls, le);
  const m = line.match(/^(#{1,6})\s+/);
  const currentLevel = m ? m[1].length : 0;
  const body = m ? line.slice(m[0].length) : line;
  const newLine = currentLevel === level ? body : "#".repeat(level) + " " + body;
  const caret = ls + newLine.length;
  return { from: ls, to: le, insert: newLine, selFrom: caret, selTo: caret };
}

export type ListKind = "bullet" | "ordered" | "quote";

const BULLET_RE = /^(\s*)[-*+]\s+/;
const ORDERED_RE = /^(\s*)\d+\.\s+/;
const QUOTE_RE = /^(\s*)>\s?/;

/**
 * Toggle a line-level prefix (bullet, ordered number, or blockquote) across every
 * line the selection spans. If every non-blank line already has the prefix it is
 * removed; otherwise it is added (numbered sequentially for ordered lists).
 */
export function toggleLinePrefix(text: string, from: number, to: number, kind: ListKind): Splice {
  const ls = lineStart(text, from);
  const le = lineEnd(text, to);
  const block = text.slice(ls, le);
  const lines = block.split("\n");
  const re = kind === "bullet" ? BULLET_RE : kind === "ordered" ? ORDERED_RE : QUOTE_RE;

  const nonBlank = lines.filter((l) => l.trim().length > 0);
  const allPrefixed = nonBlank.length > 0 && nonBlank.every((l) => re.test(l));

  let n = 0;
  const out = lines.map((line) => {
    if (line.trim().length === 0) return line;
    if (allPrefixed) return line.replace(re, "$1");
    n += 1;
    const indent = line.match(/^\s*/)?.[0] ?? "";
    const rest = line.slice(indent.length);
    const prefix = kind === "bullet" ? "- " : kind === "ordered" ? `${n}. ` : "> ";
    return indent + prefix + rest;
  });

  const newBlock = out.join("\n");
  return { from: ls, to: le, insert: newBlock, selFrom: ls, selTo: ls + newBlock.length };
}

/**
 * Wrap the selection as a Markdown link. With text selected, the caret lands on
 * the `url` placeholder; with no selection, on the `text` placeholder.
 */
export function makeLink(text: string, from: number, to: number): Splice {
  const selected = text.slice(from, to);
  if (selected.length > 0) {
    const insert = `[${selected}](url)`;
    const urlStart = from + 1 + selected.length + 2; // past `[sel](`
    return { from, to, insert, selFrom: urlStart, selTo: urlStart + 3 };
  }
  const insert = "[text](url)";
  return { from, to, insert, selFrom: from + 1, selTo: from + 5 };
}

/**
 * Insert a block on its own lines at the cursor (replacing any selection),
 * guaranteeing blank-line separation from surrounding prose. When `selectToken`
 * occurs in the block, that token is selected so the user can type over a
 * placeholder; otherwise the caret lands at the block's start.
 */
export function insertBlock(
  text: string,
  from: number,
  to: number,
  block: string,
  selectToken?: string,
): Splice {
  const before =
    from === 0 ? "" : text[from - 1] === "\n" ? (from >= 2 && text[from - 2] === "\n" ? "" : "\n") : "\n\n";
  const after =
    to >= text.length ? "" : text[to] === "\n" ? (to + 1 < text.length && text[to + 1] === "\n" ? "" : "\n") : "\n\n";

  const insert = before + block + after;
  let selFrom = from + before.length;
  let selTo = selFrom;
  if (selectToken) {
    const idx = block.indexOf(selectToken);
    if (idx !== -1) {
      selFrom = from + before.length + idx;
      selTo = selFrom + selectToken.length;
    }
  }
  return { from, to, insert, selFrom, selTo };
}
