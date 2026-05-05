"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import type { ChatMessage } from "@/state/chat-context";

function MascotIcon({ className }: { className?: string }) {
  return (
    <Image
      src="/mascot-icon.svg"
      alt=""
      width={16}
      height={16}
      aria-hidden
      className={cn("shrink-0", className)}
    />
  );
}

function ThinkingDots() {
  return (
    <span className="inline-flex items-center gap-1 text-muted-foreground">
      <span className="h-1 w-1 animate-pulse rounded-full bg-muted-foreground/70" />
      <span className="h-1 w-1 animate-pulse rounded-full bg-muted-foreground/70 [animation-delay:120ms]" />
      <span className="h-1 w-1 animate-pulse rounded-full bg-muted-foreground/70 [animation-delay:240ms]" />
    </span>
  );
}

function MessageRow({ message }: { message: ChatMessage }) {
  if (message.role === "assistant") {
    return (
      <div className="flex items-start gap-2 py-1.5 text-sm text-foreground/90">
        <MascotIcon className="mt-0.5" />
        {message.pending ? <ThinkingDots /> : <span className="leading-snug">{message.text}</span>}
      </div>
    );
  }
  return (
    <div className="flex justify-end py-1.5">
      <div className="max-w-[85%] rounded-lg bg-white/8 px-3 py-2 text-sm text-foreground/95">
        {message.triggerLabel && (
          <span className="mr-1.5 inline-block rounded border border-primary/30 bg-primary/10 px-1.5 py-0.5 text-xs text-foreground">
            {message.triggerLabel}
          </span>
        )}
        <span className="leading-snug">{message.text}</span>
      </div>
    </div>
  );
}

interface ChatHistoryListProps {
  messages: ChatMessage[];
  /**
   * `collapsed` — short peek window inside the bar (latest messages with
   * fade-mask). `bar` — scrollable window inside the chat container.
   * `sidebar` — fills the parent's height.
   */
  variant: "collapsed" | "bar" | "sidebar";
}

const VARIANT_HEIGHT: Record<ChatHistoryListProps["variant"], string> = {
  collapsed: "max-h-[100px]",
  bar: "max-h-[360px]",
  sidebar: "h-full",
};

export function ChatHistoryList({ messages, variant }: ChatHistoryListProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showTopFade, setShowTopFade] = useState(false);
  const [showBottomFade, setShowBottomFade] = useState(false);

  function updateFades() {
    const el = scrollRef.current;
    if (!el) return;
    setShowTopFade(el.scrollTop > 4);
    setShowBottomFade(el.scrollTop + el.clientHeight < el.scrollHeight - 4);
  }

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    // Auto-scroll to the bottom on new messages.
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    // Re-evaluate fade visibility after the scroll lands.
    requestAnimationFrame(updateFades);
  }, [messages.length]);

  return (
    <div className="relative flex-1 overflow-hidden">
      {showTopFade && (
        <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-6 bg-gradient-to-b from-[rgba(10,10,10,0.95)] to-transparent" />
      )}
      <div
        ref={scrollRef}
        onScroll={updateFades}
        className={cn(
          "h-full overflow-y-auto px-3",
          VARIANT_HEIGHT[variant]
        )}
      >
        {messages.map((m) => (
          <MessageRow key={m.id} message={m} />
        ))}
      </div>
      {showBottomFade && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-6 bg-gradient-to-t from-[rgba(10,10,10,0.95)] to-transparent" />
      )}
    </div>
  );
}
