import type { Dispatch } from "react";
import type { PromptChip } from "./prompt-chips-context";
import { isNodeTagPayload } from "./prompt-chips-context";

/**
 * Применяет один черновик (тег + текст) к узлу workflow. Для node-тега
 * диспатчит `workflow_node_command_submit` — downstream-редьюсер
 * (`WorkflowView`) сопоставляет команду с узлом по `nodeLabel` и парсит
 * текст через NODE_ACTIONS, обновляя параметры. Для нераспознанного тега —
 * no-op.
 *
 * Контракт `commands` совпадает с `Action` в `app-state.ts`:
 * `{ type: "workflow_node_command_submit"; commands: Array<{ nodeLabel; text }> }`.
 */
export function applyDraftToNode(
  dispatch: Dispatch<{
    type: "workflow_node_command_submit";
    commands: { nodeLabel: string; text: string }[];
  }>,
  chip: PromptChip,
  text: string
): void {
  if (text.trim().length === 0) return;
  if (isNodeTagPayload(chip.payload)) {
    dispatch({
      type: "workflow_node_command_submit",
      commands: [{ nodeLabel: chip.label, text }],
    });
  }
}
