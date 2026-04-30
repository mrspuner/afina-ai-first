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

export type PromptChipKind = "trigger" | "mode" | "node";

export interface PromptChip {
  id: string;
  kind: PromptChipKind;
  label: string;
  // Opaque per-kind payload — consumers narrow by kind.
  payload: unknown;
  removable: boolean;
}

export interface PromptChipsState {
  chips: PromptChip[];
}

/**
 * One segment per chip — the chip plus the free text typed *after* it (until
 * the next chip or end of editor). The editor produces these on submit so
 * downstream consumers can apply a different command to each chip.
 */
export interface ChipSegment {
  chip: PromptChip;
  text: string;
}

export type PromptChipsAction =
  | { type: "push"; chip: Omit<PromptChip, "id"> & { id?: string } }
  | { type: "remove"; id: string }
  | { type: "removeLastRemovable" }
  | { type: "clear" };

export function promptChipsReducer(
  state: PromptChipsState,
  action: PromptChipsAction
): PromptChipsState {
  switch (action.type) {
    case "push": {
      const id = action.chip.id ?? `chip_${nanoid(6)}`;
      const next: PromptChip = {
        id,
        kind: action.chip.kind,
        label: action.chip.label,
        payload: action.chip.payload,
        removable: action.chip.removable,
      };
      const existingIdx = state.chips.findIndex((c) => c.id === id);
      if (existingIdx >= 0) {
        const chips = state.chips.slice();
        chips[existingIdx] = next;
        return { chips };
      }
      return { chips: [...state.chips, next] };
    }
    case "remove":
      return { chips: state.chips.filter((c) => c.id !== action.id) };
    case "removeLastRemovable": {
      for (let i = state.chips.length - 1; i >= 0; i--) {
        if (state.chips[i].removable) {
          const chips = state.chips.slice();
          chips.splice(i, 1);
          return { chips };
        }
      }
      return state;
    }
    case "clear":
      return state.chips.length === 0 ? state : { chips: [] };
  }
}

interface PromptChipsApi {
  chips: readonly PromptChip[];
  pushChip: (chip: Omit<PromptChip, "id"> & { id?: string }) => string;
  removeChip: (id: string) => void;
  clearChips: () => void;
}

const Ctx = createContext<PromptChipsApi | null>(null);

export function PromptChipsProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(promptChipsReducer, { chips: [] });

  const pushChip = useCallback(
    (chip: Omit<PromptChip, "id"> & { id?: string }): string => {
      const id = chip.id ?? `chip_${nanoid(6)}`;
      dispatch({ type: "push", chip: { ...chip, id } });
      return id;
    },
    []
  );

  const removeChip = useCallback((id: string) => {
    dispatch({ type: "remove", id });
  }, []);

  const clearChips = useCallback(() => dispatch({ type: "clear" }), []);

  const api = useMemo<PromptChipsApi>(
    () => ({
      chips: state.chips,
      pushChip,
      removeChip,
      clearChips,
    }),
    [state.chips, pushChip, removeChip, clearChips]
  );

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

export function usePromptChips(): PromptChipsApi {
  const ctx = useContext(Ctx);
  if (!ctx) {
    throw new Error(
      "usePromptChips must be used within <PromptChipsProvider>."
    );
  }
  return ctx;
}
