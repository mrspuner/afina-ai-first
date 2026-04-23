"use client";

import { AnimatePresence, motion } from "motion/react";
import { cn } from "@/lib/utils";
import type { Chip, Msg } from "./onboarding-chat";

const BUBBLE_EASE = [0.32, 0.72, 0, 1] as const;
const CONTENT_EASE = [0.23, 1, 0.32, 1] as const;
// Gentle ease-out — used for the bubble's width/height expansion from
// dots-pending to the full-text state. Softer than BUBBLE_EASE so the
// resize reads as a breath, not a flick.
const SOFT_EASE = [0.22, 1, 0.36, 1] as const;

function ThinkingDots() {
  return (
    <span className="flex h-5 items-center gap-1.5">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="block h-2 w-2 rounded-full bg-muted-foreground"
          animate={{ y: [0, -3, 0], opacity: [0.3, 1, 0.3] }}
          transition={{
            duration: 0.72,
            repeat: Infinity,
            ease: "easeInOut",
            delay: i * 0.12,
          }}
        />
      ))}
    </span>
  );
}

function BotBubble({ msg }: { msg: Msg }) {
  // `layout="size"` animates only the bubble's width/height — it won't
  // try to reposition itself when new bubbles are appended below it,
  // which was causing the "messages overlap for a frame" glitch.
  //
  // `min-w-[280px]` keeps the pending-state bubble close to its final
  // width, so the dots→text expansion is a gentle widen, not a 16×
  // scale-up. Our replies are all paragraphs, so min-width never
  // constrains a shorter message into awkward whitespace.
  return (
    <motion.div
      layout="size"
      transition={{
        layout: { duration: 0.55, ease: SOFT_EASE },
      }}
      className="max-w-[85%] min-w-[280px] overflow-hidden rounded-xl border border-border bg-card/95 px-4 py-3 text-foreground shadow-sm"
    >
      <AnimatePresence mode="wait" initial={false}>
        {msg.pending ? (
          <motion.div
            key="pending"
            initial={{ opacity: 0, y: 2, filter: "blur(3px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: -4, filter: "blur(4px)" }}
            transition={{ duration: 0.24, ease: CONTENT_EASE }}
          >
            <ThinkingDots />
          </motion.div>
        ) : (
          <motion.div
            key="text"
            initial={{ opacity: 0, y: 4, filter: "blur(3px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ duration: 0.52, ease: SOFT_EASE }}
          >
            <span className="whitespace-pre-line text-sm">{msg.text}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export function OnboardingChatHistory({ history }: { history: Msg[] }) {
  if (history.length === 0) return null;
  return (
    <div className="flex w-full flex-col gap-2">
      <AnimatePresence initial={false}>
        {history.map((m) => (
          <motion.div
            key={m.id}
            initial={{ y: 24, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.36, ease: BUBBLE_EASE }}
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
            initial={{ y: 6, opacity: 0, scale: 0.96 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: -6, opacity: 0, scale: 0.96 }}
            transition={{
              duration: 0.26,
              ease: CONTENT_EASE,
              delay: i * 0.04,
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
