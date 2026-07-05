// Classifies an anchor href from the Preview pane so clicks can be routed
// in-app. Without interception the webview performs a real top-level
// navigation (the SPA reloads and Session restore lands back on the same
// Document), so every click must be either handled here or knowingly left
// to the webview.

export type LinkAction =
  | { kind: "none" } // in-page anchor or inert scheme — leave to the webview
  | { kind: "external"; url: string } // open in the system browser/handler
  | { kind: "local"; target: string }; // path to resolve against the Document folder

// Schemes that are already safe/meaningless to route: in-page data, rendered
// asset streams, and script pseudo-URLs (DOMPurify strips javascript: anyway).
const INERT = /^(data|blob|asset|tauri|about|javascript):/i;

// A real URL scheme is 2+ chars before the colon — a Windows drive ("C:") is
// a path, not a scheme.
const SCHEME = /^[a-z][a-z0-9+.-]+:/i;

export function classifyLink(rawHref: string | null | undefined): LinkAction {
  const href = (rawHref ?? "").trim();
  if (!href || href.startsWith("#") || INERT.test(href)) return { kind: "none" };
  if (SCHEME.test(href)) return { kind: "external", url: href };
  // Anything else is a filesystem path relative to the Document. Drop an
  // in-target fragment (SKILL.md#section) and decode %-escapes to a real path.
  const file = href.split("#")[0];
  if (!file) return { kind: "none" };
  try {
    return { kind: "local", target: decodeURIComponent(file) };
  } catch {
    return { kind: "local", target: file }; // malformed escape — use as written
  }
}

/** True when a local link target should open as a Document tab. */
export function isMarkdownTarget(target: string): boolean {
  return /\.(md|markdown)$/i.test(target);
}
