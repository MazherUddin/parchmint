export const SIDEBAR_DEFAULT_WIDTH = 220;
export const SIDEBAR_MIN_WIDTH = 160;

/**
 * Clamp a sidebar width to [160, half the window]. Anything non-numeric
 * (missing/corrupt persisted value) falls back to the default, so a bad
 * layout.json can never wedge the sidebar off-screen.
 */
export function clampSidebarWidth(width: unknown, windowWidth: number): number {
  if (typeof width !== "number" || !Number.isFinite(width)) return SIDEBAR_DEFAULT_WIDTH;
  const max = Math.max(SIDEBAR_MIN_WIDTH, windowWidth / 2);
  return Math.min(Math.max(width, SIDEBAR_MIN_WIDTH), max);
}
