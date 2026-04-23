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

export function useOnboardingChat(): OnboardingChatState {
  const state = useAppState();
  const dispatch = useAppDispatch();
  const done = isCampaignDone(state);
  const onWelcome = isOnWelcome(state);

  const [history, setHistory] = useState<Msg[]>([]);
  const [chips, setChips] = useState<Chip[]>(
    done ? POST_ONBOARDING_CHIPS : WAVE_0_CHIPS
  );

  // Reset when the user (re-)enters welcome without having finished onboarding,
  // or when the `done` flag flips (first campaign launched → post-onboarding).
  const prevOnWelcome = useRef(onWelcome);
  const prevDone = useRef(done);
  useEffect(() => {
    const enteredWelcome = !prevOnWelcome.current && onWelcome;
    const doneChanged = prevDone.current !== done;
    if (enteredWelcome || doneChanged) {
      setHistory([]);
      setChips(done ? POST_ONBOARDING_CHIPS : WAVE_0_CHIPS);
    }
    prevOnWelcome.current = onWelcome;
    prevDone.current = done;
  }, [onWelcome, done]);

  const submitChip = useCallback(
    (chip: Chip) => {
      const userMsg: Msg = { role: "user", text: chip.label };

      if (!done) {
        // Terminal onboarding chip — take user straight into the signal
        // creation wizard (the 6-scenario picker is step 1).
        if (chip.next === "create-signal") {
          setHistory((h) => [...h, userMsg]);
          dispatch({ type: "start_signal_flow" });
          return;
        }
        const node = WAVES[chip.next];
        if (!node) return;
        setHistory((h) => [...h, userMsg, { role: "bot", text: node.answer }]);
        // The wave-3 "extra question" chip is single-use: once the user asks
        // it (or after a wave-2 chip leads us to the shared wave-3 answer and
        // the user re-asks it), the chip disappears and only
        // "Создать первый сигнал →" remains.
        if (chip.next === "wave-3-repeat") {
          setChips(node.chips.filter((c) => c.next === "create-signal"));
        } else {
          setChips(node.chips);
        }
        return;
      }

      if (chip.next === "post-create-signal") {
        setHistory((h) => [...h, userMsg]);
        dispatch({ type: "start_signal_flow" });
        return;
      }
      if (chip.next === "post-create-campaign") {
        setHistory((h) => [
          ...h,
          userMsg,
          { role: "bot", text: POST_CAMPAIGN_REPLY },
        ]);
      }
    },
    [dispatch, done]
  );

  const submitFreeText = useCallback((text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setHistory((h) => [
      ...h,
      { role: "user", text: trimmed },
      { role: "bot", text: FREEFORM_REPLY },
    ]);
  }, []);

  return { history, chips, submitChip, submitFreeText };
}
