/**
 * Системные команды PromptBar — сейчас только apply-all. Чип появляется, когда
 * в очереди черновиков ≥1 элемент и нет активного тега.
 */

import type { SuggestionItem } from "./types";
import { APPLY_ALL_COMMAND } from "@/state/prompt-bar-enter";

const APPLY_ALL: SuggestionItem[] = [
  {
    id: "cmd-apply-all",
    label: APPLY_ALL_COMMAND,
    action: { kind: "command", command: "apply-all" },
    variant: "brand",
  },
];

export function resolveDraftQueue(): SuggestionItem[] {
  return APPLY_ALL;
}
