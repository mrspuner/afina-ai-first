"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAppDispatch, useAppState } from "@/state/app-state-context";
import { isCampaignDone, isOnWelcome } from "@/state/app-state";
import {
  FREEFORM_REPLY,
  POST_CAMPAIGN_REPLY,
  POST_ONBOARDING_CHIPS,
  WAVE_0_CHIPS,
  WAVES,
  type Chip,
  type Msg,
} from "./onboarding-chat";

export type OnboardingChatState = {
  history: Msg[];
  chips: Chip[];
  submitChip: (chip: Chip) => void;
  submitFreeText: (text: string) => void;
};

// Simulated LLM generation delay before the bot reply materializes. Long
// enough that the thinking dots read as "thinking", short enough that the
// conversation doesn't stall.
const THINK_DELAY_MS = 900;

export function useOnboardingChat(): OnboardingChatState {
  const state = useAppState();
  const dispatch = useAppDispatch();
  const done = isCampaignDone(state);
  const onWelcome = isOnWelcome(state);

  const msgIdRef = useRef(0);
  const nextId = () => ++msgIdRef.current;

  const [history, setHistory] = useState<Msg[]>([]);
  const [chips, setChips] = useState<Chip[]>(
    done ? POST_ONBOARDING_CHIPS : WAVE_0_CHIPS
  );

  const replyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clearReplyTimer = () => {
    if (replyTimerRef.current) {
      clearTimeout(replyTimerRef.current);
      replyTimerRef.current = null;
    }
  };

  useEffect(() => {
    return () => clearReplyTimer();
  }, []);

  // Reset when the user (re-)enters welcome without finishing onboarding,
  // or when `done` flips (first campaign launched → post-onboarding).
  const prevOnWelcome = useRef(onWelcome);
  const prevDone = useRef(done);
  useEffect(() => {
    const enteredWelcome = !prevOnWelcome.current && onWelcome;
    const doneChanged = prevDone.current !== done;
    if (enteredWelcome || doneChanged) {
      clearReplyTimer();
      setHistory([]);
      setChips(done ? POST_ONBOARDING_CHIPS : WAVE_0_CHIPS);
    }
    prevOnWelcome.current = onWelcome;
    prevDone.current = done;
  }, [onWelcome, done]);

  // Push a pending bot bubble immediately (user sees dots enter right after
  // the user message), then swap its content to the real reply after the
  // think delay. The bubble container itself never re-mounts — so the UI
  // does one slide-in, then a content crossfade, instead of two independent
  // animations.
  const queueBotReply = useCallback(
    (botText: string, chipsAfter: Chip[]) => {
      clearReplyTimer();
      const pendingId = nextId();
      setHistory((h) => [
        ...h,
        { id: pendingId, role: "bot", text: "", pending: true },
      ]);
      setChips([]);
      replyTimerRef.current = setTimeout(() => {
        setHistory((h) =>
          h.map((m) =>
            m.id === pendingId ? { ...m, text: botText, pending: false } : m
          )
        );
        setChips(chipsAfter);
        replyTimerRef.current = null;
      }, THINK_DELAY_MS);
    },
    []
  );

  const submitChip = useCallback(
    (chip: Chip) => {
      const userMsg: Msg = { id: nextId(), role: "user", text: chip.label };

      if (!done) {
        if (chip.next === "create-signal") {
          clearReplyTimer();
          setHistory((h) => [...h, userMsg]);
          setChips([]);
          dispatch({ type: "start_signal_flow" });
          return;
        }
        const node = WAVES[chip.next];
        if (!node) return;
        setHistory((h) => [...h, userMsg]);
        const nextChips =
          chip.next === "wave-3-repeat"
            ? node.chips.filter((c) => c.next === "create-signal")
            : node.chips;
        queueBotReply(node.answer, nextChips);
        return;
      }

      if (chip.next === "post-create-signal") {
        clearReplyTimer();
        setHistory((h) => [...h, userMsg]);
        setChips([]);
        dispatch({ type: "start_signal_flow" });
        return;
      }
      if (chip.next === "post-create-campaign") {
        setHistory((h) => [...h, userMsg]);
        queueBotReply(POST_CAMPAIGN_REPLY, POST_ONBOARDING_CHIPS);
      }
    },
    [dispatch, done, queueBotReply]
  );

  const submitFreeText = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;
      setHistory((h) => [
        ...h,
        { id: nextId(), role: "user", text: trimmed },
      ]);
      queueBotReply(FREEFORM_REPLY, done ? POST_ONBOARDING_CHIPS : chips);
    },
    [queueBotReply, done, chips]
  );

  return { history, chips, submitChip, submitFreeText };
}
