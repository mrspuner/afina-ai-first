"use client";

import { useRef, useState, useEffect } from "react";
import { useChat } from "@/state/chat-context";
import { useTriggerEdit } from "@/state/trigger-edit-context";
import { useAppState, useAppDispatch } from "@/state/app-state-context";
import { isOnStatisticsSection } from "@/state/app-state";
import { mockReplyFor } from "@/lib/mock-ai-reply";
import { applyEmailEdit, generateEmailDraft } from "@/state/email-directory";
import {
  lookupInformationalReply,
  warmFallbackReply,
} from "@/lib/informational-replies";
import { parseTriggerCommand } from "@/lib/trigger-edit-parser";
import { pluralRu } from "@/lib/plural-ru";
import {
  COMPLEX_THINKING_FINAL_REPLY_SIGNAL,
  COMPLEX_THINKING_FINAL_REPLY_STATS,
  COMPLEX_THINKING_STEPS_SIGNAL,
  COMPLEX_THINKING_STEPS_STATS,
  type ComplexThinkingStep,
} from "@/lib/complex-thinking-demo";
import {
  matchStatsQuery,
  STATS_DEMO_YEAR,
  type StatsQueryId,
} from "@/lib/stats-query-matcher";
import type { ChipSegment } from "@/state/prompt-chips-context";
import { fetchAssistMulti, fetchAssistAvailability } from "@/lib/ai/assist-client";
import { buildDataSummary, buildStatsLines } from "@/lib/ai/data-summary";
import type { AssistResult } from "@/lib/ai/assist-contract";
import { toFiltersPatch } from "@/lib/ai/stats-patch-schema";
import { STEPPER_ITEMS } from "@/sections/signals/campaign-stepper";
import { isAiParserEnabled } from "@/state/dev-config";

/** Текст + сегменты (тег + текст после него), отправляемые в чат. */
export interface ChatSubmitPayload {
  text: string;
  segments: ChipSegment[];
}

const LIGHT_QUERY = "лёгкий запрос";
const HEAVY_QUERY = "сложный запрос";

// Ответ при попытке отредактировать ноду в уже запущенном (read-only)
// сценарии. Правок на лету нет — пользователя ведём к дублированию.
const READ_ONLY_WORKFLOW_REPLY =
  "Этот сценарий уже запущен, поэтому его нельзя редактировать. " +
  "Чтобы внести изменения, продублируйте кампанию — копия откроется черновиком, " +
  "и ноды снова можно будет править.";

