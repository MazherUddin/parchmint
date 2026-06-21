import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
// Order matters: third-party stylesheets first, then our styles.css last so its
// theme overrides (e.g. dark-mode highlight.js tokens) win.
import "highlight.js/styles/github.css";
import "katex/dist/katex.min.css";
import "./styles.css";

// Tag the document with the host OS so CSS can adapt to the native window
// material: Windows (Mica) and macOS (vibrancy) keep translucent chrome, while
// Linux — which has no equivalent material — falls back to an opaque background.
const ua = navigator.userAgent;
const os = /Windows/.test(ua)
  ? "windows"
  : /Mac OS X|Macintosh/.test(ua)
    ? "macos"
    : /Linux|X11/.test(ua)
      ? "linux"
      : "other";
document.documentElement.classList.add(`os-${os}`);

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
