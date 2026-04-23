"use client";

import { useWelcomeChat } from "./welcome-chat-context";
import { WelcomeView } from "./welcome-view";

export function WelcomeSection() {
  const chat = useWelcomeChat();
  if (!chat) return null;
  return <WelcomeView chat={chat} />;
}
