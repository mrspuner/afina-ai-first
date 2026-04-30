"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import { motion } from "motion/react";
import Image from "next/image";
import { Mic, Loader2 } from "lucide-react";
import type { PromptInputMessage } from "@/components/ai-elements/prompt-input";
import {
  PromptInput,
  PromptInputButton,
  PromptInputFooter,
  PromptInputHeader,
  PromptInputSubmit,
  PromptInputTools,
  usePromptInputAttachments,
  usePromptInputController,
} from "@/components/ai-elements/prompt-input";
import { ChipEditableInput } from "@/components/ai-elements/chip-editable-input";
import {
  PromptChipsProvider,
  usePromptChips,
} from "@/state/prompt-chips-context";
import { cn } from "@/lib/utils";
import { useAppState, useAppDispatch } from "@/state/app-state-context";
import {
  isOnWelcome,
  isWorkflowView,
  type View,
} from "@/state/app-state";
import { parseStructuralCommands } from "@/state/structural-commands";
import { parseCampaignQuery } from "@/state/parse-campaign-filter";
import { useWelcomeChat } from "@/sections/welcome/welcome-chat-context";
import { OnboardingChatChips } from "@/sections/welcome/onboarding-chat-view";
import { CampaignsPromptChips } from "@/sections/campaigns/campaigns-prompt-chips";
import {
  useTriggerEdit,
  useTriggerEditHost,
} from "@/state/trigger-edit-context";

function AttachmentFileList() {
  const { files } = usePromptInputAttachments();
  if (files.length === 0) return null;
  return (
    <PromptInputHeader>
      {files.map((f) => (
        <div
          key={f.id}
          className="flex items-center gap-1.5 rounded-md border border-border bg-muted px-2.5 py-1 text-xs text-foreground"
        >
          <span className="max-w-[200px] truncate">{f.filename}</span>
        </div>
      ))}
    </PromptInputHeader>
  );
}

/**
 * Mirrors the currently selected workflow node into a chip in the prompt-bar.
 * Backspace-removal of the chip dispatches `workflow_node_deselected` so the
 * canvas selection state stays in sync.
 */
function SelectedNodeChipEffect({
  selected,
}: {
  selected: { id: string; label: string } | null;
}) {
  const dispatch = useAppDispatch();
  const { pushChip, removeChip, chips } = usePromptChips();
  const chipIdRef = useRef<string | null>(null);
  // See TriggerEditChipEffect.hasMaterialisedRef — same render-order race
  // applies to node selection.
  const hasMaterialisedRef = useRef(false);

  useEffect(() => {
    const targetChipId = selected ? `node_${selected.id}` : null;
    if (chipIdRef.current === targetChipId) return;

    if (chipIdRef.current) {
      removeChip(chipIdRef.current);
    }
    if (selected && targetChipId) {
      pushChip({
        id: targetChipId,
        kind: "node",
        label: selected.label,
        payload: selected.id,
        removable: true,
      });
      hasMaterialisedRef.current = false;
    } else {
      hasMaterialisedRef.current = false;
    }
    chipIdRef.current = targetChipId;
  }, [selected, pushChip, removeChip]);

  useEffect(() => {
    if (
      chipIdRef.current &&
      chips.some((c) => c.id === chipIdRef.current)
    ) {
      hasMaterialisedRef.current = true;
    }
  }, [chips]);

  // Backspace removed the chip — sync canvas selection back to "none".
  useEffect(() => {
    if (
      hasMaterialisedRef.current &&
      selected &&
      chipIdRef.current &&
      !chips.some((c) => c.id === chipIdRef.current)
    ) {
      dispatch({ type: "workflow_node_deselected" });
      chipIdRef.current = null;
      hasMaterialisedRef.current = false;
    }
  }, [chips, selected, dispatch]);

  return null;
}

/**
 * Generic chip cleanup: clears all chips when the top-level view kind changes.
 * Replaces the previous ClearOnLeaveWorkflowEffect (which scrubbed @-text out
 * of the textarea on workflow exit) — chips are now the structured carrier of
 * cross-view context, so per-view text scrubbing is no longer needed.
 */
