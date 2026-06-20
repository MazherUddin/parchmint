# Parchmint

**A Markdown editor for AI-consumed documents.** Write docs, prompts, and skill files
with an *honest preview* of exactly what the model will read — not a prettified render.

<!-- TODO: demo GIF -->
<!-- ![Parchmint demo](docs/demo.gif) -->

## Why

Most Markdown editors optimize for how a document looks to a human. When the reader is an
LLM, what matters is the raw text and its token cost — Parchmint shows you that directly:

- **Honest preview** — see the document as the model sees it, not a styled approximation.
- **Token awareness** — know the cost of what you're writing as you write it.
- **Built for AI workflows** — docs, system prompts, and Claude Code / skill files.

## Install

Download the latest build for your OS from the
[Releases](https://github.com/MazherUddin/parchmint/releases/latest) page.

> **Windows:** the app is currently unsigned. On first launch SmartScreen may warn —
> click **More info → Run anyway**.

## Build from source

Requires [Node.js](https://nodejs.org), [Rust](https://rustup.rs), and the
[Tauri prerequisites](https://tauri.app/start/prerequisites/) for your platform.

```bash
npm install
npm run tauri dev      # run in development
npm run tauri build    # produce a release build
```

## License

[MIT](LICENSE) © Abu Mazher Uddin
