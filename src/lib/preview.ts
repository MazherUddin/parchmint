import DOMPurify from "dompurify";
import mermaid from "mermaid";
import { renderMarkdown } from "./markdown";
import { KNOWN_HTML_TAGS } from "./htmlTags";

const HTML_NS = "http://www.w3.org/1999/xhtml";

let mermaidInitialized = false;
function ensureMermaidInit(): void {
  if (mermaidInitialized) return;
  const dark =
    typeof window !== "undefined" &&
    !!window.matchMedia?.("(prefers-color-scheme: dark)").matches;
  mermaid.initialize({
    startOnLoad: false,
    securityLevel: "strict",
    theme: dark ? "dark" : "default",
  });
  mermaidInitialized = true;
}

function formatErr(e: unknown): string {
  if (e instanceof Error) return e.message;
  if (e && typeof e === "object") {
    const o = e as Record<string, unknown>;
    if (typeof o.message === "string") return o.message;
    if (typeof o.str === "string") return o.str;
    if (typeof o.error === "string") return o.error;
    try {
      return JSON.stringify(e);
    } catch {
      return String(e);
    }
  }
  return String(e);
}

// Replace every non-standard HTML element (a pseudo-tag like <what-to-do>) with
// a visible labeled block. Skips MathML (from KaTeX) and SVG by namespace.
function transformPseudoTags(container: HTMLElement): void {
  const all = Array.from(container.getElementsByTagName("*"));
  for (const el of all) {
    if (el.namespaceURI !== HTML_NS) continue;
    const tag = el.tagName.toLowerCase();
    if (KNOWN_HTML_TAGS.has(tag)) continue;
    const doc = el.ownerDocument;
    const wrapper = doc.createElement("div");
    wrapper.className = "pseudo-tag";
    const label = doc.createElement("div");
    label.className = "pseudo-tag-label";
    label.textContent = tag;
    const body = doc.createElement("div");
    body.className = "pseudo-tag-body";
    while (el.firstChild) body.appendChild(el.firstChild);
    wrapper.appendChild(label);
    wrapper.appendChild(body);
    el.replaceWith(wrapper);
  }
}

// Cache of rendered SVG keyed by the diagram's source text. mermaid.render()
// transiently injects a measuring element into document.body, which forces a
// full-page reflow — visible as a window-wide flicker on every keystroke when a
// document contains a diagram. Caching means an unchanged diagram is never
// re-rendered, so typing elsewhere in the doc does no body injection at all.
const mermaidCache = new Map<string, string>();
const MERMAID_CACHE_LIMIT = 64;

// Render every <div class="mermaid"> in place, replacing its source-text content
// with the SVG produced by mermaid.render(). mermaid's strict securityLevel
// already sanitises the SVG, so this output is safe to embed directly.
async function renderMermaidIn(container: HTMLElement): Promise<void> {
  const divs = Array.from(container.querySelectorAll<HTMLElement>(".mermaid"));
  if (divs.length === 0) return;
  for (let i = 0; i < divs.length; i++) {
    const div = divs[i];
    const def = (div.textContent ?? "").trim();
    const cached = mermaidCache.get(def);
    if (cached !== undefined) {
      div.innerHTML = cached;
      div.setAttribute("data-processed", "true");
      continue;
    }
    ensureMermaidInit();
    try {
      const { svg } = await mermaid.render(`mmd-${Date.now()}-${i}`, def);
      if (mermaidCache.size >= MERMAID_CACHE_LIMIT) {
        mermaidCache.delete(mermaidCache.keys().next().value as string);
      }
      mermaidCache.set(def, svg);
      div.innerHTML = svg;
      div.setAttribute("data-processed", "true");
    } catch (e) {
      div.classList.add("mermaid-error");
      div.textContent = "Mermaid error: " + formatErr(e);
      div.setAttribute("data-processed", "true");
    }
  }
}

// Render Markdown → HTML, transform pseudo-tags, sanitize the markdown output,
// then render mermaid diagrams into the sanitized HTML. Mermaid's SVG is added
// after sanitization (it's already sanitised by mermaid in strict mode).
export async function renderPreview(source: string): Promise<string> {
  const rawHtml = renderMarkdown(source);
  const doc = new DOMParser().parseFromString(rawHtml, "text/html");
  transformPseudoTags(doc.body);
  const sanitized = DOMPurify.sanitize(doc.body.innerHTML);
  const doc2 = new DOMParser().parseFromString(sanitized, "text/html");
  await renderMermaidIn(doc2.body);
  return doc2.body.innerHTML;
}
