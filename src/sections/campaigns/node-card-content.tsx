"use client";

import { AlertTriangle, Check, Pencil } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { usePromptInputController } from "@/components/ai-elements/prompt-input";
import type { NodeParams, WorkflowNodeData } from "@/types/workflow";
import { NODE_ACTIONS } from "@/state/node-actions";
import { getFieldMeta } from "@/state/node-field-editability";
import { usePromptChips } from "@/state/prompt-chips-context";
import type { NodeTagPayload } from "@/state/prompt-chips-context";
import { useAppDispatch } from "@/state/app-state-context";
import { cn } from "@/lib/utils";
import { getNodeColor } from "./node-visuals";

type ParamRow = { label: string; value: string };

const PARAM_RENDERERS: {
  [K in NodeParams["kind"]]: (p: Extract<NodeParams, { kind: K }>) => ParamRow[];
} = {
  sms: (p) => [
    { label: "Текст", value: p.text || "—" },
    { label: "Alpha-name", value: p.alphaName || "—" },
    { label: "Время", value: p.scheduledAt === "immediate" ? "Сразу" : p.scheduledAt },
    ...(p.link ? [{ label: "Ссылка", value: p.link }] : []),
  ],
  email: (p) => [
    { label: "Тема", value: p.subject || "—" },
    { label: "Текст", value: p.body || "—" },
    { label: "Отправитель", value: p.sender || "—" },
    ...(p.link ? [{ label: "Ссылка", value: p.link }] : []),
  ],
  push: (p) => [
    { label: "Заголовок", value: p.title || "—" },
    { label: "Текст", value: p.body || "—" },
    ...(p.deeplink ? [{ label: "Deeplink", value: p.deeplink }] : []),
  ],
  ivr: (p) => [
    { label: "Сценарий", value: p.scenario || "—" },
    {
      label: "Голос",
      value:
        p.voiceType === "male"
          ? "Мужской"
          : p.voiceType === "female"
            ? "Женский"
            : "Нейтральный",
    },
  ],
  wait: (p) => [
    { label: "Режим", value: p.mode === "duration" ? "Длительность" : "До события" },
    ...(p.mode === "duration" && p.durationHours !== undefined
      ? [{ label: "Длительность", value: formatDuration(p.durationHours) }]
      : []),
    ...(p.mode === "until_event" && p.untilEvent
      ? [{ label: "Событие", value: p.untilEvent }]
      : []),
  ],
  condition: (p) => [
    { label: "Триггер", value: conditionTriggerLabel(p.trigger) },
  ],
  split: (p) => [
    { label: "По", value: p.by === "segment" ? "Сегменту" : "Случайно" },
    { label: "Ветки", value: String(p.branches) },
  ],
  merge: () => [],
  signal: (p) => [
    { label: "Файл", value: p.fileName },
    { label: "Сигналов", value: String(p.count) },
    {
      label: "Сегменты",
      value: `${p.segments.max}/${p.segments.high}/${p.segments.mid}/${p.segments.low}`,
    },
  ],
  success: (p) => [{ label: "Цель", value: p.goal }],
  end: (p) => (p.reason ? [{ label: "Причина", value: p.reason }] : []),
  storefront: (p) => [
    { label: "Офферы", value: p.offers.length > 0 ? p.offers.join(", ") : "—" },
  ],
  landing: (p) => [
    { label: "CTA", value: p.cta },
    { label: "Оффер", value: p.offerTitle },
  ],
};

function formatDuration(hours: number): string {
  if (hours < 1) return `${Math.round(hours * 60)} мин`;
  if (hours < 24) return `${hours} ч`;
  const days = Math.round(hours / 24);
  return `${days} ${days === 1 ? "день" : days < 5 ? "дня" : "дней"}`;
}

function conditionTriggerLabel(t: string): string {
  switch (t) {
    case "delivered":
      return "Доставлено";
    case "not_delivered":
      return "Не доставлено";
    case "opened":
      return "Открыто";
    case "not_opened":
      return "Не открыто";
    case "clicked":
      return "Кликнуто";
    case "not_clicked":
      return "Не кликнуто";
    default:
      return t;
  }
}

export function getParamRows(params: NodeParams): ParamRow[] {
  const renderer = PARAM_RENDERERS[params.kind];
  // @ts-expect-error — mapped-type narrowing limitation for discriminated union
  return renderer(params);
}

interface NodeCardBodyProps {
  id: string;
  data: WorkflowNodeData;
}

/**
 * Shared body for the expanded node card: attention banner, id, and
 * params list with per-field edit icons.
 * - manual fields: pencil icon (inline edit handler wired in Task 11)
 * - ai fields: mascot icon, pushes chip + prompt template to the prompt bar
 * - readonly fields: no icon
 * Rendered inline inside WorkflowNodeComponent when the node is selected.
 */
