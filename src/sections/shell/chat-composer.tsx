"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { Mic } from "lucide-react";
import {
  PromptInput,
  PromptInputButton,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTools,
  usePromptInputController,
  type PromptInputMessage,
} from "@/components/ai-elements/prompt-input";
import {
  ChipEditableInput,
  type ChipEditableInputHandle,
} from "@/components/ai-elements/chip-editable-input";
import type { ChipSegment, PromptChip } from "@/state/prompt-chips-context";
import { usePromptChips } from "@/state/prompt-chips-context";
import { useDraftQueue, type Draft } from "@/state/draft-queue-context";
import { decideEnterAction, APPLY_ALL_COMMAND } from "@/state/prompt-bar-enter";
import { applyDraftToNode } from "@/state/apply-draft";
import { useAppDispatch } from "@/state/app-state-context";
import { cn } from "@/lib/utils";

export interface ChatComposerSubmitPayload {
  text: string;
  segments: ChipSegment[];
}

export interface ChatComposerHandle {
  /** Загружает черновик из очереди обратно в инпут (клик по карточке). */
  loadDraft: (draft: Draft) => void;
  /** Вставляет полный текст подсказки в инпут после тега (M6.3). */
  insertSuggestion: (fullText: string) => void;
  /** Подставляет команду «Применить все изменения» в инпут (M5.6/M6). */
  insertApplyAllCommand: () => void;
}

interface ChatComposerProps {
  placeholder: string;
  onSubmit: (payload: ChatComposerSubmitPayload) => void;
  /** Сообщает родителю текущий активный тег и печатается ли текст после него. */
  onActiveTagChange?: (info: { tag: PromptChip | null; hasTypedText: boolean }) => void;
  /** Перехватывать глобальный ввод (только для видимого нижнего бара). */
  captureGlobalTyping?: boolean;
}

/**
 * Промпт-бар с тегами (M5). Инпут держит один активный тег. Поведение Enter
 * выбирается чистой функцией {@link decideEnterAction}:
 * - apply-tag — свежий тег с текстом применяется к узлу немедленно;
 * - park-tag — тег, поднятый из очереди, перепарковывается обратно;
 * - apply-all — команда «Применить все изменения» при непустой очереди;
 * - free-text — обычный запрос без тега;
 * - noop — тег без текста, делать нечего.
 *
 * Смена тега (новый чип при уже существующем) ловится `ChipEditableInput`
 * через `onTagSwap` и паркует предыдущую пару (тег + текст) в очередь.
 */
