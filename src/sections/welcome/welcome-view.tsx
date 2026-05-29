"use client";

import { Button } from "@/components/ui/button";
import { isCampaignDone } from "@/state/app-state";
import { useAppDispatch, useAppState } from "@/state/app-state-context";
import { OnboardingStepCards } from "./onboarding-step-cards";

/**
 * Welcome-экран. Статичен: онбординг-вопросы теперь уходят в общий чат/drawer
 * (см. useOnboardingChat), поэтому экран больше не «морфится» при старте
 * диалога — герой остаётся на месте.
 */
export function WelcomeView() {
  const state = useAppState();
  const dispatch = useAppDispatch();
  const done = isCampaignDone(state);
  const surveyCompleted = state.surveyStatus === "completed";

  return (
    <div className="flex flex-1 flex-col items-center justify-center overflow-y-auto px-6 pt-16 pb-promptbar">
      <div className="flex w-full max-w-2xl flex-col items-start gap-8">
        <FirstTimeHero
          surveyCompleted={surveyCompleted || done}
          onOpenSurvey={() => dispatch({ type: "open_survey" })}
          onCreateScenario={() => dispatch({ type: "start_signal_flow" })}
        />
      </div>
    </div>
  );
}

function FirstTimeHero({
  surveyCompleted,
  onOpenSurvey,
  onCreateScenario,
}: {
  surveyCompleted: boolean;
  onOpenSurvey: () => void;
  onCreateScenario: () => void;
}) {
  return (
    <>
      <div className="flex w-full flex-col items-start gap-3">
        <h1 className="text-[28px] font-bold leading-8 text-foreground">
          Добро пожаловать в афина
        </h1>
        <p className="text-[18px] leading-[26px] text-muted-foreground">
          В афине собраны готовые сценарии для работы с вашими клиентами:
          удержание, допродажи, реактивация и другие. Выберите сигнал по
          нужному сценарию, запустите кампанию, отслеживайте результат в
          статистике.
        </p>
      </div>

      <div className="flex w-full flex-col items-start gap-7">
        <OnboardingStepCards />

        <div className="flex w-full flex-row items-center gap-4 rounded-lg border border-brand/30 bg-brand-muted p-6">
          <div className="flex flex-1 flex-col gap-2">
            <h2 className="text-base font-medium text-foreground">
              {surveyCompleted
                ? "Подобрали 24 сценария под ваш бизнес"
                : "Расскажите о вашей задаче — подберём сценарии"}
            </h2>
            <p className="text-sm leading-relaxed text-foreground/70">
              {surveyCompleted
                ? "Запустите поиск сигналов по этим сценариям или выберите свой сценарий из каталога"
                : "За минуту афина предложит подходящие варианты."}
            </p>
          </div>
          {surveyCompleted ? (
            <Button onClick={onCreateScenario} className="shrink-0">
              Найти сигналы
            </Button>
          ) : (
            <Button onClick={onOpenSurvey} className="shrink-0">
              Подобрать сценарии
            </Button>
          )}
        </div>
      </div>
    </>
  );
}
