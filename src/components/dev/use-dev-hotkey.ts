"use client";

import { useEffect } from "react";

export function useDevHotkey(toggle: () => void) {
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (!e.shiftKey || e.key.toLowerCase() !== "t") return;
      // Suppress when focus is inside a text input — user is typing capital T.
      const active = document.activeElement as HTMLElement | null;
      const tag = active?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (active?.isContentEditable) return;
      e.preventDefault();
      toggle();
    }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [toggle]);
}
