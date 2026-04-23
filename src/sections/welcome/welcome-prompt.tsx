"use client";

import { useEffect, useRef } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Sparkles, X } from "lucide-react";
import {
  PromptInput,
  PromptInputBody,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
  usePromptInputController,
} from "@/components/ai-elements/prompt-input";
import type { PromptInputMessage } from "@/components/ai-elements/prompt-input";
import { useAppDispatch, useAppState } from "@/state/app-state-context";
import { HINTS, scriptReply } from "./onboarding-scripts";

function HintChips({ onPick }: { onPick: (text: string) => void }) {
  return (
    <div className="flex flex-wrap justify-center gap-2 px-1">
      {HINTS.map((h) => (
        <button
          key={h.id}
          type="button"
          onClick={() => onPick(h.label)}
          className="rounded-full border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          {h.label}
        </button>
      ))}
    </div>
  );
}

export function WelcomePrompt() {
  const state = useAppState();
  const dispatch = useAppDispatch();
  const controller = usePromptInputController();

  const showHints =
    state.signals.length === 0 && state.campaigns.length === 0;

  const didClear = useRef(false);
  useEffect(() => {
    if (!didClear.current) {
      controller.textInput.clear();
      didClear.current = true;
    }
  }, [controller]);

  function runPrompt(text: string) {
    const trimmed = text.trim();
    if (!trimmed) return;
    dispatch({ type: "ai_reply_shown", text: scriptReply(trimmed) });
    controller.textInput.clear();
  }

  function handleSubmit(message: PromptInputMessage) {
    runPrompt(message.text ?? "");
  }

  function handleChipClick(label: string) {
    controller.textInput.setInput(label);
    runPrompt(label);
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-3">
      <AnimatePresence>
        {state.aiReply && (
          <motion.div
            key="welcome-ai-reply"
            initial={{ y: 6, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 6, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.32, 0.72, 0, 1] }}
            className="flex items-start gap-3 rounded-xl border border-border bg-card/95 px-4 py-3 shadow-sm"
          >
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
              <Sparkles className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground/80">
                AI
              </p>
              <p className="mt-0.5 text-sm text-foreground">{state.aiReply}</p>
            </div>
            <button
              type="button"
              aria-label="Закрыть ответ AI"
              onClick={() => dispatch({ type: "ai_reply_dismissed" })}
              className="rounded-md p-1 text-muted-foreground opacity-70 hover:bg-accent hover:text-foreground hover:opacity-100"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Оболочка с маржинами: контейнер чуть шире PromptInput */}
      <div className="px-3">
        <PromptInput onSubmit={handleSubmit}>
          <PromptInputBody>
            <PromptInputTextarea placeholder="Задайте вопрос…" />
          </PromptInputBody>
          <PromptInputFooter>
            <PromptInputTools />
            <PromptInputSubmit />
          </PromptInputFooter>
        </PromptInput>
      </div>

      {showHints && <HintChips onPick={handleChipClick} />}
    </div>
  );
}
