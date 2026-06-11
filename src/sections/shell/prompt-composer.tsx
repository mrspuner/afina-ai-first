"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { Mic } from "lucide-react";
import { getNodeColor } from "@/sections/campaigns/node-visuals";
import type { PromptInputMessage } from "@/components/ai-elements/prompt-input";
import {
  PromptInput,
  PromptInputButton,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTools,
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
  type NodeTagPayload,
} from "@/state/prompt-chips-context";
import { useDraftQueue, type Draft } from "@/state/draft-queue-context";
import { useChat } from "@/state/chat-context";
import { useWelcomeChat } from "@/sections/welcome/welcome-chat-context";
import { useAppState, useAppDispatch } from "@/state/app-state-context";
import { isOnWelcome } from "@/state/app-state";
import { parseStructuralCommands } from "@/state/structural-commands";
import { isAiParserEnabled } from "@/state/dev-config";
import { fetchAssist, fetchAssistAvailability } from "@/lib/ai/assist-client";
import { summarizeGraph } from "@/lib/ai/graph-summary";
import { getCachedGraph } from "@/sections/campaigns/workflow-graph-cache";
import { buildDataSummary } from "@/lib/ai/data-summary";
import { validateAiGraph } from "@/state/ai-graph-validation";
import { buildGraphFromSpec } from "@/lib/ai/rebuild-schema";
import type { NodeParams } from "@/types/workflow";
import { parseCampaignQuery } from "@/state/parse-campaign-filter";
import { decideEnterAction, APPLY_ALL_COMMAND } from "@/state/prompt-bar-enter";
import { selectPromptSuggestions } from "@/state/select-prompt-suggestions";
import type { SuggestionAction, SuggestionItem } from "@/state/suggestion-registry";
import { useScopeReset } from "@/state/use-scope-reset";
import { cn } from "@/lib/utils";
import { SuggestionBar } from "./suggestion-bar";
import { useChatSubmit } from "./use-chat-submit";

export interface PromptComposerHandle {
  /** Загружает черновик из очереди обратно в инпут (клик по карточке). */
  loadDraft: (draft: Draft) => void;
}

/** Тон инпута нижнего бара (полупрозрачный, со свечением). */
export const SHELL_INPUT_CLASS = cn(
  "[&_[data-slot=input-group]]:rounded-[10px]!",
  "[&_[data-slot=input-group]]:border!",
  "[&_[data-slot=input-group]]:border-white/15!",
  "[&_[data-slot=input-group]]:bg-white/5!",
  "dark:[&_[data-slot=input-group]]:bg-white/5!",
  "[&_[data-slot=input-group]]:backdrop-blur-[14.8px]",
  "[&_[data-slot=input-group]]:shadow-[0_0_17px_9px_rgba(0,0,0,0.19)]"
);

/** Тон инпута в drawer / guided-signal (плотный тёмный). */
export const DRAWER_INPUT_CLASS = cn(
  "[&_[data-slot=input-group]]:rounded-[10px]!",
  "[&_[data-slot=input-group]]:border!",
  "[&_[data-slot=input-group]]:border-white/10!",
  "[&_[data-slot=input-group]]:bg-[#171717]!",
  "dark:[&_[data-slot=input-group]]:bg-[#171717]!"
);

interface PromptComposerProps {
  placeholder: string;
  /** Перехватывать глобальный ввод (для видимой поверхности). */
  captureGlobalTyping?: boolean;
  /** Тон инпута — отличается у нижнего бара и drawer. */
  inputClassName?: string;
}

/**
 * Единый промпт-композитор для ВСЕХ поверхностей (нижний бар, chat-panel,
 * drawer). Раньше нижний бар держал свою inline-логику, а drawer/panel —
 * отдельный ChatComposer с упрощённым роутингом; чипы и очистка управлялись
 * по-разному, из-за чего теги «возвращались» при закрытии drawer.
 *
 * Теперь логика submit/clear/подсказок и состояние (чипы, очередь черновиков,
 * текст) живут в одном месте и тянутся из общих контекстов. Поведение Enter
 * для workflow выбирает чистая {@link decideEnterAction}; остальной роутинг
 * (welcome / запрос по кампаниям / статистика / чат) ветвится по текущему view.
 */
