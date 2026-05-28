"use client";

import Image from "next/image";
import { useCallback, useLayoutEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useChat } from "@/state/chat-context";
import { ChatPanelHeader } from "./chat-panel-header";
import { ChatHistoryList } from "./chat-history-list";
import { ChatComposer, type ChatComposerHandle } from "./chat-composer";
import { useChatSubmit } from "./use-chat-submit";
import { DraftQueueList } from "./draft-queue-list";
import { SuggestionBar } from "./suggestion-bar";
import type { PromptChip } from "@/state/prompt-chips-context";
import { useAppDispatch, useAppState } from "@/state/app-state-context";
import { useDraftQueue } from "@/state/draft-queue-context";
import { useWelcomeChat } from "@/sections/welcome/welcome-chat-context";
import { selectPromptSuggestions } from "@/state/select-prompt-suggestions";
import type { SuggestionItem } from "@/state/suggestion-registry";

const SIDEBAR_WIDTH_PX = 420;

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

/** Глобальный правый AI-drawer. Открывается кнопкой PanelRightOpen в PromptBar. */
export function ChatDrawer({ placeholder }: { placeholder: string }) {
  const chat = useChat();
  const { submit } = useChatSubmit();
  const state = useAppState();
  const dispatch = useAppDispatch();
  const { drafts } = useDraftQueue();
  const welcomeChat = useWelcomeChat();
  const composerRef = useRef<ChatComposerHandle>(null);
  const isSidebar = chat.mode === "sidebar";

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

  // Те же подсказки, что и под свёрнутым баром — теперь дублируются в drawer.
  const resolution = selectPromptSuggestions(state, {
    activeTag: activeInfo.tag,
    hasTypedText: activeInfo.hasTypedText,
    queueLength: drafts.length,
    welcomeChips: welcomeChat?.chips ?? [],
  });

  function handlePick(item: SuggestionItem) {
    switch (item.action.kind) {
      case "ask":
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
        // Welcome-волны теперь живут в общем чате/drawer — пишем ответ сюда.
        welcomeChat?.submitChip(item.action.chip);
        return;
    }
  }

  useLayoutEffect(() => {
    const root = document.documentElement;
    root.style.setProperty(
      "--chat-sidebar-width",
      isSidebar ? `${SIDEBAR_WIDTH_PX}px` : "0px"
    );
    return () => {
      root.style.removeProperty("--chat-sidebar-width");
    };
  }, [isSidebar]);

  return (
    <AnimatePresence>
      {isSidebar && (
        <motion.aside
          key="chat-drawer"
          data-testid="chat-drawer"
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
          <DraftQueueList
            variant="drawer"
            onTakeDraft={(draft) => composerRef.current?.loadDraft(draft)}
          />
          {chat.messages.length === 0 ? (
            <EmptyHistory />
          ) : (
            <ChatHistoryList messages={chat.messages} />
          )}
          <ChatComposer
            ref={composerRef}
            placeholder={placeholder}
            onSubmit={submit}
            onActiveTagChange={handleActiveTagChange}
          />
          <SuggestionBar resolution={resolution} onPick={handlePick} />
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
