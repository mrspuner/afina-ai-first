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
import { cn } from "@/lib/utils";

interface ChatComposerProps {
  placeholder: string;
  onSubmit: (text: string) => void;
}

export function ChatComposer({ placeholder, onSubmit }: ChatComposerProps) {
  const editorRef = useRef<ChipEditableInputHandle>(null);

  function handleSubmit(message: PromptInputMessage) {
    const text = (message.text ?? "").trim();
    if (!text) return;
    onSubmit(text);
    editorRef.current?.clear();
  }

  return (
    <PromptInput
      onSubmit={handleSubmit}
      className={cn(
        // Opaque dark surface so the yellow header tint does not seep through.
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
