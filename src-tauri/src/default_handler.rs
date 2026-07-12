//! Default-Markdown-editor registration and detection.
//!
//! The installer only registers Parchmint as a *capable* handler (and Tauri's
//! NSIS template does even that incompletely — no Capabilities/RegisteredApplications,
//! and updates can leave the ProgId dangling). This module lets the running app
//! repair its own registration and answer "am I the default for .md?", with the
//! actual default switch following each platform's rules:
//!
//! - Windows: defaults are user-choice protected, so `make_default` (re)registers
//!   the ProgId + Capabilities in HKCU and opens the Settings default-apps page.
//! - macOS: LaunchServices allows setting the default directly.
//! - Linux: `xdg-mime default` sets it directly, but only works when our
//!   .desktop file is installed (deb/rpm — not a bare AppImage).

/// Where Parchmint stands as the .md handler.
/// `unavailable` = becoming default is not possible here (bare AppImage).
#[tauri::command]
pub fn default_handler_status() -> &'static str {
    platform::status()
}

/// Try to become the default Markdown editor. Returns `"set"` when the default
/// was switched directly (macOS/Linux) or `"settings_opened"` when the user
/// must finish the switch in Windows Settings.
#[tauri::command]
pub fn make_default_md_handler(app: tauri::AppHandle) -> Result<&'static str, String> {
    platform::make_default(&app)
}

/// Silently (re)register Parchmint as a capable .md handler where that is a
/// separate step from becoming default (Windows). Idempotent; called on startup
/// so "Open with" keeps working even when an installer update wipes the ProgId.
pub fn ensure_registered(app: &tauri::AppHandle) {
    platform::ensure_registered(app);
}

#[cfg(target_os = "windows")]
mod platform {
    use winreg::enums::HKEY_CURRENT_USER;
    use winreg::RegKey;

    /// ProgId written by both the NSIS installer (fileAssociations `name`) and
    /// this module — keep the two in sync (see tauri.conf.json).
    const PROGID: &str = "Parchmint.md";
    const EXTENSIONS: [&str; 2] = [".md", ".markdown"];

    #[link(name = "shell32")]
    extern "system" {
        fn SHChangeNotify(
            w_event_id: i32,
            u_flags: u32,
            item1: *const core::ffi::c_void,
            item2: *const core::ffi::c_void,
        );
    }

    /// Tell the shell associations changed so Open With / Default Apps refresh.
    fn notify_assoc_changed() {
        const SHCNE_ASSOCCHANGED: i32 = 0x0800_0000;
        const SHCNF_IDLIST: u32 = 0;
        unsafe { SHChangeNotify(SHCNE_ASSOCCHANGED, SHCNF_IDLIST, std::ptr::null(), std::ptr::null()) };
    }

    fn register(exe: &str) -> std::io::Result<()> {
        let hkcu = RegKey::predef(HKEY_CURRENT_USER);

        // ProgId: what a .md document *is* when opened by Parchmint.
        let (progid, _) = hkcu.create_subkey(format!(r"Software\Classes\{PROGID}"))?;
        progid.set_value("", &"Markdown Document")?;
        let (icon, _) = progid.create_subkey("DefaultIcon")?;
        icon.set_value("", &format!("\"{exe}\",0"))?;
        let (cmd, _) = progid.create_subkey(r"shell\open\command")?;
        cmd.set_value("", &format!("\"{exe}\" \"%1\""))?;

        // Make Parchmint show up in the Open With list for both extensions.
        for ext in EXTENSIONS {
            let (openwith, _) =
                hkcu.create_subkey(format!(r"Software\Classes\{ext}\OpenWithProgids"))?;
            openwith.set_value(PROGID, &"")?;
        }

        // Capabilities + RegisteredApplications: required for Parchmint to be
        // listed in Settings → Default apps (the NSIS installer never does this).
        let (caps, _) = hkcu.create_subkey(r"Software\Parchmint\Capabilities")?;
        caps.set_value("ApplicationName", &"Parchmint")?;
        caps.set_value(
            "ApplicationDescription",
            &"Markdown editor for AI-consumed documents",
        )?;
        let (assoc, _) = caps.create_subkey("FileAssociations")?;
        for ext in EXTENSIONS {
            assoc.set_value(ext, &PROGID)?;
        }
        let (registered, _) = hkcu.create_subkey(r"Software\RegisteredApplications")?;
        registered.set_value("Parchmint", &r"Software\Parchmint\Capabilities")?;

        notify_assoc_changed();
        Ok(())
    }

    fn current_exe() -> Result<String, String> {
        std::env::current_exe()
            .map(|p| p.to_string_lossy().to_string())
            .map_err(|e| e.to_string())
    }

