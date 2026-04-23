"use client";

import { OnboardingSteps } from "./onboarding-steps";
import { WelcomePrompt } from "./welcome-prompt";
import { CAPTION } from "./onboarding-scripts";

export function WelcomeView() {
  return (
    <div className="flex flex-1 items-center justify-center overflow-y-auto px-6 py-10">
      <div className="flex w-full max-w-3xl flex-col items-center gap-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground">Добро пожаловать</h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Три шага до первой кампании —<br />
            начните с получения сигналов
          </p>
        </div>

        <div className="flex flex-col items-center gap-3">
          <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground/80">
            {CAPTION}
          </p>
          <OnboardingSteps />
        </div>

        <div className="w-full">
          <WelcomePrompt />
        </div>
      </div>
    </div>
  );
}
