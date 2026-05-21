"use client";

import { useEffect, useRef, useState } from "react";
import { getNodeColor } from "@/sections/campaigns/node-visuals";
import type { NodeTagPayload, PromptChip } from "@/state/prompt-chips-context";
import { AnimatePresence, motion } from "motion/react";
import Image from "next/image";
import { Mic } from "lucide-react";
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
import {
  ChipEditableInput,
  type ChipEditableInputHandle,
} from "@/components/ai-elements/chip-editable-input";
import {
  usePromptChips,
  isNodeTagPayload,
  type ChipSegment,
} from "@/state/prompt-chips-context";
import { cn } from "@/lib/utils";
import { useAppState, useAppDispatch } from "@/state/app-state-context";
import {
  isOnWelcome,
  isOnStatisticsSection,
  isWorkflowView,
  type View,
} from "@/state/app-state";
import { parseStructuralCommands } from "@/state/structural-commands";
import { parseCampaignQuery } from "@/state/parse-campaign-filter";
import { decideEnterAction, APPLY_ALL_COMMAND } from "@/state/prompt-bar-enter";
import { applyDraftToNode } from "@/state/apply-draft";
import { useDraftQueue } from "@/state/draft-queue-context";
import { useWelcomeChat } from "@/sections/welcome/welcome-chat-context";
import { OnboardingChatChips } from "@/sections/welcome/onboarding-chat-view";
import { CampaignsPromptChips } from "@/sections/campaigns/campaigns-prompt-chips";
import { PromptBar } from "./prompt-bar";
import { SuggestionBar } from "./suggestion-bar";
import { useChat } from "@/state/chat-context";
import { DraftQueueList } from "./draft-queue-list";
import { useChatSubmit } from "./use-chat-submit";
import { useAiReplyAutoDismiss } from "./use-ai-reply-auto-dismiss";

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
 * The chip is colored by the node's kind via getNodeColor. Backspace-removal
 * of the chip dispatches `workflow_node_deselected` so the canvas selection
 * state stays in sync.
 */
