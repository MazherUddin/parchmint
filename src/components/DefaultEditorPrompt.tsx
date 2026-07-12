import { useEffect, useState } from "react";
import { makeDefaultMdHandler, type DefaultHandlerStatus } from "../lib/api";

interface DefaultEditorPromptProps {
  /** Handler status at the moment the card was opened. */
  status: DefaultHandlerStatus;
  onClose: () => void;
}

type Stage = "ask" | "settings" | "done" | "already" | "unavailable" | "error";

/**
 * One-time "Make Parchmint your default Markdown editor?" card. Shown
 * automatically on first launch (when not default) and on demand from the
 * command palette. On macOS/Linux accepting switches the default directly; on
 * Windows it opens the Settings default-apps page and explains the last click,
 * since Windows does not let apps set the default themselves.
 */
export function DefaultEditorPrompt({ status, onClose }: DefaultEditorPromptProps) {
  const [stage, setStage] = useState<Stage>(
    status === "default" ? "already" : status === "unavailable" ? "unavailable" : "ask",
  );
  const [error, setError] = useState("");

  // Success confirmation lingers briefly, then the card dismisses itself.
  useEffect(() => {
    if (stage !== "done") return;
    const id = setTimeout(onClose, 2500);
    return () => clearTimeout(id);
  }, [stage, onClose]);

  const accept = async () => {
    try {
      const result = await makeDefaultMdHandler();
      setStage(result === "set" ? "done" : "settings");
    } catch (e) {
      setError(String(e));
      setStage("error");
    }
  };

  return (
    <div className="default-prompt" role="dialog" aria-label="Default Markdown editor">
      {stage === "ask" && (
        <>
          <div className="default-prompt-title">Open Markdown files with Parchmint?</div>
          <div className="default-prompt-body">
            Double-clicking .md and .markdown files will open them here.
          </div>
          <div className="default-prompt-actions">
            <button className="default-prompt-primary" onClick={() => void accept()}>
              Make default
            </button>
            <button onClick={onClose}>Not now</button>
          </div>
        </>
      )}
      {stage === "settings" && (
        <>
          <div className="default-prompt-title">One more step in Settings</div>
          <div className="default-prompt-body">
            Windows asks you to confirm: in the Settings page that just opened, find{" "}
            <strong>.md</strong> and choose <strong>Parchmint</strong>.
          </div>
          <div className="default-prompt-actions">
            <button className="default-prompt-primary" onClick={onClose}>
              Done
            </button>
          </div>
        </>
      )}
      {stage === "done" && <div className="default-prompt-title">Parchmint is now your default Markdown editor.</div>}
      {stage === "already" && (
        <>
          <div className="default-prompt-title">Parchmint is already your default Markdown editor.</div>
          <div className="default-prompt-actions">
            <button className="default-prompt-primary" onClick={onClose}>
              OK
            </button>
          </div>
        </>
      )}
      {stage === "unavailable" && (
        <>
          <div className="default-prompt-title">Not available for AppImage</div>
          <div className="default-prompt-body">
            AppImages are not desktop-integrated, so Parchmint can&apos;t register as the .md
            handler. Install the .deb or .rpm package to use file associations.
          </div>
          <div className="default-prompt-actions">
            <button className="default-prompt-primary" onClick={onClose}>
              OK
            </button>
          </div>
        </>
      )}
      {stage === "error" && (
        <>
          <div className="default-prompt-title">Couldn&apos;t set the default</div>
          <div className="default-prompt-body">{error}</div>
          <div className="default-prompt-actions">
            <button className="default-prompt-primary" onClick={onClose}>
              Close
            </button>
          </div>
        </>
      )}
    </div>
  );
}
