"use client";

import { AnimatePresence, motion } from "motion/react";
import { useTypewriter } from "@/hooks/use-typewriter";
import { cn } from "@/lib/utils";
import type { Chip, Msg } from "./onboarding-chat";

function BotBubble({ text, animate }: { text: string; animate: boolean }) {
  // Typewriter runs once on mount (useEffect deps [text, speed]). Older
  // messages whose animate prop is false render the full text statically.
  const { displayed } = useTypewriter(animate ? text : "", 14);
  const content = animate ? displayed : text;
  return (
    <div className="rounded-xl border border-border bg-card/95 px-4 py-3 text-foreground shadow-sm">
      <span className="whitespace-pre-line text-sm">{content}</span>
      {animate && displayed.length < text.length && (
        <span className="ml-0.5 inline-block h-3.5 w-[2px] translate-y-[2px] animate-pulse bg-muted-foreground" />
      )}
    </div>
  );
}

function ThinkingBubble() {
  return (
    <div className="flex justify-start">
      <div className="flex items-center gap-1.5 rounded-xl border border-border bg-card/95 px-4 py-3 text-muted-foreground">
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.3s]" />
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.15s]" />
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground" />
      </div>
    </div>
  );
}

export function OnboardingChatHistory({
  history,
  thinking,
}: {
  history: Msg[];
  thinking: boolean;
}) {
  if (history.length === 0 && !thinking) return null;

  // Index of the last bot message — only it gets the typewriter effect on mount.
  let lastBotIdx = -1;
  for (let i = history.length - 1; i >= 0; i--) {
    if (history[i].role === "bot") {
      lastBotIdx = i;
      break;
    }
  }

  return (
    <div className="flex w-full flex-col gap-2">
      <AnimatePresence initial={false}>
        {history.map((m, i) => (
          <motion.div
            key={m.id}
            initial={{ y: 8, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.22, ease: [0.32, 0.72, 0, 1] }}
            className={cn(
              "flex",
              m.role === "user" ? "justify-end" : "justify-start"
            )}
          >
            {m.role === "user" ? (
              <div className="max-w-[85%] whitespace-pre-line rounded-xl bg-muted px-3 py-2 text-sm text-foreground">
                {m.text}
              </div>
            ) : (
              <div className="max-w-[85%]">
                <BotBubble text={m.text} animate={i === lastBotIdx} />
              </div>
            )}
          </motion.div>
        ))}
        {thinking && (
          <motion.div
            key="thinking"
            initial={{ y: 8, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 4, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <ThinkingBubble />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function OnboardingChatChips({
  chips,
  onChipClick,
}: {
  chips: Chip[];
  onChipClick: (chip: Chip) => void;
}) {
  if (chips.length === 0) return null;
  return (
    <div className="flex flex-wrap justify-start gap-2">
      {chips.map((c) => (
        <button
          key={c.id}
          type="button"
          onClick={() => onChipClick(c)}
          className="rounded-full border border-white/10 bg-[#171717] px-[13px] py-[7px] text-[12px] text-white transition-colors hover:bg-[#1f1f1f]"
        >
          {c.label}
        </button>
      ))}
    </div>
  );
}
