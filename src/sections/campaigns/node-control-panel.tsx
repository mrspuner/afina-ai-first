"use client";

import { X } from "lucide-react";
import {
  usePromptInputController,
} from "@/components/ai-elements/prompt-input";
import type { WorkflowNodeData, WorkflowNodeType } from "@/types/workflow";
import { NODE_CATEGORY, type NodeCategory } from "@/types/workflow";

interface NodeControlPanelProps {
  node: { id: string; data: WorkflowNodeData };
  onClose: () => void;
}

const TYPE_LABEL: Record<WorkflowNodeType, string> = {
  signal: "Сигнал",
  success: "Успех",
  end: "Конец",
  split: "Сплиттер",
  wait: "Ожидание",
  condition: "Условие",
  merge: "Слияние",
  sms: "SMS",
  email: "Email",
  push: "Push",
  ivr: "IVR / Звонок",
  storefront: "Витрина",
  landing: "Лендинг",
  default: "Нода",
  channel: "Канал",
  retarget: "Ретаргет",
  result: "Результат",
  new: "Новая",
};

const CATEGORY_CHIPS: Record<NodeCategory, string[]> = {
  communication: ["Изменить текст", "Задержка 2 часа", "Добавить ссылку"],
  logic: ["Добавить ветку", "Убрать"],
  web: ["Сменить оффер", "Добавить баннер"],
  endpoint: ["Изменить цель"],
  legacy: ["Переименовать", "Обновить"],
};

export function NodeControlPanel({ node, onClose }: NodeControlPanelProps) {
  const { id, data } = node;
  const typeLabel = TYPE_LABEL[data.nodeType] ?? data.nodeType;
  const category = NODE_CATEGORY[data.nodeType];
  const chips = CATEGORY_CHIPS[category];
  const { textInput } = usePromptInputController();

  function insertChip(chipText: string) {
    const prefix = `@${data.label} `;
    textInput.setInput(`${prefix}${chipText}`);
  }

  return (
    <div className="pointer-events-auto fixed inset-x-0 bottom-[120px] z-30 px-8">
      <div
        role="region"
        aria-label="Управление нодой"
        data-testid="node-control-panel"
        className="mx-auto flex w-full max-w-2xl flex-col gap-2 rounded-lg border border-border bg-card/95 px-4 py-3 text-sm shadow-lg backdrop-blur"
      >
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <div className="mb-1 flex flex-wrap items-center gap-2">
              <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                {typeLabel}
              </span>
              <span className="text-xs text-muted-foreground">@{data.label}</span>
              <span className="text-xs text-muted-foreground/60">· {category}</span>
              <span className="text-xs text-muted-foreground/40">id: {id}</span>
            </div>
            <p className="truncate text-sm font-medium text-foreground">{data.label}</p>
            {data.sublabel && (
              <p className="truncate text-xs text-muted-foreground">{data.sublabel}</p>
            )}
            <p className="mt-1 text-xs text-muted-foreground/80">
              Изменить через промпт ниже.
            </p>
          </div>
          <button
            type="button"
            aria-label="Закрыть панель ноды"
            onClick={onClose}
            className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        {chips.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {chips.map((chip) => (
              <button
                key={chip}
                type="button"
                onClick={() => insertChip(chip)}
                className="rounded-full border border-border bg-muted/40 px-2.5 py-0.5 text-xs text-foreground transition-colors hover:bg-muted"
              >
                {chip}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
