"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import { motion } from "motion/react";
import { Mic } from "lucide-react";
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
import { cn } from "@/lib/utils";
import { useAppState, useAppDispatch } from "@/state/app-state-context";
import {
  isOnWelcome,
  isWorkflowView,
  type View,
} from "@/state/app-state";
import { parseStructuralCommands } from "@/state/structural-commands";
import { useWelcomeChat } from "@/sections/welcome/welcome-chat-context";
import { OnboardingChatChips } from "@/sections/welcome/onboarding-chat-view";

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

export function ShellBottomBar() {
  const state = useAppState();
  const dispatch = useAppDispatch();
  const { view, selectedWorkflowNode } = state;
  const welcomeChat = useWelcomeChat();

  function handlePromptSubmit(message: PromptInputMessage) {
    const rawText = message.text ?? "";

    if (isOnWelcome(state)) {
      welcomeChat?.submitFreeText(rawText);
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
            // Outer frosted card (same on all views).
            "bg-[rgba(10,10,10,0.55)] backdrop-blur-[2px]",
            // Drop shadow that lifts the card off the background so it stops
            // "просвечивать" on busy canvases.
            "shadow-[0_12px_32px_-8px_rgba(0,0,0,0.55),0_-8px_24px_-12px_rgba(0,0,0,0.35)]"
          )}
        >
          <PromptInput
            onSubmit={handlePromptSubmit}
            className="rounded-[10px] border border-white/15 bg-white/5 backdrop-blur-[14.8px] shadow-[0_0_17px_9px_rgba(0,0,0,0.19)]"
          >
            <AttachmentFileList />
            <PromptInputBody>
              <PromptInputTextarea
                className="min-h-[52px] max-h-[120px] bg-transparent text-[#fafafa] placeholder:text-muted-foreground"
                placeholder={chatPlaceholder}
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
        </div>
      </motion.div>
    </>
  );
}
