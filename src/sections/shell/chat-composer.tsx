"use client";

import { useRef } from "react";
import { Mic } from "lucide-react";
import {
  PromptInput,
  PromptInputButton,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTools,
  type PromptInputMessage,
} from "@/components/ai-elements/prompt-input";
import {
  ChipEditableInput,
  type ChipEditableInputHandle,
} from "@/components/ai-elements/chip-editable-input";
import type { ChipSegment } from "@/state/prompt-chips-context";
import { usePromptChips } from "@/state/prompt-chips-context";
import { cn } from "@/lib/utils";

export interface ChatComposerSubmitPayload {
  text: string;
  segments: ChipSegment[];
}

interface ChatComposerProps {
  placeholder: string;
  onSubmit: (payload: ChatComposerSubmitPayload) => void;
}

export function ChatComposer({ placeholder, onSubmit }: ChatComposerProps) {
  const editorRef = useRef<ChipEditableInputHandle>(null);
  const { clearChips } = usePromptChips();

  function handleSubmit(message: PromptInputMessage) {
    const text = (message.text ?? "").trim();
    const segments = editorRef.current?.getSegments() ?? [];
    if (!text && segments.length === 0) return;
    onSubmit({ text, segments });
    editorRef.current?.clear();
    clearChips();
  }

  return (
    <PromptInput
      onSubmit={handleSubmit}
      className={cn(
        "[&_[data-slot=input-group]]:rounded-[10px]!",
        "[&_[data-slot=input-group]]:border!",
        "[&_[data-slot=input-group]]:border-white/10!",
        "[&_[data-slot=input-group]]:bg-[#171717]!",
        "dark:[&_[data-slot=input-group]]:bg-[#171717]!"
      )}
    >
      <ChipEditableInput
        ref={editorRef}
        className="px-3 py-2"
        placeholder={placeholder}
      />
      <PromptInputFooter>
        <PromptInputTools>
          <PromptInputButton tooltip="Голосовой ввод">
            <Mic className="h-4 w-4" />
          </PromptInputButton>
        </PromptInputTools>
        <PromptInputSubmit />
      </PromptInputFooter>
    </PromptInput>
  );
}
