"use client";

import { X } from "lucide-react";
import type { WorkflowNodeData, WorkflowNodeType } from "@/types/workflow";
import { NODE_CATEGORY } from "@/types/workflow";

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

export function NodeControlPanel({ node, onClose }: NodeControlPanelProps) {
  const { id, data } = node;
  const typeLabel = TYPE_LABEL[data.nodeType] ?? data.nodeType;
  const category = NODE_CATEGORY[data.nodeType];

  return (
    <div className="pointer-events-auto fixed inset-x-0 bottom-[120px] z-30 px-8">
      <div
        data-testid="node-control-panel"
        className="mx-auto flex w-full max-w-2xl items-start gap-3 rounded-lg border border-border bg-card/95 px-4 py-3 text-sm shadow-lg backdrop-blur"
      >
        <div className="flex-1 min-w-0">
          <div className="mb-1 flex items-center gap-2">
            <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
              {typeLabel}
            </span>
            <span className="text-xs text-muted-foreground">@{id}</span>
            <span className="text-xs text-muted-foreground/60">· {category}</span>
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
    </div>
  );
}
