"use client";

import { AnimatePresence, motion } from "motion/react";
import { cn } from "@/lib/utils";
import type { Chip, Msg } from "./onboarding-chat";

export function OnboardingChatView({
  history,
  chips,
  onChipClick,
}: {
  history: Msg[];
  chips: Chip[];
  onChipClick: (chip: Chip) => void;
}) {
  return (
    <div className="flex w-full flex-col gap-4">
      {history.length > 0 && (
        <div className="flex flex-col gap-2">
          <AnimatePresence initial={false}>
            {history.map((m, i) => (
              <motion.div
                key={i}
                initial={{ y: 8, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.22, ease: [0.32, 0.72, 0, 1] }}
                className={cn(
                  "flex",
                  m.role === "user" ? "justify-end" : "justify-start"
                )}
              >
                <div
                  className={cn(
                    "max-w-[85%] whitespace-pre-line text-sm",
                    m.role === "user"
                      ? "rounded-xl bg-muted px-3 py-2 text-foreground"
                      : "rounded-xl border border-border bg-card/95 px-4 py-3 text-foreground shadow-sm"
                  )}
                >
                  {m.text}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {chips.length > 0 && (
        <div className="flex flex-wrap justify-center gap-2">
          {chips.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => onChipClick(c)}
              className="rounded-full border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              {c.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