/** Общий обработчик сабмита чата — используется и collapsed-баром, и drawer. */
export function useChatSubmit(): { submit: (payload: ChatSubmitPayload) => void } {
  const chat = useChat();
  const triggerEdit = useTriggerEdit();
  const appState = useAppState();
  const appDispatch = useAppDispatch();
  const timersRef = useRef<number[]>([]);

  // Проба доступности AI-оркестратора при монтировании (по образцу prompt-composer.tsx).
  // false до завершения запроса — страховка от гонки: пока ключ неизвестен,
  // поведение идентично «нет ключа».
  const [assistAvailable, setAssistAvailable] = useState(false);
  useEffect(() => {
    let alive = true;
    void fetchAssistAvailability().then((ok) => {
      if (alive) setAssistAvailable(ok);
    });
    return () => {
      alive = false;
    };
  }, []);

  // NB: intentionally NO unmount cleanup of these timers. The "сложный запрос"
  // flow calls chat.openSidebar(), which unmounts the collapsed bottom-bar
  // (page.tsx returns null for ChatPanel in sidebar mode). Clearing timers on
  // unmount would kill the in-flight thinking sequence, leaving the pending
  // bubble spinning forever (and only "working" on the 2nd try, when the
  // drawer is already open). The chat state lives in the persistent
  // ChatProvider, so scheduled callbacks remain valid after this hook unmounts.
  function schedule(fn: () => void, ms: number) {
    const id = window.setTimeout(() => {
      timersRef.current = timersRef.current.filter((t) => t !== id);
      fn();
    }, ms) as unknown as number;
    timersRef.current.push(id);
  }

  // Chain-of-thought рендерится ОДНИМ reasoning-блоком: шаги стримятся внутрь
  // него по очереди (накапливаются), по завершении блок сворачивается, и только
  // потом добавляется единственный финальный ответ — без дублирующихся пузырей.
  function playComplexThinking(opts: {
    steps: ComplexThinkingStep[];
    finalReply: string;
  }) {
    chat.openSidebar();
    const reasoningId = chat.append({
      role: "assistant",
      text: "",
      reasoningSteps: [],
      reasoningStreaming: true,
    });
    const collected: string[] = [];
    let cursor = 0;
    function nextStep() {
      if (cursor >= opts.steps.length) {
        // Шаги кончились → помечаем reasoning завершённым (блок свернётся),
        // затем добавляем один финальный ответ отдельным сообщением.
        chat.updateReasoning(reasoningId, collected, false);
        schedule(() => {
          chat.append({ role: "assistant", text: opts.finalReply });
        }, 500);
        return;
      }
      const step = opts.steps[cursor++];
      schedule(() => {
        collected.push(step.reasoning);
        chat.updateReasoning(reasoningId, [...collected], true);
        nextStep();
      }, step.delayMs);
    }
    nextStep();
  }

  function runStatsQuery(id: StatsQueryId, userText: string) {
    // Shared pattern: echo the user line, apply a state change, then resolve a
    // pending assistant reply after a short beat.
    function respond(reply: string, apply?: () => void) {
      chat.append({ role: "user", text: userText });
      apply?.();
      const replyId = chat.append({ role: "assistant", text: "", pending: true });
      schedule(() => chat.updatePending(replyId, reply), 400);
    }

    switch (id) {
      case "group-by-campaigns":
        respond("Перегруппировал по кампаниям.", () =>
          appDispatch({ type: "stats_set_rows", rows: "campaigns" })
        );
        return;
      case "top-campaigns-income-june":
        respond("Топ-10 кампаний по доходу за июнь.", () =>
          appDispatch({
            type: "stats_apply_patch",
            patch: {
              rows: "campaigns",
              sort: { column: "income", direction: "desc" },
              period: {
                preset: "custom",
                from: `${STATS_DEMO_YEAR}-06-01`,
                to: `${STATS_DEMO_YEAR}-06-30`,
              },
              rowCount: 10,
            },
          })
        );
        return;
      case "top-campaigns-income":
        respond("Топ-10 кампаний по доходу.", () =>
          appDispatch({
            type: "stats_apply_patch",
            patch: {
              rows: "campaigns",
              sort: { column: "income", direction: "desc" },
              rowCount: 10,
            },
          })
        );
        return;
      case "top-by-conversion":
        respond("Топ по конверсии (AR) — сверху.", () =>
          appDispatch({
            type: "stats_apply_patch",
            patch: { sort: { column: "ar", direction: "desc" }, rowCount: 10 },
          })
        );
        return;
      case "best-day-income":
        respond("Лучшие дни по доходу — сверху.", () =>
          appDispatch({
            type: "stats_apply_patch",
            patch: {
              rows: "days",
              sort: { column: "income", direction: "desc" },
              rowCount: 10,
            },
          })
        );
        return;
      case "breakdown-by-channels":
        respond("Разбил по каналам.", () =>
          appDispatch({ type: "stats_set_rows", rows: "channels" })
        );
        return;
      case "breakdown-by-creatives":
        respond("Разбил по креативам.", () =>
          appDispatch({ type: "stats_set_rows", rows: "creatives" })
        );
        return;
      case "trend-by-period":
        respond("Показал тренд по дням за период.", () =>
          appDispatch({
            type: "stats_apply_patch",
            patch: { rows: "days", sort: null },
          })
        );
        return;
      case "compare-prev-period":
        respond(
          "Сравнил с предыдущим периодом: доход +14%, расход +6%, ROI вырос на 7 п.п."
        );
        return;
      case "compare-channels": {
        chat.append({ role: "user", text: userText });
        playComplexThinking({
          steps: COMPLEX_THINKING_STEPS_STATS,
          finalReply: COMPLEX_THINKING_FINAL_REPLY_STATS,
        });
        return;
      }
    }
  }

  function submit(payload: ChatSubmitPayload) {
    const { text, segments } = payload;
    const normalized = text.trim().toLowerCase();

    // Email-редактор открыт (A5): сообщение в дровере правит черновик письма —
    // точечная правка (applyEmailEdit) либо пересборка по описанию для нового
    // письма. На read-only кампании редактор не правится — обычный ответ ниже.
    const emailEditor = chat.emailEditor;
    const readOnlyWorkflow =
      appState.view.kind === "workflow" && appState.view.launched;
    if (emailEditor.open && emailEditor.draft && !readOnlyWorkflow) {
      const draft = emailEditor.draft;
      chat.append({ role: "user", text });
      const id = chat.append({ role: "assistant", text: "", pending: true });
      const editPatch = applyEmailEdit(text, draft);
      schedule(() => {
        if (editPatch) {
          chat.setEmailDraft(editPatch);
          chat.updatePending(id, "Готово — обновил письмо в предпросмотре.");
        } else {
          // Нет точечной правки — пересобираем черновик по описанию (первый
          // ответ на «какое письмо вы хотите?»).
          const regenerated = generateEmailDraft(text);
          chat.setEmailDraft({
            name: regenerated.name,
            subject: regenerated.subject,
            body: regenerated.body,
            cta: regenerated.cta,
            showCta: regenerated.showCta,
          });
          chat.updatePending(
            id,
            "Собрал черновик письма — посмотрите предпросмотр справа, можно уточнить."
          );
        }
      }, 500);
      return;
    }

    // Read-only (запущенный) сценарий: правка ноды невозможна. Если пользователь
    // что-то напечатал после тега узла — эхо его запроса в историю и ответ,
    // который ведёт к дублированию, вместо no-op правки. Нетегированные вопросы
    // продолжают получать обычный ответ ниже.
    if (appState.view.kind === "workflow" && appState.view.launched) {
      const nodeSeg = segments.find(
        (s) => s.chip.kind === "node" && s.text.trim().length > 0
      );
      if (nodeSeg) {
        chat.append({
          role: "user",
          text: nodeSeg.text,
          triggerLabel: nodeSeg.chip.label,
        });
        const id = chat.append({ role: "assistant", text: "", pending: true });
        schedule(() => chat.updatePending(id, READ_ONLY_WORKFLOW_REPLY), 400);
        return;
      }
    }

    // Statistics-only hard-coded queries (looser matching). Скоупинг по
    // секции — фразы не должны срабатывать вне Статистики, даже если их
    // случайно ввели в drawer-композиторе.
    // ВАЖНО: канированные запросы выполняются ТОЛЬКО при !useAi (офлайн-режим).
    // При useAi=true ввод со Статистики уходит в AI-оркестратор (который
    // умеет configure_stats), так что канированный путь становится недостижимым.
    const useAi = isAiParserEnabled() && assistAvailable;
    if (!useAi && isOnStatisticsSection(appState)) {
      const match = matchStatsQuery(text);
      if (match) {
        runStatsQuery(match.id, text);
        return;
      }
    }

    // «Проверить доступность доменов» — исключаем случайные домены и сообщаем
    // сколько недоступно. Если в баре активен trigger-тег — проверяем именно
    // этот триггер; иначе все выбранные.
    if (/домен/.test(normalized) && /доступн/.test(normalized)) {
      const triggerSeg = segments.find((s) => s.chip.kind === "trigger");
      const triggerId =
        triggerSeg && typeof triggerSeg.chip.payload === "string"
          ? triggerSeg.chip.payload
          : undefined;
      chat.append({ role: "user", text, triggerLabel: triggerSeg?.chip.label });
      const id = chat.append({ role: "assistant", text: "", pending: true });
      const n = triggerEdit.checkDomainAvailability(triggerId);
      schedule(() => {
        chat.updatePending(
          id,
          n > 0
            ? `Проверил домены: ${n} ${pluralRu(n, ["домен", "домена", "доменов"])} сейчас недоступны — исключил их.`
            : "Проверил домены — все доступны, ничего исключать не нужно."
        );
      }, 600);
      return;
    }

    if (normalized === LIGHT_QUERY) {
      chat.append({ role: "user", text });
      const id = chat.append({ role: "assistant", text: "", pending: true });
      triggerEdit.randomRemix();
      schedule(() => {
        chat.updatePending(
          id,
          "Перебрал интересы и триггеры — посмотрите выделенные карточки."
        );
      }, 400);
      return;
    }
    if (normalized === HEAVY_QUERY) {
      chat.append({ role: "user", text });
      playComplexThinking({
        steps: COMPLEX_THINKING_STEPS_SIGNAL,
        finalReply: COMPLEX_THINKING_FINAL_REPLY_SIGNAL,
      });
      return;
    }

    const triggerSegment = segments.find((s) => s.chip.kind === "trigger");
    if (triggerSegment && text.length > 0) {
      const parsed = parseTriggerCommand(triggerSegment.text);
      if (parsed.kind !== "fallback") {
        const triggerId = triggerSegment.chip.payload as string;
        chat.append({
          role: "user",
          text: triggerSegment.text,
          triggerLabel: triggerSegment.chip.label,
        });
        const id = chat.append({ role: "assistant", text: "", pending: true });
        triggerEdit.highlightTrigger(triggerId);
        schedule(() => {
          triggerEdit.applyToTrigger(triggerId, parsed);
          chat.updatePending(id, mockReplyFor(parsed));
        }, 350);
        return;
      }
    }

    // Финальный фоллбек: AI-оркестратор (когда есть ключ), иначе — как раньше.
    chat.append({ role: "user", text });
    const pendingId = chat.append({ role: "assistant", text: "", pending: true });
    if (useAi) {
      // История — до текущего сообщения; последние 8, без pending.
      const history = chat.messages
        .filter((m) => !m.pending)
        .slice(-8)
        .map((m) => ({ role: m.role, text: m.text }));
      const { view, campaigns, signals } = appState;
      const screen =
        view.kind === "section" ? `section:${view.name}` : view.kind;
      const dataSummary = buildDataSummary({ campaigns, signals, statsLines: buildStatsLines(campaigns, signals, new Date()) });

      // Контекст визарда (шаг + название)
      const wizardStep = appState.wizardCurrentStep;
      const stepTitle = wizardStep !== null
        ? (STEPPER_ITEMS.find((i) => i.step === wizardStep)?.label ?? String(wizardStep))
        : undefined;

      // Контекст активного триггера из сегмента
      const activeTriggerId = triggerSegment
        ? (triggerSegment.chip.payload as string)
        : undefined;
      const activeTriggerLabel = triggerSegment?.chip.label;

      void fetchAssistMulti({
        text,
        history,
        context: {
          screen,
          dataSummary,
          ...(wizardStep !== null && stepTitle
            ? { wizardStep: { step: wizardStep, title: stepTitle } }
            : {}),
          ...(activeTriggerId
            ? { activeTrigger: { id: activeTriggerId, label: activeTriggerLabel ?? "" } }
            : {}),
        },
      }).then((results) => {
        if (!results) {
          chat.updatePending(pendingId, lookupInformationalReply(text) ?? warmFallbackReply());
          return;
        }
        executeAssistResults(results, pendingId, text, activeTriggerId);
      });
    } else {
      const reply = lookupInformationalReply(text) ?? warmFallbackReply();
      schedule(() => chat.updatePending(pendingId, reply), 350);
    }
  }

  /**
   * Исполняет массив AssistResult из оркестратора (план 006).
   * Поддерживает kinds: answer, clarify, stats, navigate, triggers.
   * Kinds workflow-ops/rebuild/node-params/undo сюда не приходят —
   * воркфлоу-сабмиты идут через prompt-composer.tsx.
   */
  function executeAssistResults(
    results: AssistResult[],
    pendingId: string,
    originalText: string,
    activeTriggerId?: string,
  ) {
    const { campaigns, signals } = appState;
    const confirmations: string[] = [];

    for (const r of results) {
      switch (r.kind) {
        case "answer":
          confirmations.push(r.text);
          break;
        case "clarify":
          confirmations.push(r.questions.join(" "));
          break;
        case "stats":
          appDispatch({ type: "stats_apply_patch", patch: toFiltersPatch(r.patch) });
          confirmations.push(r.confirmation);
          break;
        case "navigate": {
          const target = r.target;
          if (target.kind === "section") {
            appDispatch({ type: "sidebar_nav", section: target.name });
            confirmations.push(r.confirmation);
          } else if (target.kind === "campaign-workflow") {
            const c = campaigns.find((cc) => cc.id === target.campaignId);
            if (c) {
              appDispatch({
                type: "open_workflow",
                campaign: { id: c.id, name: c.name },
                launched: c.status !== "draft",
              });
              confirmations.push(r.confirmation);
            }
            // несуществующий campaignId: подтверждение не пушим —
            // если confirmations пуст по итогу, сработает офлайн-фоллбек
          } else if (target.kind === "signal") {
            const s = signals.find((ss) => ss.id === target.signalId);
            if (s) {
              appDispatch({ type: "signal_opened", id: s.id });
              confirmations.push(r.confirmation);
            }
          }
          break;
        }
        case "triggers": {
          if (!activeTriggerId) break;
          if (r.clearAdded) {
            triggerEdit.applyToTrigger(activeTriggerId, { kind: "clear-added" });
          }
          if (r.clearExcluded) {
            triggerEdit.applyToTrigger(activeTriggerId, { kind: "clear-excluded" });
          }
          if (r.add.length > 0 || r.exclude.length > 0) {
            triggerEdit.applyToTrigger(activeTriggerId, {
              kind: "edit",
              add: r.add,
              exclude: r.exclude,
            });
          }
          confirmations.push(r.confirmation);
          break;
        }
        default:
          // none; workflow-ops/rebuild/node-params/undo сюда не приходят
          break;
      }
    }

    if (confirmations.length > 0) {
      chat.updatePending(pendingId, confirmations.join(" "));
    } else {
      chat.updatePending(pendingId, lookupInformationalReply(originalText) ?? warmFallbackReply());
    }
  }

  return { submit };
}
