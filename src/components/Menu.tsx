import { useState } from "react";

export interface MenuItem {
  label: string;
  onClick: () => void;
}

interface MenuProps {
  label: string;
  items: MenuItem[];
}

export function Menu({ label, items }: MenuProps) {
  const [open, setOpen] = useState(false);
  return (
    <div className="menu">
      <button onClick={() => setOpen((o) => !o)}>{label}</button>
      {open && (
        <>
          <div className="menu-backdrop" onClick={() => setOpen(false)} />
          <div className="menu-list">
            {items.map((it, i) => (
              <button
                key={i}
                onClick={() => {
                  it.onClick();
                  setOpen(false);
                }}
              >
                {it.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
