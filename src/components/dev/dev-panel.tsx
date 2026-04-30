"use client";

import { useEffect, useState } from "react";
import { useAppState, useAppDispatch } from "@/state/app-state-context";
import { PRESETS, type PresetKey } from "@/state/presets";
import { BUSINESS_DIRECTIONS } from "@/data/business-directions";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { useDevHotkey } from "./use-dev-hotkey";
import {
  PROCESSING_PRESETS,
  getProcessingDuration,
  setProcessingDuration,
} from "@/state/dev-config";

const STORAGE_KEY = "afina.dev.preset";
const DIRECTION_KEY = "afina.dev.direction";
const KEYS: PresetKey[] = ["empty", "mid", "full"];

export function DevPanel() {
  const [open, setOpen] = useState(false);
  const [activeKey, setActiveKey] = useState<PresetKey>("empty");
  const [processingMs, setProcessingMs] = useState<number>(6000);
  const { signals, campaigns, clientDirection, balance, surveyStatus } =
    useAppState();
  const dispatch = useAppDispatch();

  const surveyCompleted = surveyStatus === "completed";

  // Hydration-safe: read localStorage after mount. setActiveKey + dispatch
  // below is a one-time initialization cascade, not the render loop the lint
  // rule usually catches.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved === "empty" || saved === "mid" || saved === "full") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setActiveKey(saved);
      dispatch({ type: "preset_applied", preset: PRESETS[saved] });
    }
    const savedDirection = window.localStorage.getItem(DIRECTION_KEY);
    if (
      savedDirection &&
      BUSINESS_DIRECTIONS.some((d) => d.id === savedDirection)
    ) {
      dispatch({ type: "client_direction_set", direction: savedDirection });
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setProcessingMs(getProcessingDuration());
  }, [dispatch]);

  // Mirror clientDirection → localStorage so survey completion (which writes
  // clientDirection from inside the reducer) persists across reloads, just
  // like manual selection in this panel.
  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(DIRECTION_KEY, clientDirection);
  }, [clientDirection]);

  useDevHotkey(() => setOpen((o) => !o));

  function apply(key: PresetKey) {
    window.localStorage.setItem(STORAGE_KEY, key);
    setActiveKey(key);
    dispatch({ type: "preset_applied", preset: PRESETS[key] });
  }

  function applyDirection(id: string) {
    dispatch({ type: "client_direction_set", direction: id });
  }

  function clear() {
    window.localStorage.removeItem(STORAGE_KEY);
    setActiveKey("empty");
    dispatch({ type: "preset_applied", preset: PRESETS.empty });
    // survey_reset already restores clientDirection to DEFAULT, and the
    // clientDirection→localStorage mirror effect persists it.
    dispatch({ type: "survey_reset" });
  }

  function applyProcessingMs(ms: number) {
    setProcessingDuration(ms);
    setProcessingMs(ms);
  }

  function setSurveyCompleted(checked: boolean) {
    if (checked) {
      dispatch({ type: "dev_survey_force_complete" });
    } else {
      dispatch({ type: "survey_reset" });
    }
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

      <div className="mt-3 flex items-center justify-between border-t border-[#1f1f1f] pt-3">
        <div className="flex flex-col gap-0.5">
          <div className="text-[10px] font-semibold uppercase tracking-[0.04em] text-[#888]">
            Анкета заполнена
          </div>
          <div className="text-[11px] text-[#666]">
            {surveyCompleted
              ? "форма не показывается"
              : "форма обязательна перед сигналом"}
          </div>
        </div>
        <Switch
          checked={surveyCompleted}
          onCheckedChange={setSurveyCompleted}
          aria-label="Переключить статус анкеты"
        />
      </div>

      <div className="mt-3 border-t border-[#1f1f1f] pt-3">
        <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.04em] text-[#888]">
          Направление клиента
        </div>
        <select
          value={clientDirection}
          onChange={(e) => applyDirection(e.target.value)}
          disabled={!surveyCompleted}
          aria-describedby={
            surveyCompleted ? undefined : "dev-direction-disabled-hint"
          }
          className="w-full rounded-md border border-[#2a2a2a] bg-[#1e1e1e] px-2 py-1.5 text-[12px] text-[#e5e5e5] outline-none transition-colors hover:bg-[#242424] focus:border-[#4ade80] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-[#1e1e1e]"
        >
          {BUSINESS_DIRECTIONS.map((d) => (
            <option key={d.id} value={d.id}>
              {d.label}
            </option>
          ))}
        </select>
        {!surveyCompleted ? (
          <p
            id="dev-direction-disabled-hint"
            className="mt-1.5 text-[10px] leading-tight text-[#666]"
          >
            Включите «анкета заполнена», чтобы выбрать направление.
          </p>
        ) : null}
      </div>

      <div className="mt-3 border-t border-[#1f1f1f] pt-3">
        <div className="mb-2 flex items-center justify-between">
          <div className="text-[10px] font-semibold uppercase tracking-[0.04em] text-[#888]">
            Баланс
          </div>
          <span className="tabular-nums text-[12px] text-[#e5e5e5]">
            ₽ {balance.toLocaleString("ru-RU", { maximumFractionDigits: 2 })}
          </span>
        </div>
        <div className="flex gap-1.5">
          <button
            type="button"
            onClick={() => dispatch({ type: "balance_topup", amount: 1000 })}
            className="flex-1 rounded-md border border-[#2a2a2a] bg-[#1e1e1e] px-2 py-1.5 text-[11px] transition-colors hover:bg-[#242424]"
          >
            + ₽ 1 000
          </button>
          <button
            type="button"
            onClick={() => dispatch({ type: "balance_topup", amount: 10000 })}
            className="flex-1 rounded-md border border-[#2a2a2a] bg-[#1e1e1e] px-2 py-1.5 text-[11px] transition-colors hover:bg-[#242424]"
          >
            + ₽ 10 000
          </button>
        </div>
      </div>

      <div className="mt-3 border-t border-[#1f1f1f] pt-3">
        <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.04em] text-[#888]">
          Сигнал — длительность поиска
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          {PROCESSING_PRESETS.map((preset) => {
            const isActive = processingMs === preset.value;
            return (
              <button
                key={preset.label}
                type="button"
                onClick={() => applyProcessingMs(preset.value)}
                className={cn(
                  "rounded-md border px-2 py-1.5 text-[11px] transition-colors",
                  isActive
                    ? "border-[#4ade80] bg-[#1a2e1f] text-[#4ade80]"
                    : "border-[#2a2a2a] bg-[#1e1e1e] hover:bg-[#242424]"
                )}
              >
                {preset.label}
              </button>
            );
          })}
        </div>
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
