"use client";

import { useEffect, useState } from "react";

export function ShortcutHelp() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "?" && !["INPUT", "TEXTAREA", "SELECT"].includes((event.target as HTMLElement).tagName)) setOpen(true);
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);
  return open ? (
    <div role="dialog" aria-modal="true" aria-label="Keyboard shortcuts" className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-6">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between"><h2 className="text-lg font-semibold">Keyboard shortcuts</h2><button onClick={() => setOpen(false)} aria-label="Close shortcuts">×</button></div>
        <dl className="mt-4 space-y-3 text-sm"><div className="flex justify-between"><dt>Show shortcuts</dt><dd className="font-mono">?</dd></div><div className="flex justify-between"><dt>Close dialog</dt><dd className="font-mono">Esc</dd></div><div className="flex justify-between"><dt>Save edits</dt><dd className="font-mono">⌘/Ctrl + S</dd></div></dl>
      </div>
    </div>
  ) : null;
}
