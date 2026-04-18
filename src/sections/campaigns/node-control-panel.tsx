"use client";

import { X } from "lucide-react";
import { motion } from "motion/react";
import {
  usePromptInputController,
} from "@/components/ai-elements/prompt-input";
import type { NodeParams, WorkflowNodeData, WorkflowNodeType } from "@/types/workflow";
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
  wait: "Задержка",
  condition: "Условие",
  merge: "Слияние",
  sms: "СМС",
  email: "Email",
  push: "Push",
  ivr: "Звонок",
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

export function NodeControlPanel({ node, onClose }: NodeControlPanelProps) {
  const { id, data } = node;
  const typeLabel = TYPE_LABEL[data.nodeType] ?? data.nodeType;
  const category = NODE_CATEGORY[data.nodeType];
  const chips = CATEGORY_CHIPS[category];
  const { textInput } = usePromptInputController();

  function insertChip(chipText: string) {
    textInput.insertAtCursor(chipText, { separator: "smart" });
  }

  return (
    <motion.div
      key="node-control-panel"
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 20, opacity: 0 }}
      transition={{ duration: 0.25, ease: [0.32, 0.72, 0, 1] }}
      className="pointer-events-auto fixed left-[120px] right-0 z-30 px-8"
      style={{ bottom: "var(--promptbar-height, 120px)" }}
    >
      <div
        role="region"
        aria-label="Управление нодой"
        data-testid="node-control-panel"
        className="mx-auto flex w-full max-w-2xl flex-col gap-2 rounded-t-lg border border-b-0 border-border bg-card/95 px-4 py-3 text-sm backdrop-blur-sm"
      >
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
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
        {data.params && (() => {
          const params = data.params;
          const renderer = PARAM_RENDERERS[params.kind];
          // @ts-expect-error — mapped-type narrowing limitation for discriminated union
          const rows: ParamRow[] = renderer(params);
          if (rows.length === 0) return null;
          return (
            <>
              <div className="my-1 border-t border-border" />
              <div className="flex flex-col gap-1">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">
                  Параметры
                </p>
                <dl className="grid grid-cols-[minmax(80px,max-content)_1fr] gap-x-3 gap-y-1 text-xs">
                  {rows.map((row) => (
                    <div key={row.label} className="contents">
                      <dt className="text-muted-foreground">{row.label}</dt>
                      <dd
                        className="truncate text-foreground"
                        title={row.value}
                      >
                        {row.value}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
            </>
          );
        })()}
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
    </motion.div>
  );
}
