"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import type { ChatMessage } from "@/state/chat-context";

const TRANSIENT_REPLY_LINGER_MS = 3500;

/**
 * Inline-ответ ассистента под шапкой PromptBar — короткая «пузырьковая»
 * показывалка последнего assistant-сообщения. Появляется на каждое новое
 * сообщение, пришедшее **пока компонент смонтирован** (baseline =
 * messages.length на момент маунта). Пока сообщение pending — рисует точки;
 * после resolve тает через {@link TRANSIENT_REPLY_LINGER_MS}.
 *
 * Логика «baseline по маунту» означает, что при перемонтировании (например,
 * collapsed↔sidebar) старая история не реигрывается — а при смене раздела
 * `ChatProvider` всё равно чистит messages, поэтому baseline остаётся
 * актуальным.
 *
 * Полная история переписки доступна через раскрытие drawer'а.
 */
export function TransientReply({ messages }: { messages: ChatMessage[] }) {
  // Baseline захватываем через useState (инициализатор вызывается один раз) —
  // refs в render-фазе React 19 читать запрещено линтером react-hooks/refs.
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
    const t = window.setTimeout(
      () => setHiddenId(latest.id),
      TRANSIENT_REPLY_LINGER_MS
    );
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
          className="flex items-start gap-2 px-1 pb-1.5 text-sm leading-snug text-foreground"
        >
          {latest.pending ? (
            <span className="inline-flex items-center gap-1 py-1.5">
              <span className="h-1 w-1 animate-pulse rounded-full bg-foreground/80" />
              <span className="h-1 w-1 animate-pulse rounded-full bg-foreground/80 [animation-delay:120ms]" />
              <span className="h-1 w-1 animate-pulse rounded-full bg-foreground/80 [animation-delay:240ms]" />
            </span>
          ) : (
            <span>{latest.text}</span>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
