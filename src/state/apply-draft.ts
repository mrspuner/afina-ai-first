import type { Dispatch } from "react";
import type { PromptChip } from "./prompt-chips-context";
import { isNodeTagPayload } from "./prompt-chips-context";

/** Команда из `workflow_node_command_submit` (см. `Action` в `app-state.ts`). */
export interface NodeCommand {
  /** Имя узла — fallback-резолвинг (путь сегментов ShellBottomBar). */
  nodeLabel?: string;
  /** id узла workflow — точный резолвинг (теги AI-полей / узла из промпт-бара). */
  nodeId?: string;
  text: string;
}

/**
 * Применяет один черновик (тег + текст) к узлу workflow. Для node-тега
 * диспатчит `workflow_node_command_submit` — downstream-редьюсер
 * (`WorkflowSection`) сопоставляет команду с узлом: по `nodeId` (точно), либо
 * по `nodeLabel` (fallback). У тега AI-поля `chip.label` — это имя поля
 * («Текст», «Тема»), а не лейбл узла, поэтому label-резолвинг для него не
 * сработал бы — резолвинг идёт по `payload.nodeId`. Для нераспознанного
 * тега или пустого текста — no-op.
 */
export function applyDraftToNode(
  dispatch: Dispatch<{
    type: "workflow_node_command_submit";
    commands: NodeCommand[];
  }>,
  chip: PromptChip,
  text: string
): void {
  if (text.trim().length === 0) return;
  if (isNodeTagPayload(chip.payload)) {
    dispatch({
      type: "workflow_node_command_submit",
      // nodeId — надёжный идентификатор; nodeLabel передаётся как fallback.
      commands: [{ nodeId: chip.payload.nodeId, nodeLabel: chip.label, text }],
    });
  }
}
