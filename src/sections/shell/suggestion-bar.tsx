"use client";

import { AnimatePresence, motion } from "motion/react";
import { Suggestion, Suggestions } from "@/components/ai-elements/suggestion";
import { useDraftQueue } from "@/state/draft-queue-context";
import { selectSuggestionState } from "@/state/suggestion-state";
import { getSuggestionsForTag } from "@/state/suggestion-catalog";
import { APPLY_ALL_COMMAND } from "@/state/prompt-bar-enter";
import { isNodeTagPayload, type PromptChip } from "@/state/prompt-chips-context";

interface SuggestionBarProps {
  /** Активный тег в инпуте, либо null. */
  activeTag: PromptChip | null;
  /** После тега уже что-то напечатано. */
  hasTypedText: boolean;
  /** Welcome-экран — состояние 1 (общие подсказки) разрешено. */
  isWelcome: boolean;
  /** Welcome-подсказки (рендерятся как есть, состояние 1). */
  welcomeSlot?: React.ReactNode;
  /** Клик по контекстной подсказке → вставить fullText в инпут после тега. */
  onPickSuggestion: (fullText: string) => void;
  /** Клик по «Применить все изменения» → подставить команду в инпут. */
  onPickApplyAll: () => void;
}

const ZONE_TRANSITION = { duration: 0.24, ease: [0.23, 1, 0.32, 1] } as const;

/**
 * Зона подсказок под промпт-баром (M6). Состояние выбирается чистой
 * selectSuggestionState; смена состояний — плавная opacity/transform-анимация.
 */
export function SuggestionBar({
  activeTag,
  hasTypedText,
  isWelcome,
  welcomeSlot,
  onPickSuggestion,
  onPickApplyAll,
}: SuggestionBarProps) {
  const { drafts } = useDraftQueue();

  const state = selectSuggestionState({
    hasActiveTag: activeTag !== null,
    activeTagTypedText: hasTypedText,
    queueLength: drafts.length,
    isWelcome,
  });

  return (
    <AnimatePresence mode="wait" initial={false}>
      {state.kind === "welcome" && welcomeSlot && (
        <motion.div
          key="sg-welcome"
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={ZONE_TRANSITION}
        >
          {welcomeSlot}
        </motion.div>
      )}

      {state.kind === "context" && activeTag && (
        <motion.div
          key="sg-context"
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={ZONE_TRANSITION}
        >
          <Suggestions>
            {contextSuggestions(activeTag).map((item) => (
              <Suggestion
                key={item.label}
                suggestion={item.label}
                onClick={() => onPickSuggestion(item.fullText)}
                className="border-white/10 bg-[#171717] text-white hover:bg-[#1f1f1f]"
              />
            ))}
          </Suggestions>
        </motion.div>
      )}

      {state.kind === "apply-all" && (
        <motion.div
          key="sg-apply-all"
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={ZONE_TRANSITION}
          className="flex justify-start"
        >
          <Suggestion
            suggestion={APPLY_ALL_COMMAND}
            onClick={onPickApplyAll}
            className="border-[var(--color-brand)]/50 bg-[var(--color-brand)]/10 text-[var(--color-brand)] hover:bg-[var(--color-brand)]/15"
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** Контекстные подсказки активного тега по его NodeTagPayload. */
function contextSuggestions(tag: PromptChip) {
  if (isNodeTagPayload(tag.payload)) {
    return getSuggestionsForTag(tag.payload.nodeType, tag.payload.paramLabel);
  }
  return getSuggestionsForTag("default", tag.label);
}
