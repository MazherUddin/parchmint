mod default_handler;

use serde::Serialize;
use std::fs;
use std::path::Path;
use std::sync::Mutex;
use std::time::Duration;

use notify_debouncer_mini::{
    new_debouncer,
    notify::{RecommendedWatcher, RecursiveMode},
    DebounceEventResult, Debouncer,
};
use tauri::{AppHandle, Emitter, Manager};

#[derive(Serialize)]
struct MarkdownFile {
    name: String,
    path: String,
}

/// Holds a file path Parchmint was launched with (e.g. from double-clicking an
/// associated `.md` file in Explorer) until the frontend is ready to open it.
#[derive(Default)]
struct LaunchFile(Mutex<Option<String>>);

/// Holds the live filesystem watcher. Replacing the debouncer drops the old one,
/// which stops its watches — so re-registering the watch roots is just a swap.
#[derive(Default)]
struct WatchState(Mutex<Option<Debouncer<RecommendedWatcher>>>);

/// Pick the first CLI argument that points at an existing file — this is how
/// Windows passes a double-clicked associated document to the app.
fn file_from_args<I: IntoIterator<Item = String>>(args: I) -> Option<String> {
    args.into_iter()
        .skip(1) // arg 0 is the executable path
        .find(|arg| !arg.starts_with('-') && Path::new(arg).is_file())
}

/// Read a UTF-8 text file the user has chosen. Paths come from native dialogs,
/// so we use std::fs directly rather than the scoped fs plugin.
#[tauri::command]
fn read_text_file(path: String) -> Result<String, String> {
    fs::read_to_string(&path).map_err(|e| e.to_string())
}

/// Write UTF-8 text to a path the user has chosen.
#[tauri::command]
fn write_text_file(path: String, contents: String) -> Result<(), String> {
    fs::write(&path, contents).map_err(|e| e.to_string())
}

/// Recursively list Markdown files under a workspace folder.
#[tauri::command]
fn list_markdown_files(dir: String) -> Result<Vec<MarkdownFile>, String> {
    let mut files = Vec::new();
    collect_markdown(Path::new(&dir), &mut files).map_err(|e| e.to_string())?;
    files.sort_by(|a, b| a.path.to_lowercase().cmp(&b.path.to_lowercase()));
    Ok(files)
}

fn collect_markdown(dir: &Path, out: &mut Vec<MarkdownFile>) -> std::io::Result<()> {
    for entry in fs::read_dir(dir)? {
        let entry = entry?;
        let path = entry.path();
        let name = entry.file_name().to_string_lossy().to_string();
        if path.is_dir() {
            // Skip hidden and noise directories.
            if name.starts_with('.') || matches!(name.as_str(), "node_modules" | "target" | "dist") {
                continue;
            }
            collect_markdown(&path, out)?;
        } else if let Some(ext) = path.extension() {
            let ext = ext.to_string_lossy().to_lowercase();
            if ext == "md" || ext == "markdown" {
                out.push(MarkdownFile {
                    name,
                    path: path.to_string_lossy().to_string(),
                });
            }
        }
    }
    Ok(())
}

/// Check whether a path (file or folder) still exists on disk. Used to grey out
/// stale Recent Documents / Recent Workspaces entries before the user clicks them.
#[tauri::command]
fn path_exists(path: String) -> bool {
    Path::new(&path).exists()
}

/// Check whether a relative link target resolves to an existing file, relative to
/// the directory of the document that contains it.
#[tauri::command]
fn link_exists(dir: String, target: String) -> bool {
    let cleaned = target
        .split(|c| c == '#' || c == '?')
        .next()
        .unwrap_or("")
        .trim();
    if cleaned.is_empty() {
        return true;
    }
    let decoded = cleaned.replace("%20", " ");
    Path::new(&dir).join(decoded).exists()
}

/// Return the path Parchmint was launched with, if any, clearing it so it is
/// only delivered to the frontend once.
#[tauri::command]
fn take_launch_file(state: tauri::State<'_, LaunchFile>) -> Option<String> {
    state.0.lock().ok().and_then(|mut slot| slot.take())
}

