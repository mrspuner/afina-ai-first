"use client";

import { MinusIcon, PlusIcon } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import {
  ChipMultiselect,
  type ChipOption,
} from "./fields/chip-multiselect";
import type {
  SearchConditions as Conditions,
  StatisticsAction,
} from "./statistics-state";

const ENTITIES: { key: string; label: string; options: ChipOption[] }[] = [
  {
    key: "campaigns",
    label: "Кампании",
    options: [
      { value: "c1", label: "Кампания 1" },
      { value: "c2", label: "Кампания 2" },
      { value: "c3", label: "Кампания 3" },
      { value: "g1", label: "Группа кампаний 1" },
      { value: "g2", label: "Группа кампаний 2" },
      { value: "act", label: "Активные" },
    ],
  },
  {
    key: "offers",
    label: "Предложения",
    options: [
      { value: "o1", label: "Предложение 1" },
      { value: "o2", label: "Предложение 2" },
      { value: "o3", label: "Предложение 3" },
      { value: "o4", label: "Предложение 4" },
      { value: "og1", label: "Группа предложений 1" },
      { value: "og2", label: "Группа предложений 2" },
      { value: "v1", label: "Вертикаль 1" },
      { value: "v2", label: "Вертикаль 2" },
    ],
  },
  {
    key: "subscribers",
    label: "Абоненты",
    options: [
      { value: "s1", label: "Сегмент 1" },
      { value: "s2", label: "Сегмент 2" },
      { value: "s3", label: "Сегмент 3" },
    ],
  },
  {
    key: "channels",
    label: "Каналы",
    options: [
      { value: "ch1", label: "Канал 1" },
      { value: "ch2", label: "Канал 2" },
      { value: "ch3", label: "Канал 3" },
    ],
  },
  {
    key: "creatives",
    label: "Креативы",
    options: [
      { value: "cr1", label: "Креатив 1" },
      { value: "cr2", label: "Креатив 2" },
      { value: "cr3", label: "Креатив 3" },
      { value: "crg1", label: "Группа креативов 1" },
      { value: "crg2", label: "Группа креативов 2" },
      { value: "cv1", label: "Вертикаль 1" },
      { value: "cv2", label: "Вертикаль 2" },
      { value: "banner", label: "Баннер" },
      { value: "text", label: "Текст" },
    ],
  },
  {
    key: "triggers",
    label: "Триггеры",
    options: [
      { value: "t1", label: "Триггер 1" },
      { value: "t2", label: "Триггер 2" },
      { value: "t3", label: "Триггер 3" },
      { value: "tg1", label: "Группа триггеров 1" },
      { value: "tg2", label: "Группа триггеров 2" },
    ],
  },
  {
    key: "scenarios",
    label: "Сценарии",
    options: [
      { value: "sc1", label: "СМС → Витрина → Лендинг" },
      { value: "sc2", label: "СМС → Лендинг" },
    ],
  },
  {
    key: "strategies",
    label: "Стратегии",
    options: [
      { value: "str1", label: "Первичная витрина" },
      { value: "str2", label: "Каскадное сообщение" },
    ],
  },
];

export function SearchConditionsBlock({
  conditions,
  dispatch,
}: {
  conditions: Conditions;
  dispatch: (action: StatisticsAction) => void;
}) {
  const [showExclude, setShowExclude] = useState(() =>
    Object.values(conditions.exclude).some((v) => v && v.length > 0),
  );

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3">
        <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          По значениям
        </div>
        {ENTITIES.map((ent) => (
          <ConditionRow
            key={ent.key}
            label={ent.label}
            options={ent.options}
            value={conditions.include[ent.key] ?? []}
            onChange={(values) =>
              dispatch({
                type: "SET_CONDITION",
                scope: "include",
                entity: ent.key,
                values,
              })
            }
          />
        ))}
      </div>

      <button
        type="button"
        onClick={() => setShowExclude((v) => !v)}
        className="flex items-center gap-1.5 self-start text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        {showExclude ? (
          <MinusIcon className="size-3.5" />
        ) : (
          <PlusIcon className="size-3.5" />
        )}
        <span>
          {showExclude ? "Скрыть «Исключить»" : "Исключить из поиска"}
        </span>
      </button>

      {showExclude && (
        <div className="flex flex-col gap-3">
          <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Исключить из поиска
          </div>
          {ENTITIES.map((ent) => (
            <ConditionRow
              key={ent.key}
              label={ent.label}
              options={ent.options}
              value={conditions.exclude[ent.key] ?? []}
              onChange={(values) =>
                dispatch({
                  type: "SET_CONDITION",
                  scope: "exclude",
                  entity: ent.key,
                  values,
                })
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ConditionRow({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: ChipOption[];
  value: string[];
  onChange: (next: string[]) => void;
}) {
  return (
    <div className={cn("grid grid-cols-[120px_1fr] items-start gap-3")}>
      <div className="pt-2 text-sm text-muted-foreground">{label}</div>
      <div className="flex items-start gap-2">
        <div className="flex-1">
          <ChipMultiselect
            value={value}
            onChange={onChange}
            options={options}
            placeholder={`Выберите ${label.toLowerCase()}`}
          />
        </div>
        {value.length > 0 && (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Очистить"
            onClick={() => onChange([])}
          >
            <TrashIcon />
          </Button>
        )}
      </div>
    </div>
  );
}

function TrashIcon() {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-4"
      aria-hidden="true"
    >
      <path d="M2.5 4h11M6 4V2.5A.5.5 0 0 1 6.5 2h3a.5.5 0 0 1 .5.5V4M4.5 4l.75 8a1 1 0 0 0 1 .9h3.5a1 1 0 0 0 1-.9L11.5 4" />
    </svg>
  );
}
