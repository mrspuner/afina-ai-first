"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Image from "next/image";
import { Loader2, Send } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  parseTriggerCommand,
  type ParsedTriggerCommand,
} from "@/lib/trigger-edit-parser";
import { mockReplyFor } from "@/lib/mock-ai-reply";
import { useChat } from "@/state/chat-context";
import { cn } from "@/lib/utils";

export interface TriggerConfigurePopoverProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  triggerLabel: string;
  /** Apply the parsed (non-fallback) command to the trigger's delta. */
  onApply: (parsed: Exclude<ParsedTriggerCommand, { kind: "fallback" }>) => void;
  /** Briefly highlight the trigger card while the simulated AI tick runs. */
  onHighlightStart: () => void;
  onHighlightEnd: () => void;
  children: ReactNode; // the «Настроить» button
}

const PROCESSING_DELAY_MS = 350;
const HIGHLIGHT_FADE_MS = 600;

export function TriggerConfigurePopover({
  open,
  onOpenChange,
  triggerLabel,
  onApply,
  onHighlightStart,
  onHighlightEnd,
  children,
}: TriggerConfigurePopoverProps) {
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const chat = useChat();

  // Always open with empty input — drafts are not persisted.
  useEffect(() => {
    if (!open) {
      setText("");
      setError(null);
      setProcessing(false);
    } else {
      // Focus the input after the popover mounts.
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  async function handleSubmit() {
    const raw = text.trim();
    if (!raw || processing) return;

    const parsed = parseTriggerCommand(raw);
    if (parsed.kind === "fallback") {
      setError(parsed.message);
      return;
    }

    setError(null);
    chat.append({ role: "user", text: raw, triggerLabel });
    const assistantId = chat.append({ role: "assistant", text: "", pending: true });

    setProcessing(true);
    onHighlightStart();
    await new Promise((r) => setTimeout(r, PROCESSING_DELAY_MS));

    onApply(parsed);
    chat.updatePending(assistantId, mockReplyFor(parsed));
    setProcessing(false);
    window.setTimeout(onHighlightEnd, HIGHLIGHT_FADE_MS);

    setText("");
    onOpenChange(false);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSubmit();
    }
  }

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger render={children as React.ReactElement} />
      <PopoverContent
        side="top"
        align="end"
        sideOffset={8}
        className={cn(
          "w-[320px] rounded-lg border border-primary/40 bg-[rgba(10,10,10,0.95)] p-3 shadow-lg backdrop-blur-[8px]"
        )}
      >
        <div className="flex flex-col gap-2">
          <textarea
            ref={inputRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Напишите что хотите изменить в интересе"
            rows={3}
            className="w-full resize-none rounded-md border border-white/10 bg-white/5 px-2.5 py-2 text-sm text-foreground/95 placeholder:text-muted-foreground focus:border-primary/50 focus:outline-none"
          />
          {error && (
            <p className="rounded border border-amber-400/30 bg-amber-400/10 px-2 py-1 text-xs text-amber-100">
              {error}
            </p>
          )}
          <div className="flex items-center justify-between">
            <Image
              src="/mascot-icon.svg"
              alt=""
              width={16}
              height={16}
              aria-hidden
              className="opacity-60"
            />
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!text.trim() || processing}
              className={cn(
                "inline-flex h-7 w-7 items-center justify-center rounded-md text-foreground transition-colors",
                "bg-primary/90 text-primary-foreground hover:bg-primary disabled:bg-white/10 disabled:text-muted-foreground"
              )}
              aria-label="Применить"
            >
              {processing ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Send className="h-3.5 w-3.5" />
              )}
            </button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