function SelectedNodeChipEffect({
  selected,
}: {
  selected: { id: string; label: string; nodeType?: string } | null;
}) {
  const { pushChip } = usePromptChips();

  // Each canvas selection adds a new chip to the prompt-bar. Existing chips
  // for previously-selected nodes stay — multiple node chips can coexist so a
  // single command applies to all of them. Chips clear via ClearChipsOnView-
  // ChangeEffect when the user navigates away, or via Backspace.
  // Re-clicking the same node is a no-op because pushChip dedups by id.
  useEffect(() => {
    if (!selected) return;
    const nodeType = selected.nodeType ?? "default";
    pushChip({
      id: `node_${selected.id}`,
      kind: "node",
      label: selected.label,
      payload: {
        nodeId: selected.id,
        nodeType,
        color: getNodeColor(nodeType),
        // paramLabel absent → whole-node tag
      } satisfies NodeTagPayload,
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
  const { submit: chatSubmit } = useChatSubmit();
  const {
    view,
    selectedWorkflowNode,
    campaigns,
    wizardCurrentStep,
    budgetHelpShown,
    aiReply,
  } = state;
  useAiReplyAutoDismiss(aiReply, dispatch);
  const welcomeChat = useWelcomeChat();
  const chipsApi = usePromptChips();
  const { drafts: draftsRef, clearQueue, parkDraft } = useDraftQueue();
  const { openSidebar } = useChat();
  // PromptInputProvider is mounted globally in page.tsx above ShellBottomBar,
  // so usePromptInputController() resolves here — the controller context is
  // created by PromptInputProvider, not by the <PromptInput> form below.
  const { textInput } = usePromptInputController();

  const editorRef = useRef<ChipEditableInputHandle>(null);

  // Snapshot активного сегмента (тег + текст) — обновляется при изменении
  // chips, нужен для парковки предыдущего тега при смене (M5/ТЗ §7.2).
  const prevActiveRef = useRef<ChipSegment | null>(null);

  // M6: mirror the editor's single active tag/text into local flags so the
  // SuggestionBar (which picks welcome/context/apply-all) can react. The source
  // is imperative DOM (getActiveSegment reads the contenteditable surface owned
  // and synced by ChipEditableInput's own effect), so this external→internal
  // sync must run in an effect — eslint-disable marks it intentional. Recomputed
  // whenever chips or the controller text value change.
  const [activeTag, setActiveTag] = useState<PromptChip | null>(null);
  const [hasTypedText, setHasTypedText] = useState(false);
  useEffect(() => {
    const seg = editorRef.current?.getActiveSegment() ?? null;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setActiveTag(seg ? seg.chip : null);
    setHasTypedText(seg ? seg.text.trim().length > 0 : false);
    // Keep prevActiveRef snapshot fresh so parkPreviousIfNeeded picks up the
    // latest (chip + currently-typed text) when the user switches tags.
    if (seg) prevActiveRef.current = seg;
  }, [chipsApi.chips, textInput.value]);

  /**
   * Паркует предыдущий активный тег при смене тега (вызов из onTagSwap
   * ChipEditableInput'а). Старый чип убираем ВСЕГДА: либо запаркован, либо
   * затёрт. См. ТЗ §7.2 и `ChatComposer.parkPreviousIfNeeded`.
   */
  function parkPreviousIfNeeded() {
    const prev = prevActiveRef.current;
    if (!prev) return;
    if (prev.text.trim().length > 0) {
      parkDraft(prev.chip, prev.text);
    }
    chipsApi.removeChip(prev.chip.id);
    prevActiveRef.current = null;
  }

  function handlePromptSubmit(message: PromptInputMessage) {
    const rawText = message.text ?? "";
    const segments = editorRef.current?.getSegments() ?? [];

    const decision = decideEnterAction({
      hasActiveTag: segments.length > 0,
      activeTagFromQueue: false,
      activeText: rawText,
      queueLength: draftsRef.length,
    });
    if (decision.kind === "apply-all") {
      for (const d of draftsRef) applyDraftToNode(dispatch, d.chip, d.text);
      clearQueue();
      chipsApi.clearChips();
      editorRef.current?.clear();
      prevActiveRef.current = null;
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

    if (view.kind === "section" && view.name === "Статистика") {
      if (rawText.trim()) {
        chatSubmit({ text: rawText, segments });
      }
      editorRef.current?.clear();
      chipsApi.clearChips();
      return;
    }

    if (view.kind !== "workflow" || view.launched) return;

    const structural = parseStructuralCommands(rawText);
    // Node commands now come from per-chip segments: each `node` chip pairs
    // with the free text typed *between* it and the next chip. Empty-text
    // segments are skipped so a chip without a command doesn't fire a noop.
    // Node chips carry a NodeTagPayload with a reliable `nodeId` — pass it so
    // the resolver matches by id. For a node-field chip `chip.label` is the
    // field name (not a node label) and would never resolve; `nodeLabel` is
    // still passed as a fallback for whole-node chips.
    const nodeCommands = segments
      .filter((s) => s.chip.kind === "node" && s.text.length > 0)
      .map((s) => ({
        nodeLabel: s.chip.label,
        nodeId: isNodeTagPayload(s.chip.payload)
          ? s.chip.payload.nodeId
          : undefined,
        text: s.text,
      }));

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
      prevActiveRef.current = null;
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
    isOnWelcome(state) ? "Задайте вопрос…" :
    isWorkflowView(state) ? "Опишите изменение сценария..." :
    view.kind === "campaign-select" ? "Опишите вашу кампанию..." :
    view.kind === "guided-signal" ? "Введите ваши параметры или задайте вопрос" :
    view.kind === "section" && (view.name === "Сигналы" || view.name === "Кампании") ? "Напишите, что вы хотите сделать" :
    "Выберите шаг или задайте вопрос…";

  const onWelcome = isOnWelcome(state);

  return (
    <>
      <SelectedNodeChipEffect selected={selectedWorkflowNode} />
      <ClearChipsOnViewChangeEffect viewKind={view.kind} />
      <PromptBar
        onOpenDrawer={openSidebar}
        slot={
          <>
            <DraftQueueList variant="compact" onTakeDraft={() => {}} />
            <AnimatePresence initial={false}>
              {aiReply ? (
                <motion.div
                  key="ai-reply"
                  initial={{ y: 6, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: 6, opacity: 0 }}
                  transition={{ duration: 0.26, ease: [0.23, 1, 0.32, 1] }}
                  role="status"
                  aria-live="polite"
                  data-testid="ai-reply-slot"
                  className="flex items-start gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/80"
                >
                  <Image
                    src="/mascot-icon.svg"
                    alt=""
                    width={16}
                    height={16}
                    className="mt-0.5 shrink-0"
                    aria-hidden
                  />
                  <span className="min-w-0 flex-1 leading-snug">{aiReply}</span>
                </motion.div>
              ) : null}
            </AnimatePresence>
            {view.kind === "guided-signal" &&
            wizardCurrentStep === 5 &&
            budgetHelpShown ? (
              <motion.div
                key="budget-help-answer"
                initial={{ y: 6, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.26, ease: [0.23, 1, 0.32, 1] }}
                data-testid="budget-help-answer"
                className="flex items-start gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/80"
              >
                <Image
                  src="/mascot-icon.svg"
                  alt=""
                  width={16}
                  height={16}
                  className="mt-0.5 shrink-0"
                  aria-hidden
                />
                <span className="leading-snug">
                  Рекомендуемая сумма рассчитана из размера вашей базы и средних
                  цен по сегментам. Мы заложили её так, чтобы хватило на полный
                  цикл сбора сигналов без перерасхода — обычно это 5–35% от
                  размера базы в рублях.
                </span>
              </motion.div>
            ) : undefined}
          </>
        }
      >
        <PromptInput
          onSubmit={handlePromptSubmit}
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
            onTagSwap={parkPreviousIfNeeded}
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
        <SuggestionBar
          activeTag={activeTag}
          hasTypedText={hasTypedText}
          isWelcome={
            onWelcome || (view.kind === "section" && view.name === "Кампании")
          }
          isStatistics={isOnStatisticsSection(state)}
          welcomeSlot={
            onWelcome && welcomeChat ? (
              <OnboardingChatChips
                chips={welcomeChat.chips}
                onChipClick={welcomeChat.submitChip}
              />
            ) : view.kind === "section" &&
              view.name === "Кампании" &&
              campaigns.length > 0 ? (
              <CampaignsPromptChips
                onChipClick={(text) => {
                  const { statuses, sort } = parseCampaignQuery(text);
                  if (statuses.length > 0 || sort !== "default") {
                    dispatch({ type: "campaigns_query_set", statuses, sort });
                  }
                }}
              />
            ) : null
          }
          onPickSuggestion={(fullText) => {
            textInput.insertAtCursor(fullText, {
              separator: "smart",
              preserveTags: true,
            });
          }}
          onPickApplyAll={() => {
            chipsApi.clearChips();
            editorRef.current?.clear();
            textInput.insertAtCursor(APPLY_ALL_COMMAND, { separator: "none" });
          }}
          onPickStatsQuery={(phrase) => {
            // Вставить фразу и тут же отправить через тот же путь, что Enter.
            // chatSubmit маршрутизирует stats-запросы через useChatSubmit.
            chatSubmit({ text: phrase, segments: [] });
            editorRef.current?.clear();
            chipsApi.clearChips();
          }}
        />
        {view.kind === "guided-signal" &&
          wizardCurrentStep === 5 &&
          !budgetHelpShown && (
            <div className="flex flex-wrap justify-start gap-2">
              <motion.button
                type="button"
                onClick={() => dispatch({ type: "budget_help_shown" })}
                initial={{ y: 6, opacity: 0, scale: 0.96 }}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                transition={{ duration: 0.26, ease: [0.23, 1, 0.32, 1] }}
                whileTap={{ scale: 0.97 }}
                className="rounded-full border border-white/10 bg-[#171717] px-[13px] py-[7px] text-[12px] text-white transition-colors duration-150 ease-out hover:bg-[#1f1f1f]"
              >
                Как рассчитывается рекомендуемый бюджет?
              </motion.button>
            </div>
          )}
      </PromptBar>
    </>
  );
}
