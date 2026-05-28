"use client";

import { useEffect, useRef, useState } from "react";
import { getNodeColor } from "@/sections/campaigns/node-visuals";
import type { NodeTagPayload, PromptChip } from "@/state/prompt-chips-context";
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
  isWorkflowView,
  type View,
} from "@/state/app-state";
import { parseStructuralCommands } from "@/state/structural-commands";
import { parseCampaignQuery } from "@/state/parse-campaign-filter";
import { decideEnterAction, APPLY_ALL_COMMAND } from "@/state/prompt-bar-enter";
import { useDraftQueue } from "@/state/draft-queue-context";
import { useWelcomeChat } from "@/sections/welcome/welcome-chat-context";
import { selectPromptSuggestions } from "@/state/select-prompt-suggestions";
import type { SuggestionItem } from "@/state/suggestion-registry";
import { PromptBar } from "./prompt-bar";
import { SuggestionBar } from "./suggestion-bar";
import { useChat } from "@/state/chat-context";
import { DraftQueueList } from "./draft-queue-list";
import { TransientReply } from "./transient-reply";
import { useChatSubmit } from "./use-chat-submit";

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
  } = state;
  const welcomeChat = useWelcomeChat();
  const chipsApi = usePromptChips();
  const { drafts: draftsRef, clearQueue, parkDraft } = useDraftQueue();
  const chat = useChat();
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
      // История: каждый запаркованный запрос (тег + текст) — отдельной строкой
      // с чипом (triggerLabel), как и обычные тегированные правки.
      for (const d of draftsRef) {
        chat.append({ role: "user", text: d.text, triggerLabel: d.chip.label });
      }
      // Применяем ВСЕ черновики одним диспатчем — отдельные вызовы перетирали
      // бы друг друга (workflow_node_command_submit заменяет состояние, не
      // накапливает), и применился бы только последний.
      const commands = draftsRef
        .filter((d) => isNodeTagPayload(d.chip.payload))
        .map((d) => ({
          nodeId: isNodeTagPayload(d.chip.payload)
            ? d.chip.payload.nodeId
            : undefined,
          nodeLabel: d.chip.label,
          text: d.text,
        }));
      if (commands.length > 0) {
        dispatch({ type: "workflow_node_command_submit", commands });
      }
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

    // Для всех остальных view — guided-signal, awaiting-campaign,
    // campaign-select, campaign, sections Сигналы/Настройки, workflow с
    // launched=true — фраза уходит в чат через useChatSubmit и получает
    // mock-ответ из mockReplyForFreeText. Inline-ответ показывает
    // TransientReply над инпутом; полную историю можно посмотреть в drawer.
    if (view.kind !== "workflow" || view.launched) {
      if (rawText.trim()) {
        chatSubmit({ text: rawText, segments });
      }
      editorRef.current?.clear();
      chipsApi.clearChips();
      return;
    }

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

    // C5: если в очереди уже есть черновики, свежий тег+текст по Enter не
    // применяется немедленно, а тоже паркуется — всё копится и применяется
    // вместе командой «Применить все изменения» (см. decideEnterAction).
    // Проверяем до записи в историю/диспатча — парковка не является submit'ом.
    if (nodeCommands.length > 0 && draftsRef.length > 0) {
      for (const s of segments) {
        if (s.chip.kind === "node" && s.text.length > 0) {
          parkDraft(s.chip, s.text);
        }
      }
      chipsApi.clearChips();
      editorRef.current?.clear();
      prevActiveRef.current = null;
      return;
    }

    // Реальная правка сценария → запрос пользователя уходит в общий чат
    // (история запросов видна в drawer). Ответ ассистента эмитит WorkflowView
    // обычным сообщением (inline через TransientReply) — без отдельной плашки.
    // Тегированные правки пишем по сегментам, каждую с чипом (triggerLabel);
    // структурные/безтеговые — просто текстом.
    if (nodeCommands.length > 0) {
      for (const s of segments) {
        if (s.chip.kind === "node" && s.text.length > 0) {
          chat.append({
            role: "user",
            text: s.text,
            triggerLabel: s.chip.label,
          });
        }
      }
    } else if (structural.ops.length > 0 && rawText.trim()) {
      chat.append({ role: "user", text: rawText });
    }

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

  function handlePickSuggestion(item: SuggestionItem) {
    switch (item.action.kind) {
      case "ask":
        // Клик по вопросу-чипу вставляет текст в инпут — пользователь видит
        // его в PromptBar и решает, отправить как есть (Enter) или поправить.
        // Сам Enter маршрутизируется в `handlePromptSubmit` ниже, где для
        // разделов без специальной обработки фраза уходит в `chatSubmit` и
        // получает inline-ответ через TransientReply.
        textInput.insertAtCursor(item.action.prompt, {
          separator: "smart",
          preserveTags: true,
        });
        return;
      case "submit":
        chatSubmit({ text: item.action.phrase, segments: [] });
        editorRef.current?.clear();
        chipsApi.clearChips();
        return;
      case "dispatch":
        dispatch(item.action.action);
        return;
      case "chat-submit":
        welcomeChat?.submitChip(item.action.chip);
        return;
      case "command":
        if (item.action.command === "apply-all") {
          chipsApi.clearChips();
          editorRef.current?.clear();
          textInput.insertAtCursor(APPLY_ALL_COMMAND, { separator: "none" });
        }
        return;
    }
  }

  const chatPlaceholder =
    isOnWelcome(state) ? "Задайте вопрос…" :
    isWorkflowView(state) ? "Опишите изменение сценария..." :
    view.kind === "campaign-select" ? "Опишите вашу кампанию..." :
    view.kind === "guided-signal" ? "Введите ваши параметры или задайте вопрос" :
    view.kind === "section" && (view.name === "Сигналы" || view.name === "Кампании") ? "Напишите, что вы хотите сделать" :
    "Выберите шаг или задайте вопрос…";

  return (
    <>
      <SelectedNodeChipEffect selected={selectedWorkflowNode} />
      <ClearChipsOnViewChangeEffect viewKind={view.kind} />
      <PromptBar
        onOpenDrawer={chat.openSidebar}
        slot={
          <>
            <DraftQueueList variant="compact" onTakeDraft={() => {}} />
            <TransientReply messages={chat.messages} />
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
            captureGlobalTyping
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
          resolution={selectPromptSuggestions(state, {
            activeTag,
            hasTypedText,
            queueLength: draftsRef.length,
            welcomeChips: welcomeChat?.chips ?? [],
          })}
          onPick={(item) => handlePickSuggestion(item)}
        />
      </PromptBar>
    </>
  );
}
