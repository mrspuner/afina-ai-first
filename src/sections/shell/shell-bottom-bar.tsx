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
} from "@/components/ai-elements/prompt-input";
import {
  ChipEditableInput,
  type ChipEditableInputHandle,
} from "@/components/ai-elements/chip-editable-input";
import { usePromptChips } from "@/state/prompt-chips-context";
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
import { useTriggerEdit } from "@/state/trigger-edit-context";

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
  const { pushChip } = usePromptChips();

  // Each canvas selection adds a new chip to the prompt-bar. Existing chips
  // for previously-selected nodes stay — multiple node chips can coexist so a
  // single command applies to all of them. Chips clear via ClearChipsOnView-
  // ChangeEffect when the user navigates away, or via Backspace.
  // Re-clicking the same node is a no-op because pushChip dedups by id.
  useEffect(() => {
    if (!selected) return;
    pushChip({
      id: `node_${selected.id}`,
      kind: "node",
      label: selected.label,
      payload: selected.id,
      removable: true,
    });
  }, [selected, pushChip]);

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

export function ShellBottomBar() {
  const state = useAppState();
  const dispatch = useAppDispatch();
  const { view, selectedWorkflowNode } = state;
  const welcomeChat = useWelcomeChat();
  const triggerEdit = useTriggerEdit();
  const chipsApi = usePromptChips();

  const hasTriggerChips = chipsApi.chips.some((c) => c.kind === "trigger");
  const editorRef = useRef<ChipEditableInputHandle>(null);

  function handlePromptSubmit(message: PromptInputMessage) {
    const rawText = message.text ?? "";
    const segments = editorRef.current?.getSegments() ?? [];

    // Trigger-edit mode: any trigger chip in the prompt-bar means the user
    // is directing edits at those triggers. Pass per-chip segments through
    // so each chip's command text is parsed independently.
    if (hasTriggerChips && triggerEdit) {
      void triggerEdit.submit(segments).then((result) => {
        if (result.ok) {
          chipsApi.clearChips();
          editorRef.current?.clear();
        }
      });
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
    // Node commands now come from per-chip segments: each `node` chip pairs
    // with the free text typed *between* it and the next chip. Empty-text
    // segments are skipped so a chip without a command doesn't fire a noop.
    const nodeCommands = segments
      .filter((s) => s.chip.kind === "node" && s.text.length > 0)
      .map((s) => ({ nodeLabel: s.chip.label, text: s.text }));

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
      editorRef.current?.clear();
    }
    if (
      structural.ops.length === 0 &&
      nodeCommands.length === 0 &&
      rawText.trim()
    ) {
      dispatch({ type: "workflow_command_submit", text: rawText });
    }

    // AI reply (both for tag-segments and structural ops) is emitted by
    // WorkflowView at the end of the unified "Думаю..." cycle so the user
    // sees the thinking animation before the result.
  }

  const chatPlaceholder =
    hasTriggerChips ? "добавь d1.ru, d2.ru   или   исключи d3.ru" :
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
          {/* Trigger-edit hint: explains what the chips in the prompt-bar
              represent and what commands the user can run. The mascot icon
              lives here (not on the chip itself) so the chip stays a clean,
              text-only inline pill that doesn't confuse contenteditable. */}
          {hasTriggerChips && (
            <div
              data-testid="trigger-edit-hint"
              className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/80"
            >
              {triggerEdit?.processing ? (
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
              ref={editorRef}
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
