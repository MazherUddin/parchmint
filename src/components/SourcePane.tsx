import CodeMirror from "@uiw/react-codemirror";
import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
import type { EditorView } from "@codemirror/view";
import { softWrap } from "./softWrap";

interface SourcePaneProps {
  value: string;
  onChange: (value: string) => void;
  onEditorReady?: (view: EditorView) => void;
  theme?: "light" | "dark";
}

// Hoisted to module scope so their reference identity is stable across renders.
// @uiw/react-codemirror reconfigures the editor whenever the `extensions` or
// `basicSetup` props change by reference — passing fresh literals on every
// keystroke re-ran the markdown parser and re-applied syntax highlighting to the
// whole visible region, which showed up as a flicker on decoration-heavy docs.
const EXTENSIONS = [markdown({ base: markdownLanguage }), softWrap];
const BASIC_SETUP = {
  lineNumbers: true,
  foldGutter: false,
  highlightActiveLine: true,
  highlightActiveLineGutter: true,
} as const;

export function SourcePane({ value, onChange, onEditorReady, theme = "light" }: SourcePaneProps) {
  return (
    <CodeMirror
      className="source-cm"
      value={value}
      height="100%"
      theme={theme}
      onChange={onChange}
      onCreateEditor={(view) => onEditorReady?.(view)}
      extensions={EXTENSIONS}
      basicSetup={BASIC_SETUP}
    />
  );
}
