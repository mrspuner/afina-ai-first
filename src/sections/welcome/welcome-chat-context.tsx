"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { OnboardingChatState } from "./use-onboarding-chat";

const WelcomeChatContext = createContext<OnboardingChatState | null>(null);

export function WelcomeChatProvider({
  value,
  children,
}: {
  value: OnboardingChatState;
  children: ReactNode;
}) {
  return (
    <WelcomeChatContext.Provider value={value}>
      {children}
    </WelcomeChatContext.Provider>
  );
}

/**
 * Optional hook — returns null when used outside the welcome chat provider.
 * ShellBottomBar uses this to route welcome free-text submits into the chat.
 */
export function useWelcomeChat(): OnboardingChatState | null {
  return useContext(WelcomeChatContext);
}
