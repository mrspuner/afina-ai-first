"use client";

import { useEffect, useRef } from "react";
import { useChat } from "@/state/chat-context";
import { useTriggerEdit } from "@/state/trigger-edit-context";
import { mockReplyFor, mockReplyForFreeText } from "@/lib/mock-ai-reply";
import { parseTriggerCommand } from "@/lib/trigger-edit-parser";
import {
  COMPLEX_THINKING_FINAL_REPLY_SIGNAL,
  COMPLEX_THINKING_STEPS_SIGNAL,
} from "@/lib/complex-thinking-demo";
import type { ChatComposerSubmitPayload } from "./chat-composer";

const LIGHT_QUERY = "лёгкий запрос";
const HEAVY_QUERY = "сложный запрос";

/** Общий обработчик сабмита чата — используется и collapsed-баром, и drawer. */
export function useChatSubmit(): { submit: (payload: ChatComposerSubmitPayload) => void } {
  const chat = useChat();
  const triggerEdit = useTriggerEdit();
  const timersRef = useRef<number[]>([]);

  useEffect(() => {
    const timers = timersRef;
    return () => {
      timers.current.forEach((id) => window.clearTimeout(id));
      timers.current = [];
    };
  }, []);

  function schedule(fn: () => void, ms: number) {
    const id = window.setTimeout(() => {
      timersRef.current = timersRef.current.filter((t) => t !== id);
      fn();
    }, ms) as unknown as number;
    timersRef.current.push(id);
  }

  function playComplexThinking() {
    chat.openSidebar();
    let cursor = 0;
    function nextStep() {
      if (cursor >= COMPLEX_THINKING_STEPS_SIGNAL.length) {
        chat.append({ role: "assistant", text: COMPLEX_THINKING_FINAL_REPLY_SIGNAL });
        return;
      }
      const step = COMPLEX_THINKING_STEPS_SIGNAL[cursor++];
      const id = chat.append({ role: "assistant", text: "", pending: true });
      schedule(() => {
        chat.updatePending(id, step.reasoning);
        nextStep();
      }, step.delayMs);
    }
    nextStep();
  }

  function submit(payload: ChatComposerSubmitPayload) {
    const { text, segments } = payload;
    const normalized = text.trim().toLowerCase();

    if (normalized === LIGHT_QUERY) {
      chat.append({ role: "user", text });
      const id = chat.append({ role: "assistant", text: "", pending: true });
      triggerEdit.randomRemix();
      schedule(() => {
        chat.updatePending(
          id,
          "Перебрал интересы и триггеры — посмотрите выделенные карточки."
        );
      }, 400);
      return;
    }
    if (normalized === HEAVY_QUERY) {
      chat.append({ role: "user", text });
      playComplexThinking();
      return;
    }

    const triggerSegment = segments.find((s) => s.chip.kind === "trigger");
    if (triggerSegment && text.length > 0) {
      const parsed = parseTriggerCommand(triggerSegment.text);
      if (parsed.kind !== "fallback") {
        const triggerId = triggerSegment.chip.payload as string;
        chat.append({
          role: "user",
          text: triggerSegment.text,
          triggerLabel: triggerSegment.chip.label,
        });
        const id = chat.append({ role: "assistant", text: "", pending: true });
        triggerEdit.highlightTrigger(triggerId);
        schedule(() => {
          triggerEdit.applyToTrigger(triggerId, parsed);
          chat.updatePending(id, mockReplyFor(parsed));
        }, 350);
        return;
      }
    }

    chat.append({ role: "user", text });
    const id = chat.append({ role: "assistant", text: "", pending: true });
    schedule(() => chat.updatePending(id, mockReplyForFreeText()), 350);
  }

  return { submit };
}