export const PromptComposer = forwardRef<PromptComposerHandle, PromptComposerProps>(
  function PromptComposer({ placeholder, captureGlobalTyping, inputClassName }, ref) {
    const state = useAppState();
    const dispatch = useAppDispatch();
    const { view, selectedWorkflowNode } = state;
    const chat = useChat();
    const welcomeChat = useWelcomeChat();
    const chipsApi = usePromptChips();
    const { drafts, parkDraft, removeDraft, clearQueue } = useDraftQueue();
    const { submit: chatSubmit } = useChatSubmit();
    const { textInput } = usePromptInputController();

    const editorRef = useRef<ChipEditableInputHandle>(null);
    // Parked suggestion action — runs on confirm only if the inserted text is
    // sent unchanged; editing it falls back to normal routing.
    const pendingActionRef = useRef<{ action: SuggestionAction; text: string } | null>(
      null
    );
    // Snapshot of the active (tag + text) segment, kept fresh for parking.
    const prevActiveRef = useRef<ChipSegment | null>(null);
    // id of the chip lifted from the queue — Enter re-parks it instead of
    // applying (its text is being re-edited, not finalised).
    const [fromQueueChipId, setFromQueueChipId] = useState<string | null>(null);

    const [activeTag, setActiveTag] = useState<ChipSegment["chip"] | null>(null);
    const [hasTypedText, setHasTypedText] = useState(false);
    // Результат пробы доступности AI: false до завершения запроса (страховка
    // от гонки — пока ключ неизвестен, поведение идентично "нет ключа").
    const [aiAvailable, setAiAvailable] = useState(false);

    // Mirror editor's active segment into local flags (for the SuggestionBar)
    // and keep prevActiveRef fresh. Source is imperative DOM, so this runs in
    // an effect on chips/text change.
    useEffect(() => {
      const seg = editorRef.current?.getActiveSegment() ?? null;
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setActiveTag(seg ? seg.chip : null);
      setHasTypedText(seg ? seg.text.trim().length > 0 : false);
      if (seg) prevActiveRef.current = seg;
    }, [chipsApi.chips, textInput.value]);

    // Проба доступности AI при монтировании: запрашиваем один раз безусловно,
    // чтобы значение было готово до первого сабмита — даже если пользователь
    // успеет переключить флаг в дев-панели. Флаг alive защищает от setState
    // после размонтирования компонента.
    useEffect(() => {
      let alive = true;
      void fetchAssistAvailability().then((ok) => {
        if (alive) setAiAvailable(ok);
      });
      return () => {
        alive = false;
      };
    }, []);

    function resetEditor() {
      editorRef.current?.clear();
      chipsApi.clearChips();
      // clear() wipes the editor DOM but NOT the shared controller value — if
      // we skip this, the hydrate-once effect re-inserts the stale text when
      // the editor remounts (drawer toggle / navigation), so the bar "won't
      // clear".
      textInput.clear();
      prevActiveRef.current = null;
      setFromQueueChipId(null);
    }

    /** Parks the previous active tag on tag-swap (called from onTagSwap). The
     *  old chip is always removed — parked if it had text, else discarded. */
    function parkPreviousIfNeeded() {
      const prev = prevActiveRef.current;
      if (!prev) {
        setFromQueueChipId(null);
        return;
      }
      if (prev.text.trim().length > 0) {
        parkDraft(prev.chip, prev.text);
      }
      chipsApi.removeChip(prev.chip.id);
      prevActiveRef.current = null;
      setFromQueueChipId(null);
    }

    /** Lifts a queued draft back into the editor (click on its card). */
    function loadInto(draft: Draft) {
      const current = editorRef.current?.getActiveSegment() ?? null;
      if (current && current.text.trim().length > 0) {
        parkDraft(current.chip, current.text);
      }
      removeDraft(draft.id);
      editorRef.current?.clear();
      chipsApi.clearChips();
      textInput.clear();
      chipsApi.pushChip({
        id: draft.chip.id,
        kind: draft.chip.kind,
        label: draft.chip.label,
        payload: draft.chip.payload,
        removable: draft.chip.removable,
      });
      requestAnimationFrame(() => {
        editorRef.current?.focus();
        if (draft.text.trim().length > 0) {
          textInput.insertAtCursor(draft.text, {
            separator: "smart",
            preserveTags: true,
          });
        }
        prevActiveRef.current = { chip: draft.chip, text: draft.text };
      });
      setFromQueueChipId(draft.chip.id);
    }

    function runPendingAction(action: SuggestionAction, segments: ChipSegment[]) {
      switch (action.kind) {
        case "submit":
          chatSubmit({ text: action.phrase, segments });
          return;
        case "dispatch":
          dispatch(action.action);
          return;
        case "chat-submit":
          welcomeChat?.submitChip(action.chip);
          return;
        case "ask":
        case "command":
          return;
      }
    }

    function handlePromptSubmit(message: PromptInputMessage) {
      const rawText = message.text ?? "";
      const segments = editorRef.current?.getSegments() ?? [];
      const active = editorRef.current?.getActiveSegment() ?? null;

      // 1. Parked suggestion action — fires only if sent unchanged.
      const pending = pendingActionRef.current;
      pendingActionRef.current = null;
      if (pending && rawText.trim() === pending.text.trim()) {
        runPendingAction(pending.action, segments);
        resetEditor();
        return;
      }

      // 2. Welcome — free text feeds the onboarding chat.
      if (isOnWelcome(state)) {
        welcomeChat?.submitFreeText(rawText);
        return;
      }

      // 3. Campaigns section — parse a filter/sort query.
      if (view.kind === "section" && view.name === "Кампании") {
        const { statuses, sort } = parseCampaignQuery(rawText);
        if (statuses.length > 0 || sort !== "default") {
          dispatch({ type: "campaigns_query_set", statuses, sort });
        }
        return;
      }

      // 4. Statistics section — route through chat (stats-query matcher).
      if (view.kind === "section" && view.name === "Статистика") {
        if (rawText.trim()) chatSubmit({ text: rawText, segments });
        resetEditor();
        return;
      }

      // 5. Everything except an editable (not launched) workflow goes to chat:
      // guided-signal trigger tags, sections Сигналы/Настройки, campaign feeds,
      // and launched (read-only) workflows.
      if (view.kind !== "workflow" || view.launched) {
        if (rawText.trim() || segments.length > 0) {
          chatSubmit({ text: rawText, segments });
        }
        resetEditor();
        return;
      }

      // 6. Editable workflow — Enter branch chosen by decideEnterAction.
      const decision = decideEnterAction({
        hasActiveTag: active !== null,
        activeTagFromQueue: active !== null && active.chip.id === fromQueueChipId,
        activeText: active ? active.text : rawText,
        queueLength: drafts.length,
      });

      if (decision.kind === "noop") return;

      if (decision.kind === "park-tag") {
        for (const s of segments) {
          if (s.chip.kind === "node" && s.text.trim().length > 0) {
            parkDraft(s.chip, s.text);
          }
        }
        resetEditor();
        return;
      }

      if (decision.kind === "apply-all") {
        // Each parked request becomes a history line with its chip; apply all
        // drafts in ONE dispatch (separate calls would overwrite each other).
        for (const d of drafts) {
          chat.append({ role: "user", text: d.text, triggerLabel: d.chip.label });
        }
        const commands = drafts
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
        resetEditor();
        return;
      }

      // apply-tag / free-text — apply node commands and/or structural ops now.
      const structural = parseStructuralCommands(rawText);
      const nodeCommands = segments
        .filter((s) => s.chip.kind === "node" && s.text.length > 0)
        .map((s) => ({
          nodeLabel: s.chip.label,
          nodeId: isNodeTagPayload(s.chip.payload)
            ? s.chip.payload.nodeId
            : undefined,
          text: s.text,
        }));

      if (nodeCommands.length > 0) {
        for (const s of segments) {
          if (s.chip.kind === "node" && s.text.length > 0) {
            chat.append({ role: "user", text: s.text, triggerLabel: s.chip.label });
          }
        }
      } else if (structural.ops.length > 0 && rawText.trim()) {
        chat.append({ role: "user", text: rawText });
      }

      if (structural.ops.length > 0) {
        dispatch({ type: "workflow_structural_commands_submit", ops: structural.ops });
      }
      if (nodeCommands.length > 0) {
        dispatch({ type: "workflow_node_command_submit", commands: nodeCommands });
      }
      if (structural.ops.length === 0 && nodeCommands.length === 0 && rawText.trim()) {
        // Авто-гейт AI (спайк 002, auto-on): AI используется если:
        //   1) флаг явно не выключен (isAiParserEnabled() = true, дефолт),
        //   2) И ключ реально есть на сервере (aiAvailable = true, проверено при монтировании).
        // Когда ключа нет (e2e/CI, staging без ключа): aiAvailable = false,
        // useAi = false → синхронный dispatch без единого await — поведение
        // бит-в-бит как до спайка, никаких асинхронных побочных эффектов.
        const useAi = isAiParserEnabled() && aiAvailable;
        if (useAi) {
          // Асинхронная AI-попытка через оркестратор (план 005): граф и
          // выбранная нода передаются в контексте — модель видит текущее
          // состояние сценария и может сделать точечную правку.
          const cached = view.kind === "workflow" ? getCachedGraph(view.campaign.id) : undefined;
          const graph = cached ? summarizeGraph(cached) : undefined;
          const selected = selectedWorkflowNode
            ? {
                id: selectedWorkflowNode.id,
                label: selectedWorkflowNode.label,
                nodeType: selectedWorkflowNode.nodeType ?? "default",
              }
            : undefined;
          const history = chat.messages.filter((m) => !m.pending).slice(-8)
            .map((m) => ({ role: m.role as "user" | "assistant", text: m.text }));
          void (async () => {
            const result = await fetchAssist({
              text: rawText,
              history,
              context: {
                screen: "workflow",
                dataSummary: buildDataSummary({ campaigns: state.campaigns, signals: state.signals }),
                graph,
                selectedNode: selected,
                undoAvailable: state.aiUndoAvailable,
              },
            });
            if (result?.kind === "workflow-ops" && result.ops.length > 0) {
              dispatch({ type: "workflow_structural_commands_submit", ops: result.ops });
            } else if (result?.kind === "rebuild") {
              const signalLabel = cached?.nodes.find((n) => n.data.nodeType === "signal")?.data.label ?? "Сигнал";
              const built = buildGraphFromSpec(result.spec, { label: signalLabel });
              const check = validateAiGraph(built);
              if (check.ok) {
                dispatch({ type: "workflow_rebuild_submit", ...built, assumptions: result.spec.assumptions });
              } else {
                chat.append({ role: "assistant", text: "Не получилось собрать корректную цепочку — попробуйте описать иначе." });
              }
            } else if (result?.kind === "node-params") {
              // Сервер не может строго типизировать union по kind ноды; редьюсер
              // мерджит patch поверх существующих params, невалидные ключи безвредны.
              dispatch({ type: "workflow_node_field_set", nodeId: result.nodeId, patch: result.patch as Partial<NodeParams> });
              chat.append({ role: "assistant", text: result.confirmation });
            } else if (result?.kind === "undo") {
              dispatch({ type: "workflow_ai_undo_request" });
            } else if (result?.kind === "answer") {
              chat.append({ role: "assistant", text: result.text });
            } else if (result?.kind === "clarify") {
              chat.append({ role: "assistant", text: result.questions.join(" ") });
            } else {
              // Легаси-фоллбек: null / none / неожиданный kind
              dispatch({ type: "workflow_command_submit", text: rawText });
            }
          })();
        } else {
          // Нет ключа (aiAvailable=false) ИЛИ флаг принудительно выключен →
          // синхронный путь, поведение бит-в-бит как до спайка.
          dispatch({ type: "workflow_command_submit", text: rawText });
        }
      }
      resetEditor();
    }

    function handlePickSuggestion(item: SuggestionItem) {
      function insert(text: string, action: SuggestionAction | null) {
        // Focus first so the caret is inside the editor and the insert lands at
        // the cursor (not via the dead textarea path).
        editorRef.current?.focus();
        textInput.insertAtCursor(text, { separator: "smart", preserveTags: true });
        pendingActionRef.current = action ? { action, text } : null;
      }
      switch (item.action.kind) {
        case "ask":
          insert(item.action.prompt, null);
          return;
        case "submit":
          insert(item.action.phrase, item.action);
          return;
        case "dispatch":
        case "chat-submit":
          insert(item.label, item.action);
          return;
        case "command":
          if (item.action.command === "apply-all") {
            editorRef.current?.clear();
            chipsApi.clearChips();
            textInput.insertAtCursor(APPLY_ALL_COMMAND, { separator: "none" });
            editorRef.current?.focus();
          }
          pendingActionRef.current = null;
          return;
      }
    }

    useImperativeHandle(ref, () => ({ loadDraft: loadInto }), []);

    const resolution = selectPromptSuggestions(state, {
      activeTag,
      hasTypedText,
      queueLength: drafts.length,
      welcomeChips: welcomeChat?.chips ?? [],
    });

    return (
      <>
        <SelectedNodeChipEffect
          selected={view.kind === "workflow" ? selectedWorkflowNode : null}
        />
        <PromptInput onSubmit={handlePromptSubmit} className={inputClassName}>
          <ChipEditableInput
            ref={editorRef}
            className="px-3 py-2"
            placeholder={placeholder}
            onTagSwap={parkPreviousIfNeeded}
            captureGlobalTyping={captureGlobalTyping}
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
        <SuggestionBar resolution={resolution} onPick={handlePickSuggestion} />
      </>
    );
  }
);

/**
 * Сбрасывает текст промпт-бара при смене раздела (тем же ключом, что чистит
 * чипы/чат/черновики). Монтируется один раз под PromptInputProvider, поэтому
 * чистит независимо от того, какая поверхность сейчас на экране — иначе
 * напечатанный текст «протекал» между разделами (значение живёт в общем
 * контроллере и не сбрасывалось вместе с чипами).
 */
export function PromptInputScopeReset() {
  const { textInput } = usePromptInputController();
  useScopeReset(textInput.clear);
  return null;
}

/**
 * Mirrors the selected workflow node into a chip, coloured by node kind. Chips
 * clear via useScopeReset on navigation, or via Backspace. Re-selecting the
 * same node is a no-op (pushChip dedups by id).
 */
function SelectedNodeChipEffect({
  selected,
}: {
  selected: { id: string; label: string; nodeType?: string } | null;
}) {
  const { pushChip } = usePromptChips();
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
      } satisfies NodeTagPayload,
      removable: true,
    });
  }, [selected, pushChip]);
  return null;
}
