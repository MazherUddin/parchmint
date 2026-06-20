import { useEffect, useRef, useState } from "react";

interface PreviewPaneProps {
  html: string;
  // Called when a task-list checkbox is toggled in the preview. `line` is the
  // 0-based source line stamped by markdown.ts (data-task-line); `checked` is the
  // checkbox's new state.
  onToggleTask?: (line: number, checked: boolean) => void;
  // Called from the right-click "Edit here" menu. `line` is the 1-based source
  // line of the clicked block (data-edit-line).
  onEditAt?: (line: number) => void;
}

interface MenuState {
  x: number;
  y: number;
  line: number;
}

export function PreviewPane({ html, onToggleTask, onEditAt }: PreviewPaneProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [menu, setMenu] = useState<MenuState | null>(null);

  // Delegate change events from the injected HTML rather than using React's
  // onChange — the checkboxes live inside dangerouslySetInnerHTML, outside React's
  // managed tree, so a plain DOM listener on the container is the reliable hook.
  useEffect(() => {
    const el = ref.current;
    if (!el || !onToggleTask) return;
    const handler = (e: Event) => {
      const t = e.target;
      if (!(t instanceof HTMLInputElement) || t.type !== "checkbox") return;
      const attr = t.dataset.taskLine;
      if (attr === undefined) return;
      const line = Number(attr);
      if (Number.isInteger(line)) onToggleTask(line, t.checked);
    };
    el.addEventListener("change", handler);
    return () => el.removeEventListener("change", handler);
  }, [onToggleTask]);

  // Dismiss the menu on any outside interaction or scroll.
  useEffect(() => {
    if (!menu) return;
    const close = () => setMenu(null);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMenu(null);
    window.addEventListener("mousedown", close);
    window.addEventListener("scroll", close, true);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", close);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("keydown", onKey);
    };
  }, [menu]);

  const onContextMenu = (e: React.MouseEvent) => {
    if (!onEditAt) return;
    const block = (e.target as HTMLElement).closest<HTMLElement>("[data-edit-line]");
    if (!block) return; // no mapping here — let the native menu through
    const line = Number(block.getAttribute("data-edit-line"));
    if (!Number.isInteger(line)) return;
    e.preventDefault();
    setMenu({ x: e.clientX, y: e.clientY, line });
  };

  return (
    <>
      <div
        ref={ref}
        className="preview markdown-body"
        dangerouslySetInnerHTML={{ __html: html }}
        onContextMenu={onContextMenu}
      />
      {menu && (
        <div className="preview-context-menu" style={{ left: menu.x, top: menu.y }}>
          <button
            type="button"
            // mousedown closes the menu; commit the edit on mousedown too so the
            // window listener doesn't swallow it before a click lands.
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onEditAt?.(menu.line);
              setMenu(null);
            }}
          >
            Edit here
          </button>
        </div>
      )}
    </>
  );
}