export const ChatComposer = forwardRef<ChatComposerHandle, ChatComposerProps>(
  function ChatComposer(
    { placeholder, onSubmit, onActiveTagChange, captureGlobalTyping },
    ref
  ) {
    const editorRef = useRef<ChipEditableInputHandle>(null);
    const { chips, pushChip, removeChip, clearChips } = usePromptChips();
    const { drafts, parkDraft, removeDraft, clearQueue } = useDraftQueue();
    const controller = usePromptInputController();
    const dispatch = useAppDispatch();

    // Активная пара (тег + текст), отслеживаемая на изменениях chips —
    // нужна, чтобы знать, что парковать при смене тега или загрузке черновика.
    const prevActiveRef = useRef<ChipSegment | null>(null);
    // id чипа, поднятого из очереди. Если активный тег == этот id — Enter
    // перепарковывает, а не применяет (текст редактируется, не финализирован).
    const [fromQueueChipId, setFromQueueChipId] = useState<string | null>(null);

    // chips изменился → чип попал в DOM; переснимаем активный сегмент в ref
    // (это снимок «что сейчас в инпуте», используемый при последующей парковке).
    useEffect(() => {
      const seg = editorRef.current?.getActiveSegment() ?? null;
      if (seg) prevActiveRef.current = seg;
    }, [chips]);

    // Сообщаем родителю об активном теге и наличии текста после него (M6).
    // textInput.value — реактивное значение; меняется при каждом вводе символа.
    const { textInput } = controller;
    useEffect(() => {
      const seg = editorRef.current?.getActiveSegment() ?? null;
      onActiveTagChange?.({
        tag: seg ? seg.chip : null,
        hasTypedText: seg ? seg.text.trim().length > 0 : false,
      });
    }, [chips, textInput.value, onActiveTagChange]);

    /**
     * Паркует предыдущий активный тег при смене тега (вызов из onTagSwap).
     * Старый чип убираем ВСЕГДА: либо запаркован (если в нём был текст),
     * либо затёрт (текста не было — нечего сохранять). Без unconditional-
     * remove новый чип ляжет рядом со старым (ТЗ §7.2 «без текста → A
     * затирается → в инпуте появляется B»).
     */
    function parkPreviousIfNeeded() {
      const prev = prevActiveRef.current;
      if (!prev) {
        setFromQueueChipId(null);
        return;
      }
      if (prev.text.trim().length > 0) {
        parkDraft(prev.chip, prev.text);
      }
      removeChip(prev.chip.id);
      setFromQueueChipId(null);
    }

    /** Загружает черновик из очереди обратно в инпут. */
    function loadInto(draft: Draft) {
      // 1. Запарковать текущий активный сегмент, если в нём есть текст.
      const current = editorRef.current?.getActiveSegment() ?? null;
      if (current && current.text.trim().length > 0) {
        parkDraft(current.chip, current.text);
      }
      // 2. Убрать загружаемый черновик из очереди (семантика «взять», а не
      //    «скопировать»): карточка в DraftQueueList должна исчезнуть сразу.
      removeDraft(draft.id);
      // 3. Очистить инпут + чипы. clear() стирает DOM синхронно, поэтому
      //    следующий push нового чипа не триггерит onTagSwap (hadChip=false).
      editorRef.current?.clear();
      clearChips();
      // 4. Запушить чип черновика.
      pushChip({
        id: draft.chip.id,
        kind: draft.chip.kind,
        label: draft.chip.label,
        payload: draft.chip.payload,
        removable: draft.chip.removable,
      });
      // 5. В следующем кадре — сфокусировать инпут и вставить текст черновика
      //    (к этому моменту чип уже в DOM, вставка идёт после него).
      //    prevActiveRef обновляется ПОСЛЕ insertDraftText, иначе эффект chips
      //    (который стреляет после pushChip) перезапишет ref пустым текстом.
      requestAnimationFrame(() => {
        editorRef.current?.focus();
        insertDraftText(draft.text);
        prevActiveRef.current = { chip: draft.chip, text: draft.text };
      });
      // 6. Запомнить, что этот тег поднят из очереди.
      setFromQueueChipId(draft.chip.id);
    }

    /** Вставляет текст черновика в инпут через контроллер промпт-бара. */
    function insertDraftText(text: string) {
      if (text.trim().length === 0) return;
      controller.textInput.insertAtCursor(text, {
        separator: "smart",
        preserveTags: true,
      });
    }

    function handleSubmit(message: PromptInputMessage) {
      const segments = editorRef.current?.getSegments() ?? [];
      const active = editorRef.current?.getActiveSegment() ?? null;
      const freeText = (message.text ?? "").trim();

      // Только node-теги (кампании/воркфлоу) проходят через очередь черновиков и
      // applyDraftToNode. Trigger/section-теги (визард сигнала) — НЕ команды
      // узла: их понимает только chat-пайплайн (useChatSubmit), который
      // применяет правку триггера к шагу и пишет сообщение в историю.
      // applyDraftToNode игнорирует не-node payload, поэтому без этой ветки тег
      // триггера по Enter молча ничего не делал (домен не добавлялся, в истории
      // пусто).
      if (active && active.chip.kind !== "node") {
        if (freeText.length === 0) return; // тег без текста — нечего применять
        onSubmit({ text: freeText, segments });
        editorRef.current?.clear();
        clearChips();
        prevActiveRef.current = null;
        setFromQueueChipId(null);
        return;
      }

      const action = decideEnterAction({
        hasActiveTag: active !== null,
        activeTagFromQueue:
          active !== null && active.chip.id === fromQueueChipId,
        activeText: active ? active.text : freeText,
        queueLength: drafts.length,
      });

      switch (action.kind) {
        case "noop":
          return;
        case "apply-tag":
          if (active) applyDraftToNode(dispatch, active.chip, active.text);
          break;
        case "park-tag":
          if (active) parkDraft(active.chip, active.text);
          break;
        case "apply-all":
          for (const d of drafts) applyDraftToNode(dispatch, d.chip, d.text);
          clearQueue();
          break;
        case "free-text":
          if (!freeText && segments.length === 0) return;
          onSubmit({ text: freeText, segments });
          break;
      }

      // Все непустые ветки финализируют ввод: чистим инпут, чипы и снимки.
      editorRef.current?.clear();
      clearChips();
      prevActiveRef.current = null;
      setFromQueueChipId(null);
    }

    useImperativeHandle(
      ref,
      () => ({
        loadDraft(draft: Draft) {
          loadInto(draft);
        },
        insertSuggestion(fullText: string) {
          // Текст подставляется ПОСЛЕ тега, не выполняется автоматически.
          controller.textInput.insertAtCursor(fullText, {
            separator: "smart",
            preserveTags: true,
          });
          editorRef.current?.focus();
        },
        insertApplyAllCommand() {
          editorRef.current?.clear();
          clearChips();
          controller.textInput.insertAtCursor(APPLY_ALL_COMMAND, { separator: "none" });
          editorRef.current?.focus();
        },
      }),
      // loadInto closes over stable callbacks + refs; recreated each render
      // is fine — the handle is read on click, not memo-critical.
      // eslint-disable-next-line react-hooks/exhaustive-deps
      []
    );

    return (
      <PromptInput
        onSubmit={handleSubmit}
        className={cn(
          "[&_[data-slot=input-group]]:rounded-[10px]!",
          "[&_[data-slot=input-group]]:border!",
          "[&_[data-slot=input-group]]:border-white/10!",
          "[&_[data-slot=input-group]]:bg-[#171717]!",
          "dark:[&_[data-slot=input-group]]:bg-[#171717]!"
        )}
      >
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
    );
  }
);
