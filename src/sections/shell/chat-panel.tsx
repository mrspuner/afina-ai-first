"use client";

import Image from "next/image";
import { useLayoutEffect, useMemo, useRef, useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useChat, type ChatMessage } from "@/state/chat-context";
import { useTriggerEdit } from "@/state/trigger-edit-context";
import { ChatPanelHeader } from "./chat-panel-header";
import { ChatHistoryList } from "./chat-history-list";
import { ChatComposer, type ChatComposerSubmitPayload } from "./chat-composer";
import { mockReplyFor, mockReplyForFreeText } from "@/lib/mock-ai-reply";
import { parseTriggerCommand } from "@/lib/trigger-edit-parser";
import { COMPLEX_THINKING_FINAL_REPLY, COMPLEX_THINKING_STEPS } from "@/lib/complex-thinking-demo";

const SIDEBAR_WIDTH_PX = 420;
const LIGHT_QUERY = "лёгкий запрос";
const HEAVY_QUERY = "сложный запрос";

function EmptyHistory() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-2 py-8 text-center">
      <Image src="/mascot-icon.svg" alt="" width={32} height={32} aria-hidden />
      <p className="text-xs text-muted-foreground">
        Здесь будет история переписки с афина ИИ
      </p>
    </div>
  );
}

const TRANSIENT_REPLY_LINGER_MS = 3500;

/**
 * Inline-ответ AI прямо под шапкой бара в collapsed-режиме.
 * Появляется на каждое новое assistant-сообщение, что пришло пока мы
 * смонтированы (baseline = `messages.length` на момент маунта). Держится
 * пока pending, после resolve — тает через {@link TRANSIENT_REPLY_LINGER_MS}.
 *
 * Замена режима (collapsed↔sidebar) перемонтирует компонент, baseline
 * обновляется — старая история не реигрывается.
 */
