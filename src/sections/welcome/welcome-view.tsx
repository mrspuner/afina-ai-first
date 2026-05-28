"use client";

import { AnimatePresence, motion } from "motion/react";
import { Button } from "@/components/ui/button";
import { isCampaignDone } from "@/state/app-state";
import { useAppDispatch, useAppState } from "@/state/app-state-context";
import { OnboardingChatHistory } from "./onboarding-chat-view";
import { OnboardingStepCards } from "./onboarding-step-cards";
import type { OnboardingChatState } from "./use-onboarding-chat";

const HERO_EASE = [0.32, 0.72, 0, 1] as const;

export function WelcomeView({ chat }: { chat: OnboardingChatState }) {
  const state = useAppState();
  const dispatch = useAppDispatch();
  const done = isCampaignDone(state);

  // The conversation counts as started the moment any message (including
  // the pending bot bubble) is in history — that drives the hero exit.
  const conversationStarted = chat.history.length > 0;

  const surveyCompleted = state.surveyStatus === "completed";

  return (
    <div
      className="flex flex-1 flex-col items-center justify-center overflow-y-auto px-6 pt-16 pb-promptbar"
    >
      <motion.div
        layout
        transition={{ duration: 0.42, ease: HERO_EASE }}
        className="flex w-full max-w-2xl flex-col items-start gap-8"
      >
        {done ? (
          <div className="flex w-full flex-col items-start gap-2">
            <h1 className="text-[28px] font-bold leading-8 text-foreground">
              Добро пожаловать
            </h1>
            <p className="text-[18px] leading-[22px] text-muted-foreground">
              Что вы хотите сделать
            </p>
          </div>
        ) : (
          <AnimatePresence initial={false} mode="popLayout">
            {!conversationStarted && (
              <motion.div
                key="hero"
                initial={false}
                exit={{ opacity: 0, y: -20, filter: "blur(10px)" }}
                transition={{ duration: 0.42, ease: HERO_EASE }}
                className="flex w-full flex-col items-start gap-8"
              >
                {surveyCompleted ? (
                  <ReturningHero
                    onCreateScenario={() => dispatch({ type: "start_signal_flow" })}
                  />
                ) : (
                  <FirstTimeHero
                    onOpenSurvey={() => dispatch({ type: "open_survey" })}
                  />
                )}
              </motion.div>
            )}
          </AnimatePresence>
        )}

        <motion.div
          layout
          transition={{ duration: 0.42, ease: HERO_EASE }}
          className="w-full"
        >
          <OnboardingChatHistory history={chat.history} />
        </motion.div>
      </motion.div>
    </div>
  );
}

function FirstTimeHero({ onOpenSurvey }: { onOpenSurvey: () => void }) {
  return (
    <>
      <div className="flex w-full flex-col items-start gap-3">
        <h1 className="text-[28px] font-bold leading-8 text-foreground">
          Добро пожаловать в афина
        </h1>
        <p className="text-[16px] leading-[22px] text-muted-foreground">
          афина работает сценариями. Сценарий — это готовый план работы с
          вашей аудиторией: он находит нужных клиентов, запускает кампанию и
          показывает результат.
        </p>
        <p className="text-[16px] leading-[22px] text-muted-foreground">
          Каждый сценарий состоит из трёх частей — сигнал, кампания и
          статистика. Вот как это устроено:
        </p>
      </div>

      <OnboardingStepCards />

      <div className="flex w-full flex-col items-start gap-3 rounded-lg border border-border bg-card p-5">
        <h2 className="text-[18px] font-semibold leading-6 text-foreground">
          Подберём сценарии под ваш бизнес
        </h2>
        <p className="text-[14px] leading-[20px] text-muted-foreground">
          Расскажите о себе за минуту — и афина предложит сценарии, которые
          подойдут именно вашей кампании.
        </p>
        <Button size="lg" className="mt-1" onClick={onOpenSurvey}>
          Расскажите о себе
        </Button>
      </div>
    </>
  );
}

function ReturningHero({ onCreateScenario }: { onCreateScenario: () => void }) {
  return (
    <>
      <div className="flex w-full flex-col items-start gap-2">
        <h1 className="text-[28px] font-bold leading-8 text-foreground">
          Добро пожаловать в афина
        </h1>
        <p className="text-[16px] leading-[22px] text-muted-foreground">
          Сценарии уже подобраны под ваш бизнес — запустите ещё один.
        </p>
      </div>

      <Button size="lg" onClick={onCreateScenario}>
        Запустить новый сценарий →
      </Button>
    </>
  );
}
