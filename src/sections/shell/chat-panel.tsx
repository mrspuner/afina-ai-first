"use client";

import { useRef, useState, useCallback } from "react";
import { useChat } from "@/state/chat-context";
import { ChatComposer, type ChatComposerHandle } from "./chat-composer";
import { PromptBar } from "./prompt-bar";
import { useChatSubmit } from "./use-chat-submit";
import { DraftQueueList } from "./draft-queue-list";
import { SuggestionBar } from "./suggestion-bar";
import { TransientReply } from "./transient-reply";
import type { PromptChip } from "@/state/prompt-chips-context";
import { useAppDispatch, useAppState } from "@/state/app-state-context";
import { useDraftQueue } from "@/state/draft-queue-context";
import { selectPromptSuggestions } from "@/state/select-prompt-suggestions";
import type { SuggestionItem } from "@/state/suggestion-registry";

export function ChatPanel({ placeholder }: { placeholder: string }) {
  const chat = useChat();
  const { submit } = useChatSubmit();
  const state = useAppState();
  const dispatch = useAppDispatch();
  const { drafts } = useDraftQueue();
  const composerRef = useRef<ChatComposerHandle>(null);
  const [activeInfo, setActiveInfo] = useState<{
    tag: PromptChip | null;
    hasTypedText: boolean;
  }>({ tag: null, hasTypedText: false });

  const handleActiveTagChange = useCallback(
    (info: { tag: PromptChip | null; hasTypedText: boolean }) => {
      setActiveInfo((prev) =>
        prev.tag === info.tag && prev.hasTypedText === info.hasTypedText
          ? prev
          : info
      );
    },
    []
  );

  const resolution = selectPromptSuggestions(state, {
    activeTag: activeInfo.tag,
    hasTypedText: activeInfo.hasTypedText,
    queueLength: drafts.length,
    welcomeChips: [],
  });

  function handlePick(item: SuggestionItem) {
    switch (item.action.kind) {
      case "ask":
        // Клик вставляет фразу в инпут — Enter затем отправит её в чат
        // через useChatSubmit (mockReplyForFreeText даст fallback-ответ).
        composerRef.current?.insertSuggestion(item.action.prompt);
        return;
      case "submit":
        submit({ text: item.action.phrase, segments: [] });
        return;
      case "dispatch":
        dispatch(item.action.action);
        return;
      case "command":
        if (item.action.command === "apply-all") {
          composerRef.current?.insertApplyAllCommand();
        }
        return;
      case "chat-submit":
        // Welcome-волны не имеют смысла в collapsed chat-panel.
        return;
    }
  }

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
      <ChatComposer
        ref={composerRef}
        placeholder={placeholder}
        onSubmit={submit}
        onActiveTagChange={handleActiveTagChange}
      />
      <SuggestionBar resolution={resolution} onPick={handlePick} />
    </PromptBar>
  );
}
