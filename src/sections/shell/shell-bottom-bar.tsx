"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { Mic, ChevronRight } from "lucide-react";
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
  isCampaignDone,
  isOnWelcome,
  isStep1Active,
  isStep2Active,
  isStep3Active,
  isWorkflowView,
  type View,
} from "@/state/app-state";

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

function AttachmentEffect({
  view,
  signalScenarioId,
}: {
  view: View;
  signalScenarioId: string;
}) {
  const { attachments } = usePromptInputController();
  const inCampaignSelect = view.kind === "campaign-select";

  useEffect(() => {
    if (inCampaignSelect && signalScenarioId) {
      const content = JSON.stringify({ scenario: signalScenarioId });
      const file = new File([content], `сигнал_${signalScenarioId}.json`, {
        type: "application/json",
      });
      attachments.add([file]);
    } else {
      attachments.clear();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inCampaignSelect, signalScenarioId]);

  return null;
}

export function ShellBottomBar() {
  const state = useAppState();
  const dispatch = useAppDispatch();
  const { view, signal } = state;
  const signalScenarioId = signal?.scenarioId ?? "";

  const [stepTwoNew, setStepTwoNew] = useState(false);
  const prevViewKind = useRef<View["kind"] | null>(null);
  useEffect(() => {
    if (view.kind === "awaiting-campaign" && prevViewKind.current !== "awaiting-campaign") {
      setStepTwoNew(true);
      const t = setTimeout(() => setStepTwoNew(false), 1400);
      prevViewKind.current = view.kind;
      return () => clearTimeout(t);
    }
    prevViewKind.current = view.kind;
  }, [view.kind]);

  function handlePromptSubmit(message: PromptInputMessage) {
    if (view.kind === "workflow" && !view.launched) {
      dispatch({ type: "workflow_command_submit", text: message.text ?? "" });
    }
  }

  const chatPlaceholder =
    isWorkflowView(state) ? "Опишите изменение сценария..." :
    view.kind === "campaign-select" ? "Опишите вашу кампанию..." :
    view.kind === "guided-signal" ? "Введите ваши параметры или задайте вопрос" :
    "Выберите шаг или задайте вопрос…";

  const floatBottom = isOnWelcome(state) ? "40%" : "3%";

  return (
    <>
      <AttachmentEffect view={view} signalScenarioId={signalScenarioId} />
      <motion.div
        className="fixed left-[120px] right-0 z-30 bg-background px-8 pb-4"
        initial={false}
        animate={{ bottom: floatBottom }}
        transition={{ duration: 0.55, ease: [0.32, 0.72, 0, 1] }}
      >
        <div className="pointer-events-none absolute inset-x-0 -top-10 h-10 bg-gradient-to-t from-background to-transparent" />
        <div className="relative mx-auto flex w-full max-w-2xl flex-col gap-2 pt-2">
          {view.kind === "workflow" && !view.launched && (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() =>
                  dispatch({
                    type: "campaign_launched",
                    typeName: view.campaign.name,
                    launchedAt: new Date().toLocaleDateString("ru-RU"),
                  })
                }
                className="rounded-lg bg-foreground px-5 py-2 text-sm font-semibold text-background transition-opacity hover:opacity-90"
              >
                Начать кампанию →
              </button>
            </div>
          )}

          <PromptInput onSubmit={handlePromptSubmit}>
            <AttachmentFileList />
            <PromptInputBody>
              <PromptInputTextarea placeholder={chatPlaceholder} />
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

          {!isCampaignDone(state) && (
            <div className="flex gap-2">
              {([
                {
                  n: 1,
                  label: "Получение сигнала",
                  active: isStep1Active(state),
                  onClick: isOnWelcome(state)
                    ? () => dispatch({ type: "start_signal_flow" })
                    : undefined,
                },
                {
                  n: 2,
                  label: "Запуск кампании",
                  active: isStep2Active(state),
                  onClick:
                    view.kind === "awaiting-campaign"
                      ? () => dispatch({ type: "step2_clicked" })
                      : undefined,
                },
                {
                  n: 3,
                  label: "Статистика кампании",
                  active: isStep3Active(state),
                  onClick: undefined,
                },
              ] as const).map(({ n, label, active, onClick }) => (
                <button
                  key={n}
                  type="button"
                  disabled={!active}
                  onClick={onClick}
                  className={cn(
                    "flex items-center gap-2 rounded-lg border px-3 py-2 text-left transition-colors",
                    active
                      ? onClick
                        ? "cursor-pointer border-border bg-card hover:bg-accent"
                        : "cursor-default border-border bg-card"
                      : "cursor-not-allowed border-border/40 bg-card/40 opacity-35"
                  )}
                  style={
                    stepTwoNew && n === 2
                      ? { animation: "step-badge-pulse 1.4s ease-in-out" }
                      : undefined
                  }
                >
                  <span className="shrink-0 text-[11px] font-semibold text-muted-foreground">
                    Шаг {n}
                  </span>
                  <div className="h-3 w-px shrink-0 bg-border" />
                  <span className="text-sm font-medium text-foreground">{label}</span>
                  {active && onClick && (
                    <ChevronRight className="ml-1 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  )}
                </button>
              ))}
            </div>
          )}

          <style>{`
            @keyframes step-badge-pulse {
              0%, 100% { border-color: #1e1e1e; box-shadow: none; }
              20%, 60% { border-color: #4ade80; box-shadow: 0 0 8px rgba(74,222,128,0.35); }
              40%, 80% { border-color: #1e1e1e; box-shadow: none; }
            }
          `}</style>
        </div>
      </motion.div>
    </>
  );
}
