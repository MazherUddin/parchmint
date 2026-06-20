import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
// Order matters: third-party stylesheets first, then our styles.css last so its
// theme overrides (e.g. dark-mode highlight.js tokens) win.
import "highlight.js/styles/github.css";
import "katex/dist/katex.min.css";
import "./styles.css";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
