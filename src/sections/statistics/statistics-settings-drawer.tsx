"use client";

import { Fragment } from "react";
import { GripVerticalIcon, Trash2Icon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

import { GroupedSelect } from "./fields/grouped-select";
import { PeriodField } from "./fields/period-field";
import { SimpleSelect } from "./fields/simple-select";
import { SaveTemplatePopover } from "./save-template-dialog";
import { SearchConditionsBlock } from "./search-conditions";
import type { ReportTemplate } from "./report-templates";
import type {
  CalcMethod,
  ColumnKey,
  Currency,
  RowKind,
  StatisticsAction,
  StatisticsFilters,
} from "./statistics-state";

const CALC_METHOD_OPTIONS: readonly { value: CalcMethod; label: string }[] = [
  { value: "funnel", label: "Воронка" },
  { value: "cohort", label: "Когорта" },
  { value: "attribution", label: "Атрибуция" },
] as const;

const CURRENCY_OPTIONS: readonly { value: Currency; label: string }[] = [
  { value: "rub", label: "₽ Рубли" },
  { value: "usd", label: "$ Доллары" },
  { value: "eur", label: "€ Евро" },
] as const;

const ROW_GROUPS = [
  {
    heading: "Даты",
    options: [
      { value: "days", label: "Дни" },
      { value: "weekdays", label: "Дни недели" },
      { value: "weeks", label: "Недели" },
      { value: "months", label: "Месяцы" },
    ],
  },
  {
    heading: "Параметры",
    options: [
      { value: "offers", label: "Предложения" },
      { value: "subscribers", label: "Абоненты" },
      { value: "channels", label: "Каналы" },
      { value: "creatives", label: "Креативы" },
      { value: "triggers", label: "Триггеры" },
      { value: "landings", label: "Лендинги" },
    ],
  },
  {
    heading: "Коммуникации",
    options: [
      { value: "campaigns", label: "Кампании" },
      { value: "scenarios", label: "Сценарии" },
      { value: "strategies", label: "Стратегии" },
    ],
  },
  {
    heading: "Контрагенты",
    options: [
      { value: "advertisers", label: "Рекламодатели" },
      { value: "traffic-suppliers", label: "Поставщики трафика" },
    ],
  },
] as const;

const SUB_ROW_GROUPS = [
  {
    heading: "Не разделять",
    options: [{ value: "none", label: "Без подстрок" }],
  },
  ...ROW_GROUPS,
] as const;

const COLUMN_LABELS: Record<ColumnKey, string> = {
  approves: "Approves",
  expenses: "Expenses",
  income: "Income",
  holds: "Holds",
  rejects: "Rejects",
  clicks: "Clicks",
  sends: "Sends",
  actions: "Actions",
  ar: "AR, %",
  rr: "RR, %",
};

const ALL_COLUMNS: ColumnKey[] = [
  "approves",
  "expenses",
  "income",
  "holds",
  "rejects",
  "clicks",
  "sends",
  "actions",
  "ar",
  "rr",
];

export function StatisticsSettingsDrawer({
  open,
  onOpenChange,
  template,
  draft,
  dispatch,
  dirty,
  onApply,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: ReportTemplate;
  draft: StatisticsFilters;
  dispatch: (action: StatisticsAction) => void;
  dirty: boolean;
  onApply: () => void;
  onSave: (name: string) => void;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent width="640px" className="gap-0">
        <SheetHeader className="border-b border-border">
          <SheetTitle>{template.name}</SheetTitle>
        </SheetHeader>

        <SheetBody className="flex flex-col gap-8 pt-6">
          <Descriptions
            rows={[
              { label: "Тип отчета", value: template.kind === "builtin" ? "Шаблон" : "Пользовательский" },
              { label: "Дата создания", value: template.createdAt },
              { label: "Автор", value: template.author },
              { label: "Дата изменения", value: template.updatedAt },
            ]}
          />

          <Section title="Настройка вида">
            <FormRow label="Метод расчёта">
              <SimpleSelect
                value={draft.calcMethod}
                onChange={(method) =>
                  dispatch({ type: "SET_CALC_METHOD", method })
                }
                options={CALC_METHOD_OPTIONS}
              />
            </FormRow>
            <FormRow label="Валюта отчёта">
              <SimpleSelect
                value={draft.currency}
                onChange={(currency) =>
                  dispatch({ type: "SET_CURRENCY", currency })
                }
                options={CURRENCY_OPTIONS}
              />
            </FormRow>
            <FormRow label="Период">
              <PeriodField
                value={draft.period}
                onChange={(period) =>
                  dispatch({ type: "SET_PERIOD", period })
                }
              />
            </FormRow>
            <FormRow label="Строки">
              <GroupedSelect<RowKind>
                value={draft.rows}
                onChange={(rows) => dispatch({ type: "SET_ROWS", rows })}
                groups={ROW_GROUPS}
              />
            </FormRow>
            <FormRow label="Количество строк">
              <input
                type="number"
                value={draft.rowCount}
                onChange={(e) =>
                  dispatch({
                    type: "SET_ROW_COUNT",
                    count: Math.max(1, Number(e.target.value) || 0),
                  })
                }
                className="flex h-9 w-full rounded-lg border border-input bg-transparent px-3 text-sm outline-none transition-colors hover:bg-muted/40 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
              />
            </FormRow>
            <FormRow label="Подстроки">
              <GroupedSelect<RowKind | "none">
                value={draft.subRows}
                onChange={(subRows) =>
                  dispatch({ type: "SET_SUB_ROWS", subRows })
                }
                groups={SUB_ROW_GROUPS}
              />
            </FormRow>
            <FormRow label="Столбцы" align="start">
              <ColumnsList
                selected={draft.columns}
                onToggle={(column) =>
                  dispatch({ type: "TOGGLE_COLUMN", column })
                }
                onReorder={(columns) =>
                  dispatch({ type: "REORDER_COLUMNS", columns })
                }
              />
            </FormRow>
          </Section>

          <Section title="Условия поиска">
            <SearchConditionsBlock
              conditions={draft.conditions}
              dispatch={dispatch}
            />
          </Section>
        </SheetBody>

        <SheetFooter className="justify-start">
          <Button onClick={onApply} disabled={!dirty}>
            Применить
          </Button>
          <SaveTemplatePopover onSave={onSave} disabled={!dirty}>
            Сохранить
          </SaveTemplatePopover>
          {dirty && (
            <span className="ml-auto text-xs text-muted-foreground">
              Изменения не применены
            </span>
          )}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

function Descriptions({
  rows,
}: {
  rows: { label: string; value: string }[];
}) {
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border bg-muted/30 p-4">
      {rows.map((row, idx) => (
        <Fragment key={row.label}>
          {idx > 0 && <Separator />}
          <div className="flex items-center justify-between gap-4 text-sm">
            <span className="text-muted-foreground">{row.label}</span>
            <span className="text-foreground">{row.value}</span>
          </div>
        </Fragment>
      ))}
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-4">
      <h3 className="text-lg font-medium text-foreground">{title}</h3>
      <div className="flex flex-col gap-3">{children}</div>
    </section>
  );
}

function FormRow({
  label,
  align = "center",
  children,
}: {
  label: string;
  align?: "center" | "start";
  children: React.ReactNode;
}) {
  return (
    <div
      className={`grid grid-cols-[160px_1fr] gap-3 ${
        align === "start" ? "items-start" : "items-center"
      }`}
    >
      <div className="text-sm text-muted-foreground">{label}</div>
      <div>{children}</div>
    </div>
  );
}

function ColumnsList({
  selected,
  onToggle,
  onReorder,
}: {
  selected: ColumnKey[];
  onToggle: (column: ColumnKey) => void;
  onReorder: (columns: ColumnKey[]) => void;
}) {
  const ordered = [
    ...selected,
    ...ALL_COLUMNS.filter((c) => !selected.includes(c)),
  ];

  function move(column: ColumnKey, direction: -1 | 1) {
    const list = [...selected];
    const idx = list.indexOf(column);
    if (idx < 0) return;
    const nextIdx = idx + direction;
    if (nextIdx < 0 || nextIdx >= list.length) return;
    [list[idx], list[nextIdx]] = [list[nextIdx], list[idx]];
    onReorder(list);
  }

  return (
    <div className="flex flex-col gap-1.5 rounded-lg border border-border bg-background p-1">
      {ordered.map((col) => {
        const isSelected = selected.includes(col);
        return (
          <div
            key={col}
            className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted/50"
          >
            <GripVerticalIcon
              className={`size-3.5 ${
                isSelected ? "text-muted-foreground" : "opacity-0"
              }`}
            />
            <label className="flex flex-1 items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => onToggle(col)}
                className="size-3.5 accent-primary"
              />
              <span>{COLUMN_LABELS[col]}</span>
            </label>
            {isSelected && (
              <div className="flex items-center gap-0.5">
                <button
                  type="button"
                  onClick={() => move(col, -1)}
                  className="rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                  aria-label="Вверх"
                >
                  ↑
                </button>
                <button
                  type="button"
                  onClick={() => move(col, 1)}
                  className="rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                  aria-label="Вниз"
                >
                  ↓
                </button>
                <button
                  type="button"
                  onClick={() => onToggle(col)}
                  className="rounded p-0.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  aria-label="Удалить"
                >
                  <Trash2Icon className="size-3.5" />
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