function TransientReply({ messages }: { messages: ChatMessage[] }) {
  // Baseline = messages.length на момент маунта компонента. Захватываем через
  // useState (инициализатор вызывается один раз) — refs в render-фазе React 19
  // читать запрещено линтером react-hooks/refs.
  const [baseline] = useState(messages.length);
  const latest = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === "assistant") return messages[i];
    }
    return null;
  }, [messages]);

  const [hiddenId, setHiddenId] = useState<string | null>(null);
  const isFresh = latest && messages.length > baseline;
  const visible = isFresh && latest && latest.id !== hiddenId;

  useEffect(() => {
    if (!visible || !latest || latest.pending || !latest.text) return;
    const t = window.setTimeout(() => setHiddenId(latest.id), TRANSIENT_REPLY_LINGER_MS);
    return () => window.clearTimeout(t);
  }, [visible, latest]);

  return (
    <AnimatePresence initial={false}>
      {visible && latest && (
        <motion.div
          key={latest.id}
          initial={{ opacity: 0, y: -3 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -3 }}
          transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
          className="flex items-start gap-1.5 px-1 pb-1.5 text-xs leading-snug text-muted-foreground"
        >
          {latest.pending ? (
            <span className="inline-flex items-center gap-1 py-1">
              <span className="h-1 w-1 animate-pulse rounded-full bg-muted-foreground/70" />
              <span className="h-1 w-1 animate-pulse rounded-full bg-muted-foreground/70 [animation-delay:120ms]" />
              <span className="h-1 w-1 animate-pulse rounded-full bg-muted-foreground/70 [animation-delay:240ms]" />
            </span>
          ) : (
            <span>{latest.text}</span>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function ChatPanel({ placeholder }: { placeholder: string }) {
  const chat = useChat();
  const triggerEdit = useTriggerEdit();

  const timersRef = useRef<number[]>([]);
  useEffect(() => {
    return () => {
      timersRef.current.forEach((id) => window.clearTimeout(id));
      timersRef.current = [];
    };
  }, []);

  function schedule(fn: () => void, ms: number) {
    const id = window.setTimeout(() => {
      // Drop our handle once the timer fires.
      timersRef.current = timersRef.current.filter((t) => t !== id);
      fn();
    }, ms) as unknown as number;
    timersRef.current.push(id);
  }

  useLayoutEffect(() => {
    const root = document.documentElement;
    root.style.setProperty(
      "--chat-sidebar-width",
      chat.mode === "sidebar" ? `${SIDEBAR_WIDTH_PX}px` : "0px"
    );
    return () => { root.style.removeProperty("--chat-sidebar-width"); };
  }, [chat.mode]);

  function playComplexThinking() {
    chat.openSidebar();
    let cursor = 0;
    function nextStep() {
      if (cursor >= COMPLEX_THINKING_STEPS.length) {
        chat.append({ role: "assistant", text: COMPLEX_THINKING_FINAL_REPLY });
        return;
      }
      const step = COMPLEX_THINKING_STEPS[cursor++];
      const id = chat.append({ role: "assistant", text: "", pending: true });
      schedule(() => {
        chat.updatePending(id, step.reasoning);
        nextStep();
      }, step.delayMs);
    }
    nextStep();
  }

  function handleSubmit(payload: ChatComposerSubmitPayload) {
    const { text, segments } = payload;
    const normalized = text.trim().toLowerCase();

    // 1. Hard-coded test queries — приоритет над всем остальным.
    if (normalized === LIGHT_QUERY) {
      chat.append({ role: "user", text });
      const id = chat.append({ role: "assistant", text: "", pending: true });
      triggerEdit.randomRemix();
      schedule(() => {
        chat.updatePending(id, "Перебрал интересы и триггеры — посмотрите выделенные карточки.");
      }, 400);
      return;
    }
    if (normalized === HEAVY_QUERY) {
      chat.append({ role: "user", text });
      playComplexThinking();
      return;
    }

    // 2. Сегмент с trigger-чипсиной → применить как команду к delta.
    const triggerSegment = segments.find((s) => s.chip.kind === "trigger");
    if (triggerSegment && text.length > 0) {
      const parsed = parseTriggerCommand(triggerSegment.text);
      if (parsed.kind !== "fallback") {
        const triggerId = triggerSegment.chip.payload as string;
        chat.append({ role: "user", text: triggerSegment.text, triggerLabel: triggerSegment.chip.label });
        const id = chat.append({ role: "assistant", text: "", pending: true });
        triggerEdit.highlightTrigger(triggerId);
        schedule(() => {
          triggerEdit.applyToTrigger(triggerId, parsed);
          chat.updatePending(id, mockReplyFor(parsed));
        }, 350);
        return;
      }
      // fallback: просто отправить как свободный текст (см. ниже).
    }

    // 3. Section-чипсина или произвольный текст — фолбэк.
    chat.append({ role: "user", text });
    const id = chat.append({ role: "assistant", text: "", pending: true });
    schedule(() => chat.updatePending(id, mockReplyForFreeText()), 350);
  }

  const isEmpty = chat.messages.length === 0;

  if (chat.mode === "sidebar") {
    return (
      <motion.aside
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ duration: 0.46, ease: [0.16, 1, 0.3, 1] }}
        className="fixed right-0 top-0 z-30 flex h-screen w-[420px] flex-col gap-3 border-l border-white/10 bg-[rgba(10,10,10,0.85)] p-4 backdrop-blur-[2px]"
      >
        <ChatPanelHeader
          mode={chat.mode}
          onOpenSidebar={chat.openSidebar}
          onCloseSidebar={chat.closeSidebar}
        />
        {isEmpty ? <EmptyHistory /> : <ChatHistoryList messages={chat.messages} />}
        <ChatComposer placeholder={placeholder} onSubmit={handleSubmit} />
      </motion.aside>
    );
  }

  // Collapsed: только бар с композером, без peek-истории.
  return (
    <motion.div
      className="fixed left-[120px] right-0 bottom-[20px] z-30 flex justify-center px-6"
      initial={false}
    >
      <div className="flex w-full max-w-[720px] flex-col gap-2 rounded-[16px] bg-[rgba(10,10,10,0.75)] p-3 shadow-[0_0_17px_9px_rgba(0,0,0,0.19)] backdrop-blur-[2px]">
        <ChatPanelHeader
          mode={chat.mode}
          onOpenSidebar={chat.openSidebar}
          onCloseSidebar={chat.closeSidebar}
        />
        <TransientReply messages={chat.messages} />
        <ChatComposer placeholder={placeholder} onSubmit={handleSubmit} />
      </div>
    </motion.div>
  );
}