export function NodeCardBody({ id, data }: NodeCardBodyProps) {
  const actions = data.params ? NODE_ACTIONS[data.params.kind] ?? [] : [];
  const { textInput } = usePromptInputController();
  const { pushChip } = usePromptChips();
  const dispatch = useAppDispatch();
  const [editing, setEditing] = useState<{ label: string; value: string } | null>(null);

  function commitEdit() {
    if (!editing || !data.params) return;
    const meta = getFieldMeta(data.params.kind, editing.label);
    if (!meta?.paramKey) {
      setEditing(null);
      return;
    }
    dispatch({
      type: "workflow_node_field_set",
      nodeId: id,
      patch: { [meta.paramKey]: editing.value } as Partial<NodeParams>,
    });
    setEditing(null);
  }

  function insertPrompt(template: string) {
    textInput.insertAtCursor(template, {
      separator: "smart",
      preserveTags: true,
    });
  }

  const rows = data.params ? getParamRows(data.params) : [];
  // Map chipLabel → promptTemplate so ai rows can look up their inserter.
  const templateByLabel = new Map(
    actions.map((a) => [a.chipLabel, a.promptTemplate] as const)
  );

  function handleAiField(rowLabel: string) {
    const nodeType = data.nodeType;
    const payload: NodeTagPayload = {
      nodeId: id,
      nodeType,
      color: getNodeColor(nodeType),
      paramLabel: rowLabel,
    };
    pushChip({
      // Один активный тег на инпут — id фиксированный по узлу+полю, повторный
      // клик переписывает чип, а не плодит новые (push дедупит по id).
      id: `nodefield_${id}_${rowLabel}`,
      kind: "node",
      // Имя узла не пишем — цвет тега обозначает узел (спека M5.2).
      label: rowLabel,
      payload,
      removable: true,
    });
  }

  return (
    <div className="flex flex-col gap-2 text-left">
      {data.attentionReason && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 px-2.5 py-1.5 text-[11px] text-amber-200"
        >
          <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
          <span>{data.attentionReason}</span>
        </div>
      )}

      <div className="text-[10px] text-muted-foreground/50">id: {id}</div>

      {rows.length > 0 && (
        <div className="flex flex-col gap-0.5">
          {rows.map((row) => {
            const meta = data.params
              ? getFieldMeta(data.params.kind, row.label)
              : undefined;
            const editability = meta?.editability;
            // Persistent yellow dot on a field whose param was edited.
            const isDirty = meta?.paramKey
              ? data.dirtyParams?.includes(meta.paramKey) ?? false
              : false;
            const dirtyDot = isDirty ? (
              <span
                aria-hidden
                title="Параметр изменён"
                className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#FFEC00]"
              />
            ) : null;
            const isEditingRow = editing?.label === row.label;
            const rowGrid =
              "grid grid-cols-[minmax(72px,max-content)_1fr_auto] items-center gap-x-2.5 text-[11px]";

            // While editing, the row hosts an <input> + save button — it can't
            // be a <button> (no nested interactives), so render the plain grid.
            if (isEditingRow) {
              return (
                <div key={row.label} className={cn(rowGrid, "px-1 py-0.5")}>
                  <span className="text-muted-foreground">{row.label}</span>
                  <input
                    autoFocus
                    value={editing.value}
                    onChange={(e) => setEditing({ label: row.label, value: e.target.value })}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") commitEdit();
                      if (e.key === "Escape") setEditing(null);
                    }}
                    className="nodrag min-w-0 flex-1 rounded border border-border bg-background px-1.5 py-0.5 text-[11px] text-foreground"
                  />
                  <button
                    type="button"
                    aria-label="Сохранить поле"
                    className="nodrag ml-1 flex shrink-0 items-center text-muted-foreground/50 hover:text-muted-foreground focus-visible:outline-none"
                    onClick={(e) => {
                      e.stopPropagation();
                      commitEdit();
                    }}
                  >
                    <Check className="h-3 w-3" />
                  </button>
                </div>
              );
            }

            // Whole-row affordance: clicking anywhere on a manual row opens its
            // inline editor; on an ai row sends the field tag to the prompt bar.
            // The trailing icon is now just a visual marker, not the only target.
            const interactive = editability === "manual" || editability === "ai";
            const icon =
              editability === "manual" ? (
                <Pencil className="h-3 w-3" />
              ) : editability === "ai" ? (
                <Image src="/mascot-icon.svg" width={12} height={12} alt="" aria-hidden />
              ) : null;

            if (!interactive) {
              return (
                <div key={row.label} className={cn(rowGrid, "px-1 py-0.5")}>
                  <span className="text-muted-foreground">{row.label}</span>
                  <span className="truncate text-foreground" title={row.value}>
                    {row.value}
                  </span>
                  <span className="flex items-center justify-end">{dirtyDot}</span>
                </div>
              );
            }

            return (
              <button
                key={row.label}
                type="button"
                aria-label={
                  editability === "manual"
                    ? `Редактировать поле «${row.label}»`
                    : `Передать поле «${row.label}» ассистенту`
                }
                onClick={(e) => {
                  e.stopPropagation();
                  if (editability === "manual") {
                    setEditing({ label: row.label, value: row.value });
                  } else {
                    handleAiField(row.label);
                  }
                }}
                className={cn(
                  rowGrid,
                  "group nodrag rounded px-1 py-0.5 text-left transition-colors",
                  "hover:bg-white/5 focus-visible:bg-white/5 focus-visible:outline-none"
                )}
              >
                <span className="text-muted-foreground">{row.label}</span>
                <span className="truncate text-foreground" title={row.value}>
                  {row.value}
                </span>
                <span className="ml-1 flex shrink-0 items-center gap-1.5 text-muted-foreground/50 transition-colors group-hover:text-muted-foreground">
                  {dirtyDot}
                  {icon}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
