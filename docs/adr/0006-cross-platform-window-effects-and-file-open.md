# Go cross-platform: gate the native window material per-OS and handle macOS file-open via Apple Events

**Context.** Parchmint began Windows-only (see ADR-0001) and leaned on two Windows-specific behaviours: a **Mica** window material (`transparent: true` + `windowEffects: ["mica"]` in `tauri.conf.json`), and a double-clicked `.md` file delivered to the app through **argv**. Taking Parchmint cross-platform (macOS + Linux, built in CI) breaks both:

- **Mica is Windows-11-only.** A transparent window with Mica requested on macOS/Linux renders wrong — on macOS the effect is ignored and the transparent surface can show garbage; on Linux there is no equivalent material and the translucent chrome shows the desktop through it.
- **macOS does not pass opened files via argv.** Finder (and `open file.md`) delivers them as **Apple Events**, which Tauri surfaces as `RunEvent::Opened`. The argv path returns nothing on macOS, so double-click-to-open silently fails.

The hard constraint: **Windows behaviour must stay byte-identical** — Windows is the only platform verifiable on the maintainer's machine, and it is the shipping baseline.

**Decision.**

1. **Window material is applied per-OS at runtime, not in static config.** Remove `windowEffects` from `tauri.conf.json` (keeping `transparent: true`, which both Mica and vibrancy require) and apply the material in the Rust `setup` hook:
   - **Windows** → Mica (`window-vibrancy::apply_mica`) — same DWM material as before.
   - **macOS** → vibrancy (`window-vibrancy::apply_vibrancy`, `NSVisualEffectMaterial::Sidebar`).
   - **Linux** → nothing native. The frontend tags `<html>` with an `os-linux` class and CSS swaps the translucent chrome surfaces for an **opaque** background, so the window never shows the desktop through unmaterialised chrome.

   The `window-vibrancy` dependency is gated to `cfg(any(windows, macos))` so Linux never compiles or links it.

2. **macOS file-open is handled via `RunEvent::Opened`.** Switch the builder from `.run(context)` to `.build(context)?.run(|app, event| …)` and, under `cfg(target_os = "macos")`, translate opened file URLs into the existing flow: stash the path in `LaunchFile` (so a cold start is picked up by the frontend's `take_launch_file` on mount) **and** emit `open-file` (so an already-running instance opens it immediately). The Windows/Linux argv path in `file_from_args` is untouched.

**Considered options.**
- **Keep `windowEffects: ["mica"]` in config and rely on Tauri ignoring it off-Windows** — fewer code changes, but leaves an invalid effect requested on macOS and makes the per-OS intent implicit. Rejected for explicitness; applying materials in code makes each platform's choice obvious and testable.
- **Define the window programmatically with a per-OS `transparent` flag** (opaque window on Linux instead of CSS) — the most "correct" Linux fix, but it moves the whole window definition out of `tauri.conf.json` into Rust, duplicating config and risking Windows drift. Rejected in favour of the lower-risk CSS opacity fallback, which keeps the Windows window definition exactly as-is.
- **Polling argv on macOS / a custom URL scheme** instead of `RunEvent::Opened` — non-idiomatic and racy; `RunEvent::Opened` is the supported mechanism.

**Consequences.**
- Adds the `window-vibrancy` crate on Windows/macOS only.
- The window material is now established in `setup` rather than at window creation; a failure to apply it is logged-and-ignored (`let _ =`) rather than fatal — a missing material should never prevent the app from starting.
- This ADR **supersedes ADR-0001's "Windows desktop" framing**: Parchmint is now cross-platform, with Windows as the verified baseline and macOS/Linux behaviour confirmed via CI builds (the maintainer's environment cannot compile or render the macOS/Linux paths). The `NSVisualEffectMaterial` choice and the Linux opaque palette are the two items that still need on-device tuning.
