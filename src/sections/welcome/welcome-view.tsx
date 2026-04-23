"use client";

import { isCampaignDone } from "@/state/app-state";
import { useAppState } from "@/state/app-state-context";
import { OnboardingChatHistory } from "./onboarding-chat-view";
import { OnboardingStepCards } from "./onboarding-step-cards";
import type { OnboardingChatState } from "./use-onboarding-chat";

export function WelcomeView({ chat }: { chat: OnboardingChatState }) {
  const state = useAppState();
  const done = isCampaignDone(state);

  return (
    <div
      className="flex flex-1 flex-col items-center overflow-y-auto px-6 pt-16"
      style={{ paddingBottom: "calc(var(--promptbar-height, 220px) + 40px)" }}
    >
      <div className="flex w-full max-w-2xl flex-col items-center gap-8">
        {done ? (
          <div className="flex w-full flex-col items-center gap-2 text-center">
            <h1 className="text-[28px] font-bold leading-8 text-foreground">
              Добро пожаловать
            </h1>
            <p className="text-[18px] leading-[22px] text-muted-foreground">
              Что вы хотите сделать
            </p>
          </div>
        ) : (
          <>
            <div className="flex w-full flex-col items-center gap-2 text-center">
              <h1 className="text-[28px] font-bold leading-8 text-foreground">
                Добро пожаловать в афина
              </h1>
              <p className="text-[18px] leading-[22px] text-muted-foreground">
                Платформа превращает поведенческие сигналы ваших клиентов
                в автоматические кампании — в нужный момент, по нужному каналу
              </p>
            </div>
            <OnboardingStepCards />
          </>
        )}

        <OnboardingChatHistory history={chat.history} />
      </div>
    </div>
  );
}
