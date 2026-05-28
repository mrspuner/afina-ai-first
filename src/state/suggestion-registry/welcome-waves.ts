/**
 * Адаптер к диалоговому графу welcome-онбординга (WAVES в onboarding-chat.ts).
 * Граф остаётся источником истины — реестр получает уже актуальный массив
 * чипов из `useOnboardingChat` и просто оборачивает каждый чип в
 * `SuggestionItem` с action `chat-submit`.
 */

import type { Chip as WelcomeChip } from "@/sections/welcome/onboarding-chat";
import type { SuggestionItem } from "./types";

export function resolveWelcomeWave(
  chips: readonly WelcomeChip[]
): SuggestionItem[] {
  return chips.map((chip) => ({
    id: `welcome-${chip.id}`,
    label: chip.label,
    action: { kind: "chat-submit", chip },
  }));
}
