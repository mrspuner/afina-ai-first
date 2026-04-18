"use client";

import { useEffect, useState } from "react";
import { useAppState, useAppDispatch } from "@/state/app-state-context";
import { PRESETS, type PresetKey } from "@/state/presets";
import { cn } from "@/lib/utils";
import { useDevHotkey } from "./use-dev-hotkey";

const STORAGE_KEY = "afina.dev.preset";
const KEYS: PresetKey[] = ["empty", "mid", "full"];

export function DevPanel() {
  const [open, setOpen] = useState(false);
  const [activeKey, setActiveKey] = useState<PresetKey>("empty");
  const { signals, campaigns } = useAppState();
  const dispatch = useAppDispatch();

  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved === "empty" || saved === "mid" || saved === "full") {
      setActiveKey(saved);
      dispatch({ type: "preset_applied", preset: PRESETS[saved] });
    }
  }, [dispatch]);

  useDevHotkey(() => setOpen((o) => !o));

  function apply(key: PresetKey) {
    window.localStorage.setItem(STORAGE_KEY, key);
    setActiveKey(key);
    dispatch({ type: "preset_applied", preset: PRESETS[key] });
  }

  function clear() {
    window.localStorage.removeItem(STORAGE_KEY);
    setActiveKey("empty");
    dispatch({ type: "preset_applied", preset: PRESETS.empty });
  }

  if (!open) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 w-[260px] rounded-[10px] border border-[#2a2a2a] bg-[#161616] p-[14px] shadow-[0_8px_24px_rgba(0,0,0,0.5)] text-[#e5e5e5]">
      <div className="mb-3 flex items-center justify-between">
        <div className="text-[11px] font-semibold uppercase tracking-[0.04em] text-[#888]">
          Dev · состояние
        </div>
        <button
          type="button"
          aria-label="Закрыть дев-панель"
          onClick={() => setOpen(false)}
          className="text-[14px] leading-none text-[#666] transition-colors hover:text-[#aaa]"
        >
          ×
        </button>
      </div>

      <div className="flex flex-col gap-1.5">
        {KEYS.map((key) => {
          const preset = PRESETS[key];
          const isActive = activeKey === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => apply(key)}
              className={cn(
                "flex items-center justify-between rounded-md border px-3 py-2.5 text-left text-[13px] transition-colors",
                isActive
                  ? "border-[#4ade80] bg-[#1a2e1f]"
                  : "border-[#2a2a2a] bg-[#1e1e1e] hover:bg-[#242424]"
              )}
            >
              <span>{preset.label}</span>
              <span
                className={cn(
                  "text-[11px]",
                  isActive ? "text-[#4ade80]" : "text-[#666]"
                )}
              >
                {preset.signals.length} · {preset.campaigns.length}
                {isActive ? " ✓" : ""}
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-3 flex items-center justify-between border-t border-[#1f1f1f] pt-2.5">
        <span className="text-[10px] text-[#555]">
          signals: {signals.length} · campaigns: {campaigns.length}
        </span>
        <button
          type="button"
          aria-label="Сбросить сохранённый пресет и вернуться в empty"
          onClick={clear}
          className="text-[11px] text-[#888] transition-colors hover:text-[#aaa]"
        >
          очистить ↻
        </button>
      </div>
    </div>
  );
}
