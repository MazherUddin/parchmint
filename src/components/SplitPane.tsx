import { useRef, useState } from "react";
import type { MouseEvent as ReactMouseEvent, ReactNode } from "react";

interface SplitPaneProps {
  left: ReactNode;
  right: ReactNode;
}

export function SplitPane({ left, right }: SplitPaneProps) {
  const [ratio, setRatio] = useState(0.5);
  const containerRef = useRef<HTMLDivElement>(null);

  const startDrag = (e: ReactMouseEvent) => {
    e.preventDefault();
    const onMove = (ev: MouseEvent) => {
      const el = containerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      let r = (ev.clientX - rect.left) / rect.width;
      r = Math.min(0.85, Math.max(0.15, r));
      setRatio(r);
    };
    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      document.body.classList.remove("dragging-col");
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    document.body.classList.add("dragging-col");
  };

  return (
    <div className="split" ref={containerRef}>
      <div className="split-left" style={{ width: `${ratio * 100}%` }}>
        {left}
      </div>
      <div className="split-divider" onMouseDown={startDrag} />
      <div className="split-right">{right}</div>
    </div>
  );
}
