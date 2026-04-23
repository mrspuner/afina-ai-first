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
  thinking: boolean;
  submitChip: (chip: Chip) => void;
  submitFreeText: (text: string) => void;
};

// Simulated LLM generation delay before the bot reply materializes. Tuned to
// feel like real text generation — long enough that the user notices the
// "thinking" indicator, short enough that the flow doesn't stall.
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
  const [thinking, setThinking] = useState(false);

  const replyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clearReplyTimer = () => {
    if (replyTimerRef.current) {
      clearTimeout(replyTimerRef.current);
      replyTimerRef.current = null;
    }
  };

  // Unmount cleanup — cancel any pending simulated reply.
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
      setThinking(false);
      setHistory([]);
      setChips(done ? POST_ONBOARDING_CHIPS : WAVE_0_CHIPS);
    }
    prevOnWelcome.current = onWelcome;
    prevDone.current = done;
  }, [onWelcome, done]);

  const queueBotReply = useCallback(
    (botText: string, chipsAfter: Chip[]) => {
      clearReplyTimer();
      setThinking(true);
      setChips([]);
      replyTimerRef.current = setTimeout(() => {
        setHistory((h) => [...h, { id: nextId(), role: "bot", text: botText }]);
        setChips(chipsAfter);
        setThinking(false);
        replyTimerRef.current = null;
      }, THINK_DELAY_MS);
    },
    []
  );

  const submitChip = useCallback(
    (chip: Chip) => {
      const userMsg: Msg = { id: nextId(), role: "user", text: chip.label };

      if (!done) {
        // Terminal onboarding chip — user goes straight into the signal
        // creation wizard (6-scenario picker is step 1).
        if (chip.next === "create-signal") {
          clearReplyTimer();
          setThinking(false);
          setHistory((h) => [...h, userMsg]);
          setChips([]);
          dispatch({ type: "start_signal_flow" });
          return;
        }
        const node = WAVES[chip.next];
        if (!node) return;
        setHistory((h) => [...h, userMsg]);
        // Wave-3 "extra question" is single-use — after it's asked, leave
        // only "Создать первый сигнал →" in the chip row.
        const nextChips =
          chip.next === "wave-3-repeat"
            ? node.chips.filter((c) => c.next === "create-signal")
            : node.chips;
        queueBotReply(node.answer, nextChips);
        return;
      }

      if (chip.next === "post-create-signal") {
        clearReplyTimer();
        setThinking(false);
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

  return { history, chips, thinking, submitChip, submitFreeText };
}
