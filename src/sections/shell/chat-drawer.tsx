"use client";

import Image from "next/image";
import { useLayoutEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useChat } from "@/state/chat-context";
import { ChatPanelHeader } from "./chat-panel-header";
import { ChatHistoryList } from "./chat-history-list";
import { ChatComposer } from "./chat-composer";
import { useChatSubmit } from "./use-chat-submit";
import { DraftQueueList } from "./draft-queue-list";

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
  const isSidebar = chat.mode === "sidebar";

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
          <DraftQueueList variant="drawer" onTakeDraft={() => {}} />
          {chat.messages.length === 0 ? (
            <EmptyHistory />
          ) : (
            <ChatHistoryList messages={chat.messages} />
          )}
          <ChatComposer placeholder={placeholder} onSubmit={submit} />
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