/// (Re)configure the filesystem watcher. `recursive` roots (the workspace) are
/// watched recursively; `flat` roots (parent directories of open documents that
/// live outside the workspace) non-recursively. A debounced `file-changed` event
/// carries the affected paths; the frontend decides how to reconcile each one.
#[tauri::command]
fn set_watch_roots(app: AppHandle, recursive: Vec<String>, flat: Vec<String>) -> Result<(), String> {
    let emitter = app.clone();
    let mut debouncer = new_debouncer(
        Duration::from_millis(200),
        move |res: DebounceEventResult| {
            if let Ok(events) = res {
                let mut paths: Vec<String> = events
                    .into_iter()
                    .map(|e| e.path.to_string_lossy().to_string())
                    .collect();
                paths.sort();
                paths.dedup();
                if !paths.is_empty() {
                    let _ = emitter.emit("file-changed", paths);
                }
            }
        },
    )
    .map_err(|e| e.to_string())?;

    for root in &recursive {
        let p = Path::new(root);
        if p.exists() {
            let _ = debouncer.watcher().watch(p, RecursiveMode::Recursive);
        }
    }
    for root in &flat {
        let p = Path::new(root);
        if p.exists() {
            let _ = debouncer.watcher().watch(p, RecursiveMode::NonRecursive);
        }
    }

    let state = app.state::<WatchState>();
    *state.0.lock().map_err(|e| e.to_string())? = Some(debouncer);
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let mut builder = tauri::Builder::default();

    // Single-instance must be registered first. When an associated file is
    // double-clicked while Parchmint is already running, Windows launches a new
    // process; this callback forwards that file to the live instance and focuses
    // it instead of opening a duplicate window.
    #[cfg(desktop)]
    {
        builder = builder.plugin(tauri_plugin_single_instance::init(|app, argv, _cwd| {
            if let Some(path) = file_from_args(argv) {
                let _ = app.emit("open-file", path);
            }
            if let Some(win) = app.get_webview_window("main") {
                let _ = win.set_focus();
            }
        }));
    }

    builder
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .manage(LaunchFile::default())
        .manage(WatchState::default())
        .setup(|app| {
            // Capture a file passed on the cold-start command line. The frontend
            // pulls it via `take_launch_file` once it has mounted.
            if let Some(path) = file_from_args(std::env::args()) {
                if let Ok(mut slot) = app.state::<LaunchFile>().0.lock() {
                    *slot = Some(path);
                }
            }

            // Repair handler registration (Windows) — installer updates can wipe
            // the ProgId, which silently breaks double-click-to-open.
            default_handler::ensure_registered(app.handle());

            // Per-OS window background material. Windows keeps Mica; macOS gets
            // vibrancy; Linux has no native equivalent and stays opaque (handled
            // in CSS via the os-linux class). transparent:true (in tauri.conf)
            // is required for both Mica and vibrancy.
            #[cfg(any(target_os = "windows", target_os = "macos"))]
            if let Some(win) = app.get_webview_window("main") {
                #[cfg(target_os = "windows")]
                let _ = window_vibrancy::apply_mica(&win, None);
                #[cfg(target_os = "macos")]
                let _ = window_vibrancy::apply_vibrancy(
                    &win,
                    window_vibrancy::NSVisualEffectMaterial::Sidebar,
                    None,
                    None,
                );
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            read_text_file,
            write_text_file,
            list_markdown_files,
            link_exists,
            path_exists,
            take_launch_file,
            set_watch_roots,
            default_handler::default_handler_status,
            default_handler::make_default_md_handler
        ])
        .build(tauri::generate_context!())
        .expect("error while building tauri application")
        .run(|_app, _event| {
            // macOS delivers files opened from Finder (or `open file.md`) as Apple
            // Events, not argv. Mirror the argv path used on Windows/Linux: stash
            // the file for the frontend to pull on mount (cold start) and emit
            // open-file for the already-running case.
            #[cfg(target_os = "macos")]
            if let tauri::RunEvent::Opened { urls } = _event {
                for url in urls {
                    if let Ok(path) = url.to_file_path() {
                        let p = path.to_string_lossy().to_string();
                        if let Ok(mut slot) = _app.state::<LaunchFile>().0.lock() {
                            *slot = Some(p.clone());
                        }
                        let _ = _app.emit("open-file", p);
                    }
                }
            }
        });
}
