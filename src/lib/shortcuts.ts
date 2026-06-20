// Single source of truth for the shortcuts/help cheatsheet (display only — the
// actual key handling lives in App.tsx's onKey ladder; keep the two in sync).
// Keys are stored ABSTRACTLY ("mod", "shift", literals) and formatted to native
// glyphs at render time, so one list serves both macOS and Windows/Linux.

export interface KeyRow {
  kind: "key";
  // A sequence of simultaneously-pressed groups. Single group = a normal combo
  // (["mod","S"]); multiple groups would be a chord pressed in order, e.g.
  // [["mod","K"],["Z"]] = "mod+K then Z" (none currently, but the format supports it).
  combo: string[][];
  desc: string;
}

export interface GestureRow {
  kind: "gesture";
  gesture: string;
  desc: string;
}

export interface ShortcutGroup {
  title: string;
  rows: (KeyRow | GestureRow)[];
}

export const SHORTCUT_GROUPS: ShortcutGroup[] = [
  {
    title: "Keyboard",
    rows: [
      { kind: "key", combo: [["mod", "S"]], desc: "Save" },
      { kind: "key", combo: [["mod", "W"]], desc: "Close tab" },
      { kind: "key", combo: [["mod", "1"]], desc: "Source view" },
      { kind: "key", combo: [["mod", "2"]], desc: "Split view" },
      { kind: "key", combo: [["mod", "3"]], desc: "Preview view" },
      { kind: "key", combo: [["mod", "B"]], desc: "Toggle sidebar" },
      { kind: "key", combo: [["mod", "."]], desc: "Zen mode" },
      { kind: "key", combo: [["Esc"]], desc: "Exit zen mode" },
      { kind: "key", combo: [["mod", "/"]], desc: "Show this help" },
    ],
  },
  {
    title: "Mouse & interactions",
    rows: [
      { kind: "gesture", gesture: "Right-click preview", desc: "Edit here — jump the cursor to that line" },
      { kind: "gesture", gesture: "Click a checkbox", desc: "Toggle a task between [ ] and [x]" },
      { kind: "gesture", gesture: "Click an outline heading", desc: "Jump to that section" },
    ],
  },
];

// macOS shows ⌘/⇧/⌥; everything else spells the modifiers out.
export function isMacPlatform(): boolean {
  if (typeof navigator === "undefined") return false;
  const s = `${navigator.platform} ${navigator.userAgent}`;
  return /mac/i.test(s);
}

const GLYPHS_MAC: Record<string, string> = { mod: "⌘", shift: "⇧", alt: "⌥" };
const GLYPHS_OTHER: Record<string, string> = { mod: "Ctrl", shift: "Shift", alt: "Alt" };

export function formatToken(token: string, mac: boolean): string {
  const map = mac ? GLYPHS_MAC : GLYPHS_OTHER;
  return map[token] ?? token;
}
