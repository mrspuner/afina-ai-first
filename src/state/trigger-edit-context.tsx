"use client";

/**
 * TriggerEditContext bridges Step 2 (where triggers live) and the global
 * ShellBottomBar (which owns the prompt-bar). Step 2 publishes the active
 * trigger and a submit handler; the bottom bar reads that to render the
 * "Редактируем триггер «X»" hint and route prompt submissions to the
 * trigger-edit pipeline instead of the workflow/welcome routers.
 *
 * Draft preservation across trigger switches lives here too — Step 2 stays
 * stateless w.r.t. unsent text, the provider remembers the last in-flight
 * draft per trigger ID. Full history is intentionally not retained (spec).
 */

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

export interface TriggerEditTarget {
  id: string;
  label: string;
}

import type { ChipSegment } from "@/state/prompt-chips-context";

export type TriggerEditSubmitResult =
  | { ok: true }
  | { ok: false; message: string };

export interface TriggerEditContextValue {
  /** Trigger currently being edited, or null when no edit is active. */
  active: TriggerEditTarget | null;
  /** Brief flag set by the host while the simulated AI tick runs. */
  processing: boolean;
  /** Hint message shown above the prompt-bar (fallback / errors). */
  hintMessage: string | null;
  /**
   * Submit one or more (chip, text) segments. Each segment carries a trigger
   * chip plus the free text the user typed after it; the parser is run per
   * segment so different triggers can receive different commands. The result
   * tells the PromptBar whether to clear its input.
   */
  submit: (segments: ChipSegment[]) => Promise<TriggerEditSubmitResult>;
  /** Pull the saved draft for a trigger, if any. */
  getDraft: (triggerId: string) => string;
  /** Save the current prompt-bar text against the active trigger. */
  saveDraft: (triggerId: string, text: string) => void;
  /** Clear the saved draft for a trigger after a successful submit. */
  clearDraft: (triggerId: string) => void;
}

const TriggerEditContext = createContext<TriggerEditContextValue | null>(null);

/**
 * Optional consumer — components that don't need it (welcome chat, workflow
 * router) shouldn't crash when the provider is missing. Returns null instead.
 */
export function useTriggerEdit(): TriggerEditContextValue | null {
  return useContext(TriggerEditContext);
}

export interface TriggerEditHostHandle {
  /** Mark a trigger as the focus of edits (or null to clear). */
  setActive: (target: TriggerEditTarget | null) => void;
  /** Set/clear the hint shown above the prompt-bar. */
  setHint: (message: string | null) => void;
  /** Toggle the processing indicator. */
  setProcessing: (on: boolean) => void;
}

/**
 * Provider for the trigger-edit pipeline.
 *
 * Step 2 mounts a `<TriggerEditHost>` (see step-2-interests.tsx) which calls
 * back into the imperative handle below to register itself as the submit
 * sink. We use a ref-based handle rather than React state to avoid stale
 * closures inside the prompt-bar's submit callback.
 */
export function TriggerEditProvider({ children }: { children: ReactNode }) {
  const [active, setActive] = useState<TriggerEditTarget | null>(null);
  const [processing, setProcessing] = useState(false);
  const [hintMessage, setHintMessage] = useState<string | null>(null);

  const submitRef = useRef<
    | ((segments: ChipSegment[]) => Promise<TriggerEditSubmitResult>)
    | null
  >(null);
  const drafts = useRef<Map<string, string>>(new Map());

  const submit = useCallback(async (segments: ChipSegment[]) => {
    const fn = submitRef.current;
    if (!fn) return { ok: false, message: "Редактирование триггера не активно." };
    return fn(segments);
  }, []);

  const getDraft = useCallback((triggerId: string) => {
    return drafts.current.get(triggerId) ?? "";
  }, []);

  const saveDraft = useCallback((triggerId: string, text: string) => {
    if (text.length === 0) {
      drafts.current.delete(triggerId);
    } else {
      drafts.current.set(triggerId, text);
    }
  }, []);

  const clearDraft = useCallback((triggerId: string) => {
    drafts.current.delete(triggerId);
  }, []);

  const value = useMemo<TriggerEditContextValue>(
    () => ({
      active,
      processing,
      hintMessage,
      submit,
      getDraft,
      saveDraft,
      clearDraft,
    }),
    [active, processing, hintMessage, submit, getDraft, saveDraft, clearDraft]
  );

  // Imperative handle for the host — exposed via a separate context so the
  // host doesn't accidentally render-loop on every state change it triggers.
  const hostHandle = useMemo<TriggerEditHostHandle & {
    registerSubmit: (fn: typeof submitRef.current) => void;
  }>(
    () => ({
      setActive,
      setHint: setHintMessage,
      setProcessing,
      registerSubmit: (fn) => {
        submitRef.current = fn;
      },
    }),
    []
  );

  return (
    <TriggerEditContext.Provider value={value}>
      <TriggerEditHostContext.Provider value={hostHandle}>
        {children}
      </TriggerEditHostContext.Provider>
    </TriggerEditContext.Provider>
  );
}

const TriggerEditHostContext = createContext<
  | (TriggerEditHostHandle & {
      registerSubmit: (
        fn:
          | ((segments: ChipSegment[]) => Promise<TriggerEditSubmitResult>)
          | null
      ) => void;
    })
  | null
>(null);

export function useTriggerEditHost() {
  const ctx = useContext(TriggerEditHostContext);
  if (!ctx) {
    throw new Error(
      "useTriggerEditHost must be used inside <TriggerEditProvider>"
    );
  }
  return ctx;
}
