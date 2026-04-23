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

// Small pause between the user message appearing and the bot "thinking"
// bubble starting its entrance. Without it, both bubbles enter nearly
// simultaneously — which reads as "scripted UI" instead of a conversation.
const PRE_THINK_DELAY_MS = 260;

// How long the bot "thinks" (shows dots) before the reply materializes,
// measured from the moment the pending bubble appears. Long enough that
// the dots complete ~1.5 pulses and read as deliberate.
const THINK_DELAY_MS = 1000;

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

  const preThinkTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const replyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clearReplyTimer = () => {
    if (preThinkTimerRef.current) {
      clearTimeout(preThinkTimerRef.current);
      preThinkTimerRef.current = null;
    }
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

  // Two-step reveal:
  //   1) After PRE_THINK_DELAY_MS, push a pending bot bubble (dots). This
  //      gap gives the preceding user message room to finish its slide-in,
  //      so the two bubbles don't enter on top of each other.
  //   2) After THINK_DELAY_MS more, update that same bubble in place with
  //      the real text. The bubble container never re-mounts — Motion
  //      animates its layout resize + the dots→text blur crossfade inside.
  const queueBotReply = useCallback(
    (botText: string, chipsAfter: Chip[]) => {
      clearReplyTimer();
      const pendingId = nextId();
      setChips([]);
      preThinkTimerRef.current = setTimeout(() => {
        setHistory((h) => [
          ...h,
          { id: pendingId, role: "bot", text: "", pending: true },
        ]);
        preThinkTimerRef.current = null;
        replyTimerRef.current = setTimeout(() => {
          setHistory((h) =>
            h.map((m) =>
              m.id === pendingId
                ? { ...m, text: botText, pending: false }
                : m
            )
          );
          setChips(chipsAfter);
          replyTimerRef.current = null;
        }, THINK_DELAY_MS);
      }, PRE_THINK_DELAY_MS);
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
