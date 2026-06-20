export type ConflictKind = "none" | "changed" | "deleted";

interface ConflictBannerProps {
  conflict: ConflictKind;
  onReload: () => void;
  onKeepMine: () => void;
  onCompare: () => void;
  onRecreate: () => void;
  onClose: () => void;
}

/**
 * Non-blocking strip shown above the editor when the active document diverged
 * from disk. "changed" offers Reload / Keep mine / Compare; "deleted" offers
 * Save-to-recreate / Close. Renders nothing when there is no conflict.
 */
export function ConflictBanner({
  conflict,
  onReload,
  onKeepMine,
  onCompare,
  onRecreate,
  onClose,
}: ConflictBannerProps) {
  if (conflict === "none") return null;

  if (conflict === "deleted") {
    return (
      <div className="change-banner change-banner-danger" role="alert">
        <span className="change-banner-text">This file was deleted on disk.</span>
        <div className="change-banner-actions">
          <button onClick={onRecreate}>Save to recreate</button>
          <button onClick={onClose}>Close</button>
        </div>
      </div>
    );
  }

  return (
    <div className="change-banner" role="alert">
      <span className="change-banner-text">This file changed on disk.</span>
      <div className="change-banner-actions">
        <button onClick={onReload}>Reload</button>
        <button onClick={onKeepMine}>Keep mine</button>
        <button onClick={onCompare}>Compare</button>
      </div>
    </div>
  );
}
