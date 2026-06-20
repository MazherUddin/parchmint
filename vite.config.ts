import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// @ts-expect-error process is a nodejs global
const host = process.env.TAURI_DEV_HOST;

// https://vite.dev/config/
export default defineConfig(async () => ({
  plugins: [react()],

  // Relative asset URLs so dynamically-imported chunks (e.g. mermaid's per-diagram
  // modules) resolve under Tauri's custom asset protocol in production builds.
  base: "./",

  // Inline all dynamic imports into the main bundle. Mermaid lazy-loads each
  // diagram type via internal `import()`, and those runtime chunk fetches hang
  // under Tauri's asset protocol in production. Inlining removes the runtime
  // fetches entirely (everything is in-memory). Bundle gets larger; for a local
  // desktop app that's an acceptable trade-off for reliability.
  build: {
    rollupOptions: {
      output: {
        inlineDynamicImports: true,
      },
    },
  },

  // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
  //
  // 1. prevent Vite from obscuring rust errors
  clearScreen: false,
  // 2. tauri expects a fixed port, fail if that port is not available
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host
      ? {
          protocol: "ws",
          host,
          port: 1421,
        }
      : undefined,
    watch: {
      // 3. tell Vite to ignore watching `src-tauri`
      ignored: ["**/src-tauri/**"],
    },
  },
}));