    pub fn status() -> &'static str {
        // Since Windows 8 Explorer only honours UserChoice — the classic HKCR
        // default alone just makes Explorer show the "Pick an app" dialog — so
        // UserChoice is the sole signal for "we are the default".
        let user_choice: Result<String, _> = RegKey::predef(HKEY_CURRENT_USER)
            .open_subkey(r"Software\Microsoft\Windows\CurrentVersion\Explorer\FileExts\.md\UserChoice")
            .and_then(|k| k.get_value("ProgId"));
        match user_choice {
            Ok(p) if p == PROGID => "default",
            _ => "not_default",
        }
    }

    pub fn make_default(app: &tauri::AppHandle) -> Result<&'static str, String> {
        register(&current_exe()?).map_err(|e| e.to_string())?;
        // UserChoice cannot be written by apps (it is hash-protected); deep-link
        // to the Default Apps page for Parchmint (falls back to the general page
        // on Win10, which ignores the registeredAppUser parameter).
        tauri_plugin_opener::open_url(
            "ms-settings:defaultapps?registeredAppUser=Parchmint",
            None::<&str>,
        )
        .map_err(|e| e.to_string())?;
        let _ = app;
        Ok("settings_opened")
    }

    pub fn ensure_registered(_app: &tauri::AppHandle) {
        // Skip dev builds: registering target/debug/parchmint.exe as a handler
        // would hijack Open With on the dev machine.
        if cfg!(debug_assertions) {
            return;
        }
        if let Ok(exe) = current_exe() {
            let _ = register(&exe);
        }
    }
}

#[cfg(target_os = "macos")]
mod platform {
    use core_foundation::base::TCFType;
    use core_foundation::string::{CFString, CFStringRef};

    /// The UTI macOS binds to the .md/.markdown extensions.
    const MARKDOWN_UTI: &str = "net.daringfireball.markdown";
    const K_LS_ROLES_ALL: u32 = 0xFFFF_FFFF;

    #[link(name = "CoreServices", kind = "framework")]
    extern "C" {
        fn LSCopyDefaultRoleHandlerForContentType(
            content_type: CFStringRef,
            role: u32,
        ) -> CFStringRef;
        fn LSSetDefaultRoleHandlerForContentType(
            content_type: CFStringRef,
            role: u32,
            handler_bundle_id: CFStringRef,
        ) -> i32;
    }

    pub fn status() -> &'static str {
        let uti = CFString::new(MARKDOWN_UTI);
        let handler =
            unsafe { LSCopyDefaultRoleHandlerForContentType(uti.as_concrete_TypeRef(), K_LS_ROLES_ALL) };
        if handler.is_null() {
            return "not_default";
        }
        let handler = unsafe { CFString::wrap_under_create_rule(handler) };
        if handler.to_string().eq_ignore_ascii_case("com.mazher.parchmint") {
            "default"
        } else {
            "not_default"
        }
    }

    pub fn make_default(app: &tauri::AppHandle) -> Result<&'static str, String> {
        let uti = CFString::new(MARKDOWN_UTI);
        let bundle_id = CFString::new(&app.config().identifier);
        let rc = unsafe {
            LSSetDefaultRoleHandlerForContentType(
                uti.as_concrete_TypeRef(),
                K_LS_ROLES_ALL,
                bundle_id.as_concrete_TypeRef(),
            )
        };
        if rc == 0 {
            Ok("set")
        } else {
            Err(format!("LSSetDefaultRoleHandlerForContentType failed: {rc}"))
        }
    }

    pub fn ensure_registered(_app: &tauri::AppHandle) {
        // LaunchServices registers the bundle automatically on first launch.
    }
}

#[cfg(target_os = "linux")]
mod platform {
    use std::path::PathBuf;
    use std::process::Command;

    const MIME_TYPES: [&str; 2] = ["text/markdown", "text/x-markdown"];

    /// Find our installed .desktop file (deb/rpm ship one; a bare AppImage does
    /// not, in which case xdg-mime default would point at nothing).
    fn desktop_file() -> Option<String> {
        let mut dirs: Vec<PathBuf> = Vec::new();
        if let Some(home) = std::env::var_os("XDG_DATA_HOME") {
            dirs.push(PathBuf::from(home));
        } else if let Some(home) = std::env::var_os("HOME") {
            dirs.push(PathBuf::from(home).join(".local/share"));
        }
        let system = std::env::var("XDG_DATA_DIRS")
            .unwrap_or_else(|_| "/usr/local/share:/usr/share".into());
        dirs.extend(system.split(':').filter(|s| !s.is_empty()).map(PathBuf::from));

        for name in ["Parchmint.desktop", "parchmint.desktop"] {
            if dirs.iter().any(|d| d.join("applications").join(name).is_file()) {
                return Some(name.to_string());
            }
        }
        None
    }

    pub fn status() -> &'static str {
        let Some(desktop) = desktop_file() else {
            return "unavailable";
        };
        let current = Command::new("xdg-mime")
            .args(["query", "default", "text/markdown"])
            .output()
            .ok()
            .map(|o| String::from_utf8_lossy(&o.stdout).trim().to_string());
        match current {
            Some(c) if c == desktop => "default",
            _ => "not_default",
        }
    }

    pub fn make_default(_app: &tauri::AppHandle) -> Result<&'static str, String> {
        let desktop = desktop_file().ok_or_else(|| {
            "no .desktop file installed (AppImages are not desktop-integrated)".to_string()
        })?;
        let out = Command::new("xdg-mime")
            .arg("default")
            .arg(&desktop)
            .args(MIME_TYPES)
            .output()
            .map_err(|e| e.to_string())?;
        if out.status.success() {
            Ok("set")
        } else {
            Err(String::from_utf8_lossy(&out.stderr).trim().to_string())
        }
    }

    pub fn ensure_registered(_app: &tauri::AppHandle) {
        // The .desktop file's MimeType entry already registers us as a handler.
    }
}
