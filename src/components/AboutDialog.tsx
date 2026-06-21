import { useEffect, useState } from "react";
import { getVersion } from "@tauri-apps/api/app";
import { openUrl } from "@tauri-apps/plugin-opener";
import iconUrl from "../assets/icon.png";

const WEBSITE = "https://parchmint.app";
const REPO = "https://github.com/MazherUddin/parchmint";
const LICENSE = "https://github.com/MazherUddin/parchmint/blob/main/LICENSE";

interface AboutDialogProps {
  onClose: () => void;
}

/**
 * "About Parchmint" overlay. Mirrors the ShortcutsHelp modal pattern (shared
 * .help-overlay / .help-dialog frame) and owns Escape while open so closing it
 * never also drops the user out of zen mode. Version is read at runtime via
 * Tauri's getVersion() so it always matches the shipped build. Links open in
 * the system browser through the opener plugin.
 */
export function AboutDialog({ onClose }: AboutDialogProps) {
  const [version, setVersion] = useState<string | null>(null);

  useEffect(() => {
    getVersion()
      .then(setVersion)
      .catch(() => setVersion(null));
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
    };
    // Capture phase so this wins over the global zen Escape handler.
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [onClose]);

  const open = (url: string) => () => void openUrl(url);

  return (
    <div className="help-overlay" onClick={onClose}>
      <div className="help-dialog about-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="help-header">
          <span className="help-title">About Parchmint</span>
          <button className="tab-close" title="Close" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="about-body">
          <img className="about-icon" src={iconUrl} alt="Parchmint" width={72} height={72} />
          <div className="about-name">Parchmint</div>
          <div className="about-tagline">A Markdown editor for AI-consumed documents</div>
          <div className="about-version">{version ? `Version ${version}` : " "}</div>
          <div className="about-author">Created by Abu Mazher Uddin</div>
          <div className="about-links">
            <button className="about-link" onClick={open(WEBSITE)}>
              Website
            </button>
            <span className="about-sep">·</span>
            <button className="about-link" onClick={open(REPO)}>
              GitHub
            </button>
            <span className="about-sep">·</span>
            <button className="about-link" onClick={open(LICENSE)}>
              License (MIT)
            </button>
          </div>
        </div>
        <div className="help-foot about-foot">© 2026 Abu Mazher Uddin</div>
      </div>
    </div>
  );
}
