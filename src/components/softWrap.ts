import { EditorView } from "@codemirror/view";

// Soft-wrap the source pane. Display-only: CodeMirror wraps long lines visually
// without inserting newline characters, so the file an AI consumes is unchanged.
//
// Everything wraps, including code blocks and tables. An earlier version tried to
// exempt those (white-space: pre + per-line horizontal scroll) so column
// alignment would survive, but a non-wrapping line makes CodeMirror measure the
// content box at that line's full width — which re-introduced a document-level
// horizontal scrollbar and stopped prose from visibly wrapping at all. The
// rendered preview already shows code and tables with correct alignment, so the
// source pane wrapping them is an acceptable trade for prose that actually wraps.
export const softWrap = [EditorView.lineWrapping];
