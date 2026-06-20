import MarkdownIt from "markdown-it";
import taskLists from "markdown-it-task-lists";
import markdownItKatex from "@vscode/markdown-it-katex";
import hljs from "highlight.js";

function escapeHtml(s: string): string {
  return s.replace(
    /[&<>"']/g,
    (c) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[c] as string,
  );
}

// GitHub-Flavored baseline: tables + strikethrough are built in; linkify adds
// autolinks; the task-lists plugin adds checkboxes; KaTeX renders $…$ / $$…$$ math.
// NOTE: html:true passes raw HTML through; renderPreview() sanitizes afterwards.
const md = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: false,
  highlight(code: string, lang: string): string {
    if (lang && hljs.getLanguage(lang)) {
      try {
        const out = hljs.highlight(code, { language: lang }).value;
        return `<pre class="hljs"><code>${out}</code></pre>`;
      } catch {
        /* fall through to escaped output */
      }
    }
    return `<pre class="hljs"><code>${escapeHtml(code)}</code></pre>`;
  },
});

md.use(taskLists, { enabled: true, label: true });
md.use(markdownItKatex, { throwOnError: false });

// Stamp each task-list checkbox with the 0-based source line of its list item so
// the Preview can map a click back to the exact line and toggle [ ]/[x] there.
// Runs after the task-lists plugin has injected the checkbox tokens. The checkbox
// is an html_inline token whose raw content is `<input class="task-list-item-
// checkbox" …>`; with label:true it's not children[0] (the <label> is), so scan.
// DOMPurify keeps data-* attributes, so the stamp survives sanitization.
md.core.ruler.after("github-task-lists", "task-list-source-lines", (state) => {
  const tokens = state.tokens;
  for (let i = 0; i < tokens.length; i++) {
    const tok = tokens[i];
    if (tok.type !== "inline" || !tok.children) continue;
    const checkbox = tok.children.find(
      (c) => c.type === "html_inline" && c.content.includes("task-list-item-checkbox"),
    );
    if (!checkbox) continue;
    let line: number | null = null;
    for (let j = i - 1; j >= 0; j--) {
      if (tokens[j].type === "list_item_open" && tokens[j].map) {
        line = tokens[j].map![0];
        break;
      }
    }
    if (line === null) continue;
    checkbox.content = checkbox.content.replace(/^<input /, `<input data-task-line="${line}" `);
  }
});

// Stamp each heading with its 1-based source line (token.map is 0-based) so the
// Outline can scroll the Preview pane to the matching element. This is the same
// line number buildOutline() reports, so they reconcile exactly. DOMPurify keeps
// data-* attributes, so it survives sanitization.
const defaultHeadingOpen =
  md.renderer.rules.heading_open ??
  ((tokens, idx, options, _env, self) => self.renderToken(tokens, idx, options));
md.renderer.rules.heading_open = (tokens, idx, options, env, self) => {
  const token = tokens[idx];
  if (token.map) token.attrSet("data-source-line", String(token.map[0] + 1));
  return defaultHeadingOpen(tokens, idx, options, env, self);
};

// Stamp every block-level element with its 1-based source line so the Preview's
// right-click "Edit here" can jump the editor to the exact line clicked. Distinct
// from data-source-line (headings only, used by the outline scroll-spy) — this
// covers paragraphs, list items, blockquotes, tables, etc. The nearest-ancestor
// walk in PreviewPane resolves to the innermost stamped block under the cursor.
md.core.ruler.push("edit-source-lines", (state) => {
  for (const token of state.tokens) {
    if (token.nesting === 1 && token.map && token.tag) {
      token.attrSet("data-edit-line", String(token.map[0] + 1));
    }
  }
});

// ```mermaid blocks become a <div class="mermaid"> placeholder holding the raw
// diagram source; PreviewPane renders them to SVG with mermaid.run() once the
// HTML is in the DOM.
const defaultFence = md.renderer.rules.fence!;
md.renderer.rules.fence = (tokens, idx, options, env, self) => {
  const info = tokens[idx].info.trim().split(/\s+/g)[0];
  if (info === "mermaid") {
    return `<div class="mermaid">${escapeHtml(tokens[idx].content)}</div>\n`;
  }
  return defaultFence(tokens, idx, options, env, self);
};

export function renderMarkdown(source: string): string {
  return md.render(source);
}
