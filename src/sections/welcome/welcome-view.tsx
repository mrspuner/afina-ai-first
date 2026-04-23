"use client";

import { AnimatePresence, motion } from "motion/react";
import { isCampaignDone } from "@/state/app-state";
import { useAppState } from "@/state/app-state-context";
import { OnboardingChatHistory } from "./onboarding-chat-view";
import { OnboardingStepCards } from "./onboarding-step-cards";
import type { OnboardingChatState } from "./use-onboarding-chat";

const HERO_EASE = [0.32, 0.72, 0, 1] as const;

export function WelcomeView({ chat }: { chat: OnboardingChatState }) {
  const state = useAppState();
  const done = isCampaignDone(state);

  // The conversation counts as started the moment any message (including
  // the pending bot bubble) is in history — that drives the hero exit.
  const conversationStarted = chat.history.length > 0;

  return (
    <div
      className="flex flex-1 flex-col items-center justify-center overflow-y-auto px-6 pt-16"
      style={{ paddingBottom: "calc(var(--promptbar-height, 220px) + 40px)" }}
    >
      <motion.div
        layout
        transition={{ duration: 0.52, ease: HERO_EASE }}
        className="flex w-full max-w-2xl flex-col items-center gap-8"
      >
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
          // mode="popLayout" positions the exiting hero absolutely during
          // its exit animation — so the chat bubbles below can reflow
          // into the freed space *while* the hero is still fading, not
          // after it finishes.
          <AnimatePresence initial={false} mode="popLayout">
            {!conversationStarted && (
              <motion.div
                key="hero"
                initial={false}
                exit={{ opacity: 0, y: -20, filter: "blur(10px)" }}
                transition={{ duration: 0.52, ease: HERO_EASE }}
                className="flex w-full flex-col items-center gap-8"
              >
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
              </motion.div>
            )}
          </AnimatePresence>
        )}

        {/* `layout` here is what makes the chat smoothly rise up as the
            hero pops out — without it, chat would stay put until exit
            finished, then snap to its new position. */}
        <motion.div
          layout
          transition={{ duration: 0.52, ease: HERO_EASE }}
          className="w-full"
        >
          <OnboardingChatHistory history={chat.history} />
        </motion.div>
      </motion.div>
    </div>
  );
}
