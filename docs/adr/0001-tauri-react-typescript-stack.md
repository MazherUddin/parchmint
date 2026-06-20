# Build Parchmint on Tauri v2 with a React + TypeScript frontend

**Context.** Parchmint is a Windows desktop Markdown editor with a split-pane Source + live Preview model. The preview renders Markdown to HTML, which favors a web-rendering frontend. We needed a desktop shell and a UI framework.

**Decision.** Use Tauri v2 (thin Rust backend for file I/O and window management) with a React + TypeScript frontend. On Windows, Tauri reuses the built-in WebView2, giving ~10–20MB installs and fast startup, while React provides the largest ecosystem of relevant libraries (CodeMirror, markdown-it, UI kits) and the most available help.

**Considered options.**
- **Electron** — proven (Obsidian, VS Code, Mark Text) with the gentlest learning curve and biggest ecosystem, but ~120–200MB installs and heavier RAM. Rejected in favor of Tauri's far smaller footprint; the "beautiful + lightweight" goal weighed against bundling a whole Chromium.
- **.NET WinUI 3 + WebView2** — most native, best OS integration, but more Windows-specific code and harder to style the native shell. Rejected to keep the UI fully web-tech (easier to make "beautiful") and to avoid a C#/XAML learning curve.
- **Flutter** — single codebase, custom rendering, but no real HTML engine makes a pixel-accurate HTML preview harder.
- **Svelte / Vue / Vanilla** as the frontend — viable, but React was chosen for ecosystem size and ease of finding help.

**Consequences.** Some Rust is required for backend glue (kept minimal). We depend on WebView2 being present (standard on Windows 11; bootstrappable on older systems via the installer).
