import { describe, it, expect } from "vitest";
import { countTokens } from "./tokens";

describe("countTokens", () => {
  it("returns 0 for empty text", () => {
    expect(countTokens("")).toBe(0);
  });

  it("counts a non-empty string as at least one token", () => {
    expect(countTokens("hello")).toBeGreaterThan(0);
  });

  it("counts more tokens for longer text", () => {
    const short = countTokens("one");
    const long = countTokens("one two three four five six seven eight");
    expect(long).toBeGreaterThan(short);
  });

  it("counts whitespace-only text as a small positive number", () => {
    expect(countTokens("   ")).toBeGreaterThan(0);
  });
});
