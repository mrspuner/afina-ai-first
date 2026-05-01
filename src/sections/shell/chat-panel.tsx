"use client";

import Image from "next/image";
import { useLayoutEffect } from "react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import { useChat } from "@/state/chat-context";
import { ChatPanelHeader } from "./chat-panel-header";
import { ChatHistoryList } from "./chat-history-list";
import { ChatComposer } from "./chat-composer";
import { mockReplyForFreeText } from "@/lib/mock-ai-reply";

const SIDEBAR_WIDTH_PX = 420;

function EmptyHistory() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-2 py-8 text-center">
      <Image
        src="/mascot-icon.svg"
        alt=""
        width={32}
        height={32}
        aria-hidden
      />
      <p className="text-xs text-muted-foreground">
        Здесь будет история переписки с афина ИИ
      </p>
    </div>
  );
}

export function ChatPanel({ placeholder }: { placeholder: string }) {
  const chat = useChat();

  // Reflect sidebar mode as a CSS variable so layouts can shift main content.
  useLayoutEffect(() => {
    const root = document.documentElement;
    if (chat.mode === "sidebar") {
      root.style.setProperty("--chat-sidebar-width", `${SIDEBAR_WIDTH_PX}px`);
    } else {
      root.style.setProperty("--chat-sidebar-width", "0px");
    }
    return () => {
      root.style.removeProperty("--chat-sidebar-width");
    };
  }, [chat.mode]);

  function handleFreeTextSubmit(text: string) {
    chat.append({ role: "user", text });
    const assistantId = chat.append({ role: "assistant", text: "", pending: true });
    window.setTimeout(() => {
      chat.updatePending(assistantId, mockReplyForFreeText());
    }, 350);
  }

  const isEmpty = chat.messages.length === 0;
  const expanded = chat.mode === "expanded";

  if (chat.mode === "sidebar") {
    return (
      <motion.aside
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ duration: 0.32, ease: [0.32, 0.72, 0, 1] }}
        className="fixed right-0 top-0 z-30 flex h-screen w-[420px] flex-col gap-3 border-l border-white/10 bg-[rgba(10,10,10,0.85)] p-4 backdrop-blur-[2px]"
      >
        <ChatPanelHeader
          mode={chat.mode}
          onToggleBar={() => chat.setMode("collapsed")}
          onOpenSidebar={chat.openSidebar}
          onCloseSidebar={chat.closeSidebar}
        />
        {isEmpty ? <EmptyHistory /> : <ChatHistoryList messages={chat.messages} variant="sidebar" />}
        <ChatComposer placeholder={placeholder} onSubmit={handleFreeTextSubmit} />
      </motion.aside>
    );
  }

  // Bar modes: outer wrapper stays translucent + blurred (page-like), the
  // brand-yellow tint lives on the header strip only. The composer inside
  // owns its own opaque dark surface so the yellow doesn't bleed through.
  return (
    <motion.div
      className="fixed left-[120px] right-0 bottom-[20px] z-30 flex justify-center px-6"
      initial={false}
    >
      <div
        className={cn(
          "flex w-full max-w-[720px] flex-col overflow-hidden rounded-[10px] border border-white/15 bg-[rgba(10,10,10,0.75)] shadow-[0_0_17px_9px_rgba(0,0,0,0.19)] backdrop-blur-[2px]"
        )}
      >
        <div className="bg-[rgba(255,236,0,0.17)] px-4 py-2">
          <ChatPanelHeader
            mode={chat.mode}
            onToggleBar={() => chat.setMode(expanded ? "collapsed" : "expanded")}
            onOpenSidebar={chat.openSidebar}
            onCloseSidebar={chat.closeSidebar}
          />
        </div>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, scaleY: 0.94 }}
            animate={{ opacity: 1, scaleY: 1 }}
            transition={{ duration: 0.22, ease: [0.32, 0.72, 0, 1] }}
            style={{ transformOrigin: "bottom" }}
            className="flex flex-col px-3 pt-2"
          >
            {isEmpty ? (
              <EmptyHistory />
            ) : (
              <ChatHistoryList messages={chat.messages} variant="bar" />
            )}
          </motion.div>
        )}
        <div className="p-3">
          <ChatComposer placeholder={placeholder} onSubmit={handleFreeTextSubmit} />
        </div>
      </div>
    </motion.div>
  );
}
