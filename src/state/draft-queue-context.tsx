"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useReducer,
  type ReactNode,
} from "react";
import { nanoid } from "nanoid";
import type { PromptChip } from "./prompt-chips-context";

/**
 * Один непринятый черновик: тег (PromptChip) + написанный к нему текст.
 * Очередь черновиков — общий контракт M5 (парковка), M1 (комментарии = та же
 * очередь) и M6 («Применить все» зависит от непустоты очереди).
 */
export interface Draft {
  id: string;
  chip: PromptChip;
  text: string;
}

export interface DraftQueueState {
  drafts: Draft[];
}

export type DraftQueueAction =
  | { type: "park"; id: string; chip: PromptChip; text: string }
  | { type: "remove"; id: string }
  | { type: "clear" };

/**
 * Pure reducer очереди черновиков.
 * - park: добавляет черновик; дедуп по chip.id (один черновик на тег — спека
 *   M1 «на каждый тег один черновик»). Пустой текст — no-op.
 * - remove: выбрасывает черновик по id.
 * - clear: опустошает очередь (для «Применить все»).
 */
export function draftQueueReducer(
  state: DraftQueueState,
  action: DraftQueueAction
): DraftQueueState {
  switch (action.type) {
    case "park": {
      if (action.text.trim().length === 0) return state;
      const draft: Draft = { id: action.id, chip: action.chip, text: action.text };
      const existingIdx = state.drafts.findIndex(
        (d) => d.chip.id === action.chip.id
      );
      if (existingIdx >= 0) {
        const drafts = state.drafts.slice();
        drafts[existingIdx] = draft;
        return { drafts };
      }
      return { drafts: [...state.drafts, draft] };
    }
    case "remove":
      return { drafts: state.drafts.filter((d) => d.id !== action.id) };
    case "clear":
      return state.drafts.length === 0 ? state : { drafts: [] };
  }
}

export const INITIAL_DRAFT_QUEUE_STATE: DraftQueueState = { drafts: [] };

interface DraftQueueApi {
  drafts: readonly Draft[];
  /** Паркует тег + текст в очередь. Возвращает id черновика. */
  parkDraft: (chip: PromptChip, text: string) => string;
  /** Удаляет черновик по id (✕ на карточке). */
  removeDraft: (id: string) => void;
  /** Достаёт черновик из очереди (клик по карточке → возврат в инпут). */
  takeDraft: (id: string) => Draft | null;
  /** Очищает всю очередь (после «Применить все»). */
  clearQueue: () => void;
}

const Ctx = createContext<DraftQueueApi | null>(null);

export function DraftQueueProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(draftQueueReducer, INITIAL_DRAFT_QUEUE_STATE);

  const parkDraft = useCallback((chip: PromptChip, text: string): string => {
    const id = `draft_${nanoid(6)}`;
    dispatch({ type: "park", id, chip, text });
    return id;
  }, []);

  const removeDraft = useCallback((id: string) => {
    dispatch({ type: "remove", id });
  }, []);

  // takeDraft читает текущий state через ref-замыкание над reducer state —
  // безопасно, т.к. вызывается только из обработчиков событий (не в render).
  const draftsRef = state.drafts;
  const takeDraft = useCallback(
    (id: string): Draft | null => {
      const found = draftsRef.find((d) => d.id === id) ?? null;
      if (found) dispatch({ type: "remove", id });
      return found;
    },
    [draftsRef]
  );

  const clearQueue = useCallback(() => dispatch({ type: "clear" }), []);

  const api = useMemo<DraftQueueApi>(
    () => ({ drafts: state.drafts, parkDraft, removeDraft, takeDraft, clearQueue }),
    [state.drafts, parkDraft, removeDraft, takeDraft, clearQueue]
  );

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

export function useDraftQueue(): DraftQueueApi {
  const ctx = useContext(Ctx);
  if (!ctx) {
    throw new Error("useDraftQueue must be used within <DraftQueueProvider>.");
  }
  return ctx;
}
