"use client";

import { isCampaignDone } from "@/state/app-state";
import { useAppState } from "@/state/app-state-context";
import { OnboardingChatView } from "./onboarding-chat-view";
import { OnboardingSteps } from "./onboarding-steps";
import type { OnboardingChatState } from "./use-onboarding-chat";

export function WelcomeView({ chat }: { chat: OnboardingChatState }) {
  const state = useAppState();
  const done = isCampaignDone(state);

  return (
    <div
      className="flex flex-1 flex-col items-center overflow-y-auto px-6 pt-16"
      style={{ paddingBottom: "calc(var(--promptbar-height, 140px) + 40px)" }}
    >
      <div className="flex w-full max-w-2xl flex-col items-center gap-8">
        {done ? (
          <div className="text-center">
            <h1 className="text-2xl font-bold text-foreground">Добро пожаловать</h1>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Что вы хотите сделать
            </p>
          </div>
        ) : (
          <>
            <div className="text-center">
              <h1 className="text-2xl font-bold text-foreground">Добро пожаловать</h1>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Три шага до первой кампании —<br />
                начните с получения сигналов
              </p>
            </div>
            <OnboardingSteps />
          </>
        )}

        <OnboardingChatView
          history={chat.history}
          chips={chat.chips}
          onChipClick={chat.submitChip}
        />
      </div>
    </div>
  );
}
