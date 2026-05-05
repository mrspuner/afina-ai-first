"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { ParsedTriggerCommand } from "@/lib/trigger-edit-parser";

export interface TriggerEditApi {
  /** Применить распарсенную команду к delta триггера. */
  applyToTrigger: (
    triggerId: string,
    parsed: Exclude<ParsedTriggerCommand, { kind: "fallback" }>
  ) => void;
  /** Кратковременно подсветить карточку триггера. */
  highlightTrigger: (triggerId: string) => void;
  /** Проиграть «лёгкий запрос» — рандомизировать selection и deltas. */
  randomRemix: () => void;
  /** Найти triggerId по label — нужно баром, чтобы из чипсины (label) получить id. */
  resolveTriggerIdByLabel: (label: string) => string | null;
}

export const NOOP_TRIGGER_EDIT_API: TriggerEditApi = {
  applyToTrigger: () => {},
  highlightTrigger: () => {},
  randomRemix: () => {},
  resolveTriggerIdByLabel: () => null,
};

const Ctx = createContext<TriggerEditApi>(NOOP_TRIGGER_EDIT_API);

export function TriggerEditProvider({
  value,
  children,
}: {
  value: TriggerEditApi;
  children: ReactNode;
}) {
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useTriggerEdit(): TriggerEditApi {
  return useContext(Ctx);
}
