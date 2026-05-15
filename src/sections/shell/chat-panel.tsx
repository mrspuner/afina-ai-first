"use client";

import { useMemo, useRef, useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useChat, type ChatMessage } from "@/state/chat-context";
import { ChatComposer, type ChatComposerHandle } from "./chat-composer";
import { PromptBar } from "./prompt-bar";
import { useChatSubmit } from "./use-chat-submit";
import { DraftQueueList } from "./draft-queue-list";

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

export function ChatPanel({ placeholder }: { placeholder: string }) {
  const chat = useChat();
  const { submit } = useChatSubmit();
  const composerRef = useRef<ChatComposerHandle>(null);

  return (
    <PromptBar
      onOpenDrawer={chat.openSidebar}
      slot={
        <>
          <DraftQueueList
            variant="compact"
            onTakeDraft={(draft) => composerRef.current?.loadDraft(draft)}
          />
          <TransientReply messages={chat.messages} />
        </>
      }
    >
      <ChatComposer ref={composerRef} placeholder={placeholder} onSubmit={submit} />
    </PromptBar>
  );
}
