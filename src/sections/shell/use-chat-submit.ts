"use client";

import { useEffect, useRef } from "react";
import { useChat } from "@/state/chat-context";
import { useTriggerEdit } from "@/state/trigger-edit-context";
import { useAppState, useAppDispatch } from "@/state/app-state-context";
import { isOnStatisticsSection } from "@/state/app-state";
import { mockReplyFor } from "@/lib/mock-ai-reply";
import {
  lookupInformationalReply,
  warmFallbackReply,
} from "@/lib/informational-replies";
import { parseTriggerCommand } from "@/lib/trigger-edit-parser";
import {
  COMPLEX_THINKING_FINAL_REPLY_SIGNAL,
  COMPLEX_THINKING_FINAL_REPLY_STATS,
  COMPLEX_THINKING_STEPS_SIGNAL,
  COMPLEX_THINKING_STEPS_STATS,
  type ComplexThinkingStep,
} from "@/lib/complex-thinking-demo";
import {
  matchStatsQuery,
  STATS_DEMO_YEAR,
  type StatsQueryId,
} from "@/lib/stats-query-matcher";
import type { ChatComposerSubmitPayload } from "./chat-composer";

const LIGHT_QUERY = "лёгкий запрос";
const HEAVY_QUERY = "сложный запрос";

/** Общий обработчик сабмита чата — используется и collapsed-баром, и drawer. */
export function useChatSubmit(): { submit: (payload: ChatComposerSubmitPayload) => void } {
  const chat = useChat();
  const triggerEdit = useTriggerEdit();
  const appState = useAppState();
  const appDispatch = useAppDispatch();
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

  function playComplexThinking(opts: {
    steps: ComplexThinkingStep[];
    finalReply: string;
  }) {
    chat.openSidebar();
    let cursor = 0;
    function nextStep() {
      if (cursor >= opts.steps.length) {
        chat.append({ role: "assistant", text: opts.finalReply });
        return;
      }
      const step = opts.steps[cursor++];
      const id = chat.append({ role: "assistant", text: "", pending: true });
      schedule(() => {
        chat.updatePending(id, step.reasoning);
        nextStep();
      }, step.delayMs);
    }
    nextStep();
  }

  function runStatsQuery(id: StatsQueryId, userText: string) {
    switch (id) {
      case "group-by-campaigns": {
        chat.append({ role: "user", text: userText });
        appDispatch({ type: "stats_set_rows", rows: "campaigns" });
        const replyId = chat.append({ role: "assistant", text: "", pending: true });
        schedule(() => {
          chat.updatePending(replyId, "Перегруппировал по кампаниям.");
        }, 400);
        return;
      }
      case "top-campaigns-income-june": {
        chat.append({ role: "user", text: userText });
        appDispatch({
          type: "stats_apply_patch",
          patch: {
            rows: "campaigns",
            sort: { column: "income", direction: "desc" },
            period: {
              preset: "custom",
              from: `${STATS_DEMO_YEAR}-06-01`,
              to: `${STATS_DEMO_YEAR}-06-30`,
            },
            rowCount: 10,
          },
        });
        const replyId = chat.append({ role: "assistant", text: "", pending: true });
        schedule(() => {
          chat.updatePending(replyId, "Топ-10 кампаний по доходу за июнь.");
        }, 400);
        return;
      }
      case "compare-channels": {
        chat.append({ role: "user", text: userText });
        playComplexThinking({
          steps: COMPLEX_THINKING_STEPS_STATS,
          finalReply: COMPLEX_THINKING_FINAL_REPLY_STATS,
        });
        return;
      }
    }
  }

  function submit(payload: ChatComposerSubmitPayload) {
    const { text, segments } = payload;
    const normalized = text.trim().toLowerCase();

    // Statistics-only hard-coded queries (looser matching). Скоупинг по
    // секции — фразы не должны срабатывать вне Статистики, даже если их
    // случайно ввели в drawer-композиторе.
    if (isOnStatisticsSection(appState)) {
      const match = matchStatsQuery(text);
      if (match) {
        runStatsQuery(match.id, text);
        return;
      }
    }

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
      playComplexThinking({
        steps: COMPLEX_THINKING_STEPS_SIGNAL,
        finalReply: COMPLEX_THINKING_FINAL_REPLY_SIGNAL,
      });
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
    // Информационные вопросы (разделы/визард/переходные view) получают
    // содержательный ответ из каталога; нераспознанное — тёплый fallback
    // вместо сухой заглушки.
    const reply = lookupInformationalReply(text) ?? warmFallbackReply();
    schedule(() => chat.updatePending(id, reply), 350);
  }

  return { submit };
}
