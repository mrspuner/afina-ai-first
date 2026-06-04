"use client";

import { useRef } from "react";
import { useAppState } from "@/state/app-state-context";
import { isOnWelcome, isWorkflowView } from "@/state/app-state";
import { useChat } from "@/state/chat-context";
import { PromptBar } from "./prompt-bar";
import {
  PromptComposer,
  SHELL_INPUT_CLASS,
  type PromptComposerHandle,
} from "./prompt-composer";
import { DraftQueueList } from "./draft-queue-list";
import { TransientReply } from "./transient-reply";

/**
 * Нижний промпт-бар для всех экранов, кроме guided-signal (там ChatPanel).
 * Тонкая обёртка над общим {@link PromptComposer} — submit/clear/подсказки и
 * состояние едины с drawer и chat-panel.
 */
export function ShellBottomBar() {
  const state = useAppState();
  const { view } = state;
  const chat = useChat();
  const composerRef = useRef<PromptComposerHandle>(null);

  const chatPlaceholder = isOnWelcome(state)
    ? "Задайте вопрос…"
    : isWorkflowView(state)
      ? "Опишите изменение сценария..."
      : view.kind === "campaign-select"
        ? "Опишите вашу кампанию..."
        : view.kind === "guided-signal"
          ? "Введите ваши параметры или задайте вопрос"
          : view.kind === "section" &&
              (view.name === "Сигналы" || view.name === "Кампании")
            ? "Напишите, что вы хотите сделать"
            : "Выберите шаг или задайте вопрос…";

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
      <PromptComposer
        ref={composerRef}
        placeholder={chatPlaceholder}
        captureGlobalTyping
        inputClassName={SHELL_INPUT_CLASS}
      />
    </PromptBar>
  );
}
