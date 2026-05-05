// src/sections/shell/chat-panel-header.tsx
"use client";

import { Maximize2, X } from "lucide-react";
import type { ChatPanelMode } from "@/state/chat-context";

interface ChatPanelHeaderProps {
  mode: ChatPanelMode;
  onOpenSidebar: () => void;
  onCloseSidebar: () => void;
}

export function ChatPanelHeader({ mode, onOpenSidebar, onCloseSidebar }: ChatPanelHeaderProps) {
  const inSidebar = mode === "sidebar";
  return (
    <div className="flex w-full items-center justify-between px-1 py-0.5">
      <span className="text-xs font-medium text-muted-foreground">Работа с ИИ</span>
      <div className="flex items-center">
        {inSidebar ? (
          <button
            type="button"
            onClick={onCloseSidebar}
            aria-label="Закрыть drawer"
            className="inline-flex h-7 w-7 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-white/10 hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        ) : (
          <button
            type="button"
            onClick={onOpenSidebar}
            aria-label="Открыть в drawer"
            className="inline-flex h-7 w-7 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-white/10 hover:text-foreground"
          >
            <Maximize2 className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}
