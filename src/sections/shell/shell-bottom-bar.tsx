"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  type KeyboardEventHandler,
} from "react";
import { motion } from "motion/react";
import { Mic, Loader2 } from "lucide-react";
import type { PromptInputMessage } from "@/components/ai-elements/prompt-input";
import {
  PromptInput,
  PromptInputBody,
  PromptInputButton,
  PromptInputFooter,
  PromptInputHeader,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
  usePromptInputAttachments,
  usePromptInputController,
} from "@/components/ai-elements/prompt-input";
import { PromptChipsRow } from "@/components/ai-elements/prompt-chips-row";
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
 * Multi-word labels (e.g. "Email 2") need bracket-quoting so the parser can
 * recover the full label from a prompt like "@[Email 2] ...". Single-word
 * labels stay as bare "@Email" for readability.
 */
function formatTag(label: string): string {
  return label.includes(" ") ? `@[${label}] ` : `@${label} `;
}

function SelectedNodeEffect({
  selected,
}: {
  selected: { id: string; label: string } | null;
}) {
  const { textInput } = usePromptInputController();
  useEffect(() => {
    if (selected) {
      textInput.insertAtCursor(formatTag(selected.label), { separator: "smart" });
    }
    // NB: on deselect we intentionally do NOT clear the input — any stale
    // empty tag will be stripped on the next insertAtCursor call.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected?.id]);
  return null;
}

function ClearOnLeaveWorkflowEffect({ viewKind }: { viewKind: View["kind"] }) {
  const { textInput } = usePromptInputController();
  const prevKind = useRef<View["kind"] | null>(null);
  useEffect(() => {
    if (prevKind.current === "workflow" && viewKind !== "workflow") {
      textInput.clear();
    }
    prevKind.current = viewKind;
  }, [viewKind, textInput]);
  return null;
}

/**
 * Разбирает текст промпта на сегменты по @-тегам.
 * Поддерживает:
 *   "@A foo"            → label "A"
 *   "@[Multi word] foo" → label "Multi word"  (для нод с пробелом в label)
 *
 * Примеры:
 *   "@A foo @B bar"      → [{ label: "A", text: "foo" }, { label: "B", text: "bar" }]
 *   "@[Email 2] текст"   → [{ label: "Email 2", text: "текст" }]
 *   "hello @A foo"       → [{ label: "A", text: "foo" }]  (прологовый текст игнорируется)
 *   "hello"              → []
 */
function parseTagSegments(
  input: string
): Array<{ label: string; text: string }> {
  const out: Array<{ label: string; text: string }> = [];
  const re = /@(?:\[([^\]]+)\]|(\S+))\s*([^@]*)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(input)) !== null) {
    const label = (m[1] ?? m[2] ?? "").trim();
    const text = (m[3] ?? "").trim();
    if (label) out.push({ label, text });
  }
  return out;
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

  const handleChipsBackspace = useCallback<
    KeyboardEventHandler<HTMLTextAreaElement>
  >(
    (e) => {
      if (
        e.key === "Backspace" &&
        e.currentTarget.value === "" &&
        e.currentTarget.selectionStart === 0 &&
        e.currentTarget.selectionEnd === 0 &&
        chipsApi.chips.length > 0
      ) {
        const lastRemovable = [...chipsApi.chips]
          .reverse()
          .find((c) => c.removable);
        if (lastRemovable) {
          e.preventDefault();
          chipsApi.removeChip(lastRemovable.id);
        }
      }
    },
    [chipsApi]
  );

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
    const tagSegments = parseTagSegments(rawText);

    if (structural.ops.length > 0) {
      dispatch({
        type: "workflow_structural_commands_submit",
        ops: structural.ops,
      });
    }
    if (tagSegments.length > 0) {
      dispatch({
        type: "workflow_node_command_submit",
        commands: tagSegments.map((s) => ({ nodeLabel: s.label, text: s.text })),
      });
    }
    if (
      structural.ops.length === 0 &&
      tagSegments.length === 0 &&
      rawText.trim()
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
      <SelectedNodeEffect selected={selectedWorkflowNode} />
      <ClearOnLeaveWorkflowEffect viewKind={view.kind} />
      <TriggerEditDraftSwap />
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
          {triggerEdit?.active && (
            <div
              data-testid="trigger-edit-hint"
              className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/80"
            >
              {triggerEdit.processing ? (
                <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-primary" />
              ) : (
                <span className="inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
              )}
              <span className="leading-snug">
                Редактируем триггер «{triggerEdit.active.label}». Напишите,
                какие сайты добавить или исключить.
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
            <PromptInputBody className="flex flex-wrap items-start gap-2 px-3 py-2">
              <PromptChipsRow />
              <PromptInputTextarea
                className={cn(
                  "min-h-[52px] max-h-[120px] bg-transparent text-[#fafafa] placeholder:text-muted-foreground",
                  // Inline layout: textarea fills remaining space alongside
                  // chips on the same row, wraps onto a new line when chips
                  // overflow. Neutralise the InputGroupTextarea defaults so
                  // chips and the textarea share one visual surface.
                  "flex-1 min-w-[12rem] !p-0 !border-0"
                )}
                placeholder={chatPlaceholder}
                onKeyDown={handleChipsBackspace}
              />
            </PromptInputBody>
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
