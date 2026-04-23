"use client";

import { AnimatePresence, motion } from "motion/react";
import { cn } from "@/lib/utils";
import type { Chip, Msg } from "./onboarding-chat";

const BUBBLE_EASE = [0.32, 0.72, 0, 1] as const;
const CONTENT_EASE = [0.23, 1, 0.32, 1] as const;

function ThinkingDots() {
  return (
    <span className="flex h-5 items-center gap-1.5">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="block h-1.5 w-1.5 rounded-full bg-muted-foreground"
          animate={{ y: [0, -2, 0], opacity: [0.4, 0.95, 0.4] }}
          transition={{
            duration: 0.95,
            repeat: Infinity,
            ease: "easeInOut",
            delay: i * 0.14,
          }}
        />
      ))}
    </span>
  );
}

function BotBubble({ msg }: { msg: Msg }) {
  // Single bubble container: slides in once. Inside, we crossfade between
  // the thinking dots and the resolved text using a blur mask — a visual
  // bridge that reads as "the bubble thought, then spoke", not as two
  // separate elements swapping.
  return (
    <div className="max-w-[85%] rounded-xl border border-border bg-card/95 px-4 py-3 text-foreground shadow-sm">
      <AnimatePresence mode="wait" initial={false}>
        {msg.pending ? (
          <motion.div
            key="pending"
            initial={{ opacity: 0, filter: "blur(3px)" }}
            animate={{ opacity: 1, filter: "blur(0px)" }}
            exit={{ opacity: 0, filter: "blur(3px)" }}
            transition={{ duration: 0.18, ease: CONTENT_EASE }}
          >
            <ThinkingDots />
          </motion.div>
        ) : (
          <motion.div
            key="text"
            initial={{ opacity: 0, filter: "blur(3px)" }}
            animate={{ opacity: 1, filter: "blur(0px)" }}
            transition={{ duration: 0.26, ease: CONTENT_EASE }}
          >
            <span className="whitespace-pre-line text-sm">{msg.text}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function OnboardingChatHistory({ history }: { history: Msg[] }) {
  if (history.length === 0) return null;
  return (
    <div className="flex w-full flex-col gap-2">
      <AnimatePresence initial={false}>
        {history.map((m) => (
          <motion.div
            layout
            key={m.id}
            initial={{ y: 8, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            transition={{ duration: 0.24, ease: BUBBLE_EASE }}
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
              <BotBubble msg={m} />
            )}
          </motion.div>
        ))}
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
  return (
    <div className="flex min-h-[30px] flex-wrap justify-start gap-2">
      <AnimatePresence initial={false} mode="popLayout">
        {chips.map((c, i) => (
          <motion.button
            key={c.id}
            layout
            type="button"
            onClick={() => onChipClick(c)}
            initial={{ y: 4, opacity: 0, scale: 0.96 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: -4, opacity: 0, scale: 0.96 }}
            transition={{
              duration: 0.22,
              ease: CONTENT_EASE,
              delay: i * 0.035,
            }}
            whileTap={{ scale: 0.97 }}
            className="rounded-full border border-white/10 bg-[#171717] px-[13px] py-[7px] text-[12px] text-white transition-colors duration-150 ease-out hover:bg-[#1f1f1f]"
          >
            {c.label}
          </motion.button>
        ))}
      </AnimatePresence>
    </div>
  );
}