function ClearChipsOnViewChangeEffect({
  viewKind,
}: {
  viewKind: View["kind"];
}) {
  const { clearChips } = usePromptChips();
  const prevKind = useRef<View["kind"] | null>(null);
  useEffect(() => {
    if (prevKind.current && prevKind.current !== viewKind) {
      clearChips();
    }
    prevKind.current = viewKind;
  }, [viewKind, clearChips]);
  return null;
}

/**
 * Swaps the prompt-bar text whenever the user switches between selected
 * triggers in Step 2. Saves the current draft against the previously active
 * trigger before loading the new one. No-op when no edit is active.
 */
function TriggerEditDraftSwap() {
  const triggerEdit = useTriggerEdit();
  const { textInput } = usePromptInputController();
  const prevId = useRef<string | null>(null);

  useEffect(() => {
    if (!triggerEdit) return;
    const currentId = triggerEdit.active?.id ?? null;
    if (currentId === prevId.current) return;
    // Save outgoing draft.
    if (prevId.current) {
      triggerEdit.saveDraft(prevId.current, textInput.value);
    }
    // Load incoming draft (or clear if leaving edit mode).
    if (currentId) {
      const next = triggerEdit.getDraft(currentId);
      textInput.setInput(next);
    } else if (prevId.current) {
      textInput.setInput("");
    }
    prevId.current = currentId;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [triggerEdit?.active?.id]);

  return null;
}

/**
 * Mirrors the active trigger into a single chip in the prompt-bar. When the
 * user removes the chip via Backspace, the trigger is deselected so step-2's
 * card UI stays in sync.
 */
function TriggerEditChipEffect() {
  const triggerEdit = useTriggerEdit();
  const host = useTriggerEditHost();
  const { pushChip, removeChip, chips } = usePromptChips();
  const chipIdRef = useRef<string | null>(null);
  // Guards the deselect-on-removal effect against a render-order race: when
  // we've just pushChip'd a chip, the dispatched update isn't visible in
  // `chips` until the next render. Without this flag the deselect effect
  // would fire immediately, see chips=[], assume "Backspace happened" and
  // wipe the active trigger — the visible bug was: first click pushes the
  // chip but the hint never shows because we already snapped active=null.
  const hasMaterialisedRef = useRef(false);

  useEffect(() => {
    const targetChipId = triggerEdit?.active
      ? `trigger_${triggerEdit.active.id}`
      : null;

    if (chipIdRef.current === targetChipId) return;

    if (chipIdRef.current) {
      removeChip(chipIdRef.current);
    }
    if (triggerEdit?.active && targetChipId) {
      pushChip({
        id: targetChipId,
        kind: "trigger",
        label: triggerEdit.active.label,
        payload: triggerEdit.active.id,
        removable: true,
      });
      hasMaterialisedRef.current = false;
    } else {
      hasMaterialisedRef.current = false;
    }
    chipIdRef.current = targetChipId;
  }, [triggerEdit?.active, pushChip, removeChip]);

  // Latch "the chip we asked for is now in chips state". Only after this can
  // the deselect-on-removal effect treat its absence as a real removal.
  useEffect(() => {
    if (
      chipIdRef.current &&
      chips.some((c) => c.id === chipIdRef.current)
    ) {
      hasMaterialisedRef.current = true;
    }
  }, [chips]);

  // Backspace removed the chip → mirror that into step-2's selection.
  useEffect(() => {
    if (
      hasMaterialisedRef.current &&
      triggerEdit?.active &&
      chipIdRef.current &&
      !chips.some((c) => c.id === chipIdRef.current)
    ) {
      host.setActive(null);
      chipIdRef.current = null;
      hasMaterialisedRef.current = false;
    }
  }, [chips, triggerEdit?.active, host]);

  return null;
}

export function ShellBottomBar() {
  // The chip provider must wrap everything that calls usePromptChips —
  // the bar body, its child effects (SelectedNodeChipEffect, the trigger
  // chip mirror) and the chip-row inside the input. Splitting the body
  // out keeps the hook order stable on remount.
  return (
    <PromptChipsProvider>
      <ShellBottomBarBody />
    </PromptChipsProvider>
  );
}

function ShellBottomBarBody() {
  const state = useAppState();
  const dispatch = useAppDispatch();
  const { view, selectedWorkflowNode } = state;
  const welcomeChat = useWelcomeChat();
  const triggerEdit = useTriggerEdit();
  const chipsApi = usePromptChips();

  function handlePromptSubmit(message: PromptInputMessage) {
    const rawText = message.text ?? "";

    // Trigger-edit mode: when Step 2 has an active trigger, all prompt-bar
    // submissions go through the trigger-edit pipeline (regex parser).
    if (triggerEdit?.active) {
      // Fire-and-forget — the host clears its own UI state. The PromptInput
      // textarea is cleared by the form's submit handler regardless.
      void triggerEdit.submit(rawText);
      return;
    }

    if (isOnWelcome(state)) {
      welcomeChat?.submitFreeText(rawText);
      return;
    }

    if (view.kind === "section" && view.name === "Кампании") {
      const { statuses, sort } = parseCampaignQuery(rawText);
      if (statuses.length > 0 || sort !== "default") {
        dispatch({ type: "campaigns_query_set", statuses, sort });
      }
      return;
    }

    if (view.kind !== "workflow" || view.launched) return;

    const structural = parseStructuralCommands(rawText);
    // Node-targeted commands now come from chips: each `node` chip pairs with
    // the user's free text. Multiple node chips share the same instruction.
    const nodeChips = chipsApi.chips.filter((c) => c.kind === "node");
    const trimmedText = rawText.trim();
    const nodeCommands =
      nodeChips.length > 0 && trimmedText.length > 0
        ? nodeChips.map((c) => ({ nodeLabel: c.label, text: trimmedText }))
        : [];

    if (structural.ops.length > 0) {
      dispatch({
        type: "workflow_structural_commands_submit",
        ops: structural.ops,
      });
    }
    if (nodeCommands.length > 0) {
      dispatch({
        type: "workflow_node_command_submit",
        commands: nodeCommands,
      });
      chipsApi.clearChips();
    }
    if (
      structural.ops.length === 0 &&
      nodeCommands.length === 0 &&
      trimmedText
    ) {
      dispatch({ type: "workflow_command_submit", text: rawText });
    }

    // AI reply (both for tag-segments and structural ops) is emitted by
    // WorkflowView at the end of the unified "Думаю..." cycle so the user
    // sees the thinking animation before the result.
  }

  const chatPlaceholder =
    triggerEdit?.active ? "добавь d1.ru, d2.ru   или   исключи d3.ru" :
    isOnWelcome(state) ? "Задайте вопрос…" :
    isWorkflowView(state) ? "Опишите изменение сценария..." :
    view.kind === "campaign-select" ? "Опишите вашу кампанию..." :
    view.kind === "guided-signal" ? "Введите ваши параметры или задайте вопрос" :
    view.kind === "section" && (view.name === "Сигналы" || view.name === "Кампании") ? "Напишите, что вы хотите сделать" :
    "Выберите шаг или задайте вопрос…";

  const isWorkflow = isWorkflowView(state);
  const onWelcome = isOnWelcome(state);
  // Pin near bottom on welcome, section views (Сигналы / Кампании /
  // Статистика) and workflow. Transient wizard steps (guided-signal,
  // awaiting-campaign, campaign-select) keep the 3% offset so they don't
  // cover the step's primary CTA.
  const pinnedToBottom = isWorkflow || view.kind === "section" || onWelcome;
  const floatBottom = pinnedToBottom ? "20px" : "3%";

  const barRef = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const el = barRef.current;
    if (!el) return;
    const apply = () => {
      const h = el.getBoundingClientRect().height;
      document.documentElement.style.setProperty("--promptbar-height", `${Math.round(h)}px`);
    };
    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(el);
    return () => {
      ro.disconnect();
      document.documentElement.style.removeProperty("--promptbar-height");
    };
  }, [view.kind]);

  return (
    <>
      <SelectedNodeChipEffect selected={selectedWorkflowNode} />
      <ClearChipsOnViewChangeEffect viewKind={view.kind} />
      <TriggerEditDraftSwap />
      <TriggerEditChipEffect />
      <motion.div
        ref={barRef}
        className="fixed left-[120px] right-0 z-30 flex justify-center px-6"
        initial={false}
        animate={{ bottom: floatBottom }}
        transition={{ duration: 0.55, ease: [0.32, 0.72, 0, 1] }}
      >
        <div
          className={cn(
            "flex w-full max-w-[720px] flex-col gap-3 rounded-[34px] p-6",
            // Outer frosted card (Figma node 18750:213937): dark translucent
            // panel with a subtle 2px backdrop blur — no outer shadow, the
            // "solidity" comes from the inner InputGroup's 17px/9px halo.
            "bg-[rgba(10,10,10,0.75)] backdrop-blur-[2px]"
          )}
        >
          {/* Active-trigger banner: explains what the chip in the prompt-bar
              represents and what commands the user can run. The mascot icon
              lives here (not on the chip itself) so the chip stays a clean,
              text-only inline pill that doesn't confuse contenteditable. */}
          {triggerEdit?.active && (
            <div
              data-testid="trigger-edit-hint"
              className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/80"
            >
              {triggerEdit.processing ? (
                <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-primary" />
              ) : (
                <Image
                  src="/mascot-icon.svg"
                  alt=""
                  width={16}
                  height={16}
                  className="shrink-0"
                  aria-hidden
                />
              )}
              <span className="leading-snug">
                Напишите, какие сайты добавить или исключить.
              </span>
            </div>
          )}
          {triggerEdit?.hintMessage && (
            <div
              data-testid="trigger-edit-error"
              className="rounded-lg border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-xs text-amber-100"
            >
              {triggerEdit.hintMessage}
            </div>
          )}
          <PromptInput
            onSubmit={handlePromptSubmit}
            // `className` lands on the <form>, but the visual wrapper is the
            // inner <InputGroup data-slot="input-group">. Override the
            // shadcn defaults (border-input, dark:bg-input/30, rounded-lg)
            // via a descendant selector so the PromptBar matches the Figma:
            //   bg rgba(255,255,255,0.05) + border rgba(255,255,255,0.15)
            //   rounded-[10px] + backdrop-blur-[14.8px] + soft dark halo.
            className={cn(
              "[&_[data-slot=input-group]]:rounded-[10px]!",
              "[&_[data-slot=input-group]]:border!",
              "[&_[data-slot=input-group]]:border-white/15!",
              "[&_[data-slot=input-group]]:bg-white/5!",
              "dark:[&_[data-slot=input-group]]:bg-white/5!",
              "[&_[data-slot=input-group]]:backdrop-blur-[14.8px]",
              "[&_[data-slot=input-group]]:shadow-[0_0_17px_9px_rgba(0,0,0,0.19)]"
            )}
          >
            <AttachmentFileList />
            <ChipEditableInput
              className="px-3 py-2"
              placeholder={chatPlaceholder}
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
          {onWelcome && welcomeChat && (
            <OnboardingChatChips
              chips={welcomeChat.chips}
              onChipClick={welcomeChat.submitChip}
            />
          )}
          {view.kind === "section" && view.name === "Кампании" && (
            <CampaignsPromptChips
              onChipClick={(text) => {
                const { statuses, sort } = parseCampaignQuery(text);
                if (statuses.length > 0 || sort !== "default") {
                  dispatch({ type: "campaigns_query_set", statuses, sort });
                }
              }}
            />
          )}
        </div>
      </motion.div>
    </>
  );
}
