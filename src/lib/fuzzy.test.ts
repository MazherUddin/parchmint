import { describe, it, expect } from "vitest";
import { fuzzyMatch, fuzzyRank } from "./fuzzy";

describe("fuzzyMatch", () => {
  it("matches an empty query against anything with a neutral score", () => {
    const r = fuzzyMatch("", "anything");
    expect(r).toEqual({ score: 0, positions: [] });
  });

  it("matches a contiguous substring", () => {
    expect(fuzzyMatch("ins", "Insert table")).not.toBeNull();
  });

  it("matches a non-contiguous subsequence", () => {
    expect(fuzzyMatch("itb", "Insert table")).not.toBeNull();
  });

  it("matches when the boundary-preferring pass overshoots (greedy fallback)", () => {
    // `d` lands on "default", the boundary pass then jumps `e` ahead to
    // "editor", stranding `f` — the greedy fallback must still match.
    expect(fuzzyMatch("defa", "Set as default Markdown editor")).not.toBeNull();
  });

  it("is case-insensitive", () => {
    expect(fuzzyMatch("INS", "insert")).not.toBeNull();
    expect(fuzzyMatch("ins", "INSERT")).not.toBeNull();
  });

  it("returns null when characters are out of order", () => {
    expect(fuzzyMatch("tbi", "Insert table")).toBeNull();
  });

  it("returns null when a character is absent", () => {
    expect(fuzzyMatch("xyz", "Insert table")).toBeNull();
  });

  it("returns null when the query is longer than the target", () => {
    expect(fuzzyMatch("toolong", "to")).toBeNull();
  });

  it("scores a prefix higher than a scattered match", () => {
    const prefix = fuzzyMatch("doc", "Document")!;
    const scattered = fuzzyMatch("doc", "duplicate of contents")!;
    expect(prefix.score).toBeGreaterThan(scattered.score);
  });

  it("scores a contiguous run higher than the same chars spread out", () => {
    const contiguous = fuzzyMatch("table", "table view")!;
    const spread = fuzzyMatch("table", "t a b l e")!;
    expect(contiguous.score).toBeGreaterThan(spread.score);
  });

  it("favours word-boundary matches (acronym)", () => {
    // "ip" should match "Insert Pseudo-tag" on the two word starts.
    const r = fuzzyMatch("ip", "Insert Pseudo-tag")!;
    expect(r.positions[0]).toBe(0);
    expect("Insert Pseudo-tag"[r.positions[1]]).toBe("P");
  });

  it("reports matched positions in ascending order", () => {
    const r = fuzzyMatch("itb", "Insert table")!;
    expect(r.positions).toHaveLength(3);
    for (let i = 1; i < r.positions.length; i++) {
      expect(r.positions[i]).toBeGreaterThan(r.positions[i - 1]);
    }
  });
});

describe("fuzzyRank", () => {
  const commands = ["Insert table", "Split view", "Save", "Insert Mermaid diagram", "Toggle sidebar"];

  it("drops non-matches and keeps matches", () => {
    const ranked = fuzzyRank("ins", commands, (c) => c);
    const titles = ranked.map((r) => r.item);
    expect(titles).toContain("Insert table");
    expect(titles).toContain("Insert Mermaid diagram");
    expect(titles).not.toContain("Save");
  });

  it("orders the best match first", () => {
    const ranked = fuzzyRank("save", commands, (c) => c);
    expect(ranked[0].item).toBe("Save");
  });

  it("breaks ties by shorter target, then alphabetically", () => {
    const items = ["abcc", "abc", "abd"];
    const ranked = fuzzyRank("ab", items, (c) => c);
    // "abc" and "abd" both length 3 and tie on score → alphabetical; "abcc" longer.
    expect(ranked.map((r) => r.item)).toEqual(["abc", "abd", "abcc"]);
  });

  it("returns an empty array when nothing matches", () => {
    expect(fuzzyRank("zzz", commands, (c) => c)).toEqual([]);
  });
});
