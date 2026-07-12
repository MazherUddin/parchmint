// Tiny dependency-free fuzzy matcher for the command palette. A query matches a
// target when its characters appear in order (a subsequence), case-insensitively.
// The score rewards matches that are contiguous and that land on word boundaries
// so "ip" ranks "Insert pseudo-tag" above "Split view". Kept pure and free of any
// CodeMirror/DOM coupling so it is cheap to unit-test.

export interface FuzzyResult {
  /** Higher is better. Only meaningful relative to other results for the same query. */
  score: number;
  /** Indices into the target string that matched, for optional highlighting. */
  positions: number[];
}

const WORD_BOUNDARY = /[\s/\\\-_.:]/;

/** True if the char at `i` begins a "word" (doc start, after a separator, or camelHump). */
function isBoundary(target: string, i: number): boolean {
  if (i === 0) return true;
  const prev = target[i - 1];
  if (WORD_BOUNDARY.test(prev)) return true;
  // camelCase hump: lowercase/digit followed by uppercase.
  return prev === prev.toLowerCase() && target[i] !== target[i].toLowerCase();
}

/**
 * Match `query` against `target`. Returns null when `query` is not a subsequence
 * of `target`. An empty query matches everything with a neutral score, so an empty
 * palette input can list every command.
 */
export function fuzzyMatch(query: string, target: string): FuzzyResult | null {
  if (query.length === 0) return { score: 0, positions: [] };
  if (query.length > target.length) return null;

  // The boundary-preferring pass gives better positions ("doc" lands on the start
  // of "Document") but can overshoot and strand the rest of the query ("defa" vs
  // "Set as default Markdown editor": jumping `e` to "editor" leaves no `f`). The
  // plain greedy pass never overshoots, so it decides matchability.
  return matchFrom(query, target, true) ?? matchFrom(query, target, false);
}

function matchFrom(query: string, target: string, preferBoundaries: boolean): FuzzyResult | null {
  const q = query.toLowerCase();
  const t = target.toLowerCase();
  const positions: number[] = [];
  let score = 0;
  let ti = 0;
  let prevMatch = -2; // so the first match is never treated as "contiguous"

  for (let qi = 0; qi < q.length; qi++) {
    const ch = q[qi];
    const found = t.indexOf(ch, ti);
    if (found === -1) return null;

    // Prefer a boundary occurrence over the first greedy hit when one is nearby —
    // keeps "doc" matching "Document" at the start rather than mid-word.
    let at = found;
    if (preferBoundaries && !isBoundary(target, found)) {
      const boundaryHit = nextBoundaryOccurrence(target, t, ch, found + 1);
      if (boundaryHit !== -1) at = boundaryHit;
    }

    positions.push(at);
    if (at === prevMatch + 1) score += 12; // contiguous run (beats a boundary hit)
    if (isBoundary(target, at)) score += 10; // word-boundary hit
    score += 1; // base credit per matched char
    score -= Math.max(0, at - ti) * 0.5; // penalise skipped characters (gaps)
    prevMatch = at;
    ti = at + 1;
  }

  // Reward matches that start early and that cover a large fraction of the target.
  score -= positions[0] * 0.5;
  score += (q.length / target.length) * 5;
  return { score, positions };
}

/** Index of the next occurrence of `ch` (from `start`) that sits on a word boundary. */
function nextBoundaryOccurrence(target: string, lowered: string, ch: string, start: number): number {
  let i = lowered.indexOf(ch, start);
  while (i !== -1) {
    if (isBoundary(target, i)) return i;
    i = lowered.indexOf(ch, i + 1);
  }
  return -1;
}

export interface Ranked<T> {
  item: T;
  result: FuzzyResult;
}

/**
 * Rank `items` against `query`, dropping non-matches. Sorted by score (desc), then
 * shorter targets first, then alphabetically — a stable, predictable order.
 */
export function fuzzyRank<T>(query: string, items: T[], key: (item: T) => string): Ranked<T>[] {
  const ranked: Ranked<T>[] = [];
  for (const item of items) {
    const target = key(item);
    const result = fuzzyMatch(query, target);
    if (result) ranked.push({ item, result });
  }
  ranked.sort((a, b) => {
    if (b.result.score !== a.result.score) return b.result.score - a.result.score;
    const ka = key(a.item);
    const kb = key(b.item);
    if (ka.length !== kb.length) return ka.length - kb.length;
    return ka.localeCompare(kb);
  });
  return ranked;
}
