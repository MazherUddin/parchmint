import appCss from "../styles.css?inline";
import katexCss from "katex/dist/katex.min.css?inline";

function escapeHtml(s: string): string {
  return s.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string,
  );
}

// Wrap already-rendered preview HTML (KaTeX + Mermaid SVG included) into a
// self-contained .html document. The app's stylesheet and KaTeX CSS are inlined.
// (KaTeX font files remain external, so math falls back to system fonts when the
// file is opened standalone — layout is preserved.)
export function buildStandaloneHtml(title: string, bodyHtml: string): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(title)}</title>
<style>${appCss}</style>
<style>${katexCss}</style>
<style>
  html, body, #root { height: auto !important; overflow: visible !important; }
  body { background: #fff; margin: 0; }
  .export-root { max-width: 900px; margin: 0 auto; padding: 32px; }
</style>
</head>
<body>
<article class="markdown-body export-root">
${bodyHtml}
</article>
</body>
</html>
`;
}
