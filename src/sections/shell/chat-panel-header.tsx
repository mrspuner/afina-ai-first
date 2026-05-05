"use client";

import { ChevronDown, Maximize2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ChatPanelMode } from "@/state/chat-context";

interface ChatPanelHeaderProps {
  mode: ChatPanelMode;
  onToggleBar: () => void;       // collapsed ↔ expanded
  onOpenSidebar: () => void;
  onCloseSidebar: () => void;
}

export function ChatPanelHeader({
  mode,
  onToggleBar,
  onOpenSidebar,
  onCloseSidebar,
}: ChatPanelHeaderProps) {
  const inSidebar = mode === "sidebar";
  const expanded = mode === "expanded";

  return (
    <div className="flex w-full items-center justify-between px-1 py-0.5">
      <div className="flex items-center gap-2">
        {!inSidebar && (
          <button
            type="button"
            onClick={onToggleBar}
            aria-label={expanded ? "Свернуть чат" : "Развернуть чат"}
            className="inline-flex h-6 w-6 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-white/10 hover:text-foreground"
          >
            <ChevronDown
              className={cn("h-4 w-4 transition-transform", !expanded && "rotate-180")}
            />
          </button>
        )}
        <span className="text-xs font-medium text-muted-foreground">Работа с ИИ</span>
      </div>
      <div className="flex items-center">
        {inSidebar ? (
          <button
            type="button"
            onClick={onCloseSidebar}
            aria-label="Закрыть сайдбар"
            className="inline-flex h-7 w-7 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-white/10 hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        ) : (
          <button
            type="button"
            onClick={onOpenSidebar}
            aria-label="Открыть в сайдбаре"
            className="inline-flex h-7 w-7 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-white/10 hover:text-foreground"
          >
            <Maximize2 className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}
