"use client";

import { useEffect, useRef } from "react";
import type { Action } from "@/state/app-state";

const AI_REPLY_TIMEOUT_MS = 5000;

/**
 * Auto-dismisses the AI reply 5 seconds after it appears. A new reply arriving
 * mid-cycle resets the timer so the user gets a full 5 seconds with the latest
 * text. Unmount clears the pending timer.
 *
 * Decoupled from React-context plumbing for testability: caller supplies the
 * current `aiReply` value and a `dispatch` function — the hook is a pure
 * timer wrapper.
 */
export function useAiReplyAutoDismiss(
  aiReply: string | null,
  dispatch: (action: Action) => void
): void {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (!aiReply) return;
    timerRef.current = setTimeout(() => {
      dispatch({ type: "ai_reply_dismissed" });
    }, AI_REPLY_TIMEOUT_MS);
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [aiReply, dispatch]);
}
