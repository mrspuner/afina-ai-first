"use client";

import { AnimatePresence, motion } from "motion/react";
import { X } from "lucide-react";
import { useDraftQueue, type Draft } from "@/state/draft-queue-context";
import { isNodeTagPayload } from "@/state/prompt-chips-context";

interface DraftQueueListProps {
  /** Клик по карточке → вернуть черновик в инпут (передаётся из композера). */
  onTakeDraft: (draft: Draft) => void;
  /** "compact" — над свёрнутым баром; "drawer" — внутри дровера. */
  variant?: "compact" | "drawer";
}

/**
 * Очередь черновиков. Один источник данных (useDraftQueue), два представления:
 * над свёрнутым баром (PromptBar.slot) и внутри ChatDrawer.
 * Карточка = тег (окрашенный) + текст черновика. Клик по карточке возвращает
 * черновик в инпут; ✕ выбрасывает черновик.
 */
export function DraftQueueList({ onTakeDraft, variant = "compact" }: DraftQueueListProps) {
  const { drafts, removeDraft } = useDraftQueue();
  if (drafts.length === 0) return null;

  return (
    <div className="flex flex-col gap-1.5">
      <AnimatePresence initial={false}>
        {drafts.map((draft) => {
          const payload = draft.chip.payload;
          const color = isNodeTagPayload(payload) ? payload.color : "#a3a3a3";
          return (
            <motion.div
              key={draft.id}
              layout
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.26, ease: [0.23, 1, 0.32, 1] }}
              className="group flex items-start gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-2"
            >
              <button
                type="button"
                onClick={() => onTakeDraft(draft)}
                className="flex min-w-0 flex-1 items-start gap-2 text-left"
              >
                <span
                  className="mt-0.5 shrink-0 rounded-md border px-1.5 py-0.5 text-[11px] font-medium"
                  style={{
                    borderColor: `${color}66`,
                    backgroundColor: `${color}1f`,
                    color,
                  }}
                >
                  {draft.chip.label}
                </span>
                <span className="min-w-0 flex-1 truncate pt-0.5 text-xs text-white/80">
                  {draft.text}
                </span>
              </button>
              <button
                type="button"
                aria-label="Выбросить черновик"
                onClick={() => removeDraft(draft.id)}
                className="mt-0.5 shrink-0 rounded p-0.5 text-muted-foreground opacity-60 transition-opacity hover:opacity-100 hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
      {variant === "drawer" && drafts.length > 0 && (
        <span className="px-1 pt-0.5 text-[10px] text-muted-foreground">
          Черновиков в очереди: {drafts.length}
        </span>
      )}
    </div>
  );
}
