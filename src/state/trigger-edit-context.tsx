"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
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

/**
 * Registry-провайдер: api публикуется владельцем (step-2) через
 * useRegisterTriggerEdit, читается потребителями (PromptBar) через
 * useTriggerEdit. Это позволяет step-2 и баром быть siblings в дереве,
 * а не один внутри другого — без подобного registry бар получал бы NOOP.
 */
interface RegistryValue {
  api: TriggerEditApi;
  setApi: (api: TriggerEditApi | null) => void;
}

const RegistryCtx = createContext<RegistryValue>({
  api: NOOP_TRIGGER_EDIT_API,
  setApi: () => {},
});

export function TriggerEditRegistryProvider({ children }: { children: ReactNode }) {
  const [api, setApiState] = useState<TriggerEditApi>(NOOP_TRIGGER_EDIT_API);
  const setApi = useCallback((next: TriggerEditApi | null) => {
    setApiState(next ?? NOOP_TRIGGER_EDIT_API);
  }, []);
  const value = useMemo<RegistryValue>(() => ({ api, setApi }), [api, setApi]);
  return <RegistryCtx.Provider value={value}>{children}</RegistryCtx.Provider>;
}

export function useTriggerEdit(): TriggerEditApi {
  return useContext(RegistryCtx).api;
}

/**
 * Регистрирует api в registry на время mount'a компонента. Передавай api,
 * стабильный между ререндерами (useMemo) — иначе registry будет дёргаться
 * каждый рендер.
 */
export function useRegisterTriggerEdit(api: TriggerEditApi): void {
  const { setApi } = useContext(RegistryCtx);
  useEffect(() => {
    setApi(api);
    return () => setApi(null);
  }, [api, setApi]);
}
