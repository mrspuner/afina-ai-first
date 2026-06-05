"use client";

import { MinusIcon, PlusIcon } from "lucide-react";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAppState } from "@/state/app-state-context";
import type { Campaign } from "@/state/app-state";

import {
  ChipMultiselect,
  type ChipOption,
} from "./fields/chip-multiselect";
import { poolOptions } from "./fact-cube";
import type {
  SearchConditions as Conditions,
  StatisticsAction,
} from "./statistics-state";

type Entity = { key: string; label: string; options: ChipOption[] };

/**
 * Опции условий поиска строятся из реальных сущностей, а их `value` совпадают
 * с ключами измерений куба фактов (`cmp-<id>`, `scn-<id>`, `<kind>-<i>`) — это
 * и делает условия живым фильтром: выбранное значение реально матчит факты.
 */
function buildEntities(campaigns: readonly Campaign[]): Entity[] {
  const launched = campaigns.filter(
    (c) =>
      c.status === "active" ||
      c.status === "paused" ||
      c.status === "completed",
  );
  const campaignOptions: ChipOption[] = launched.map((c) => ({
    value: `cmp-${c.id}`,
    label: c.name,
  }));
  const scnMap = new Map<string, string>();
  for (const c of launched) {
    if (c.scenario) scnMap.set(c.scenario.id, c.scenario.name);
  }
  const scenarioOptions: ChipOption[] = [...scnMap].map(([id, name]) => ({
    value: `scn-${id}`,
    label: name,
  }));
  return [
    { key: "campaigns", label: "Кампании", options: campaignOptions },
    { key: "offers", label: "Предложения", options: poolOptions("offers") },
    { key: "subscribers", label: "Абоненты", options: poolOptions("subscribers") },
    { key: "channels", label: "Каналы", options: poolOptions("channels") },
    { key: "creatives", label: "Креативы", options: poolOptions("creatives") },
    { key: "triggers", label: "Триггеры", options: poolOptions("triggers") },
    { key: "scenarios", label: "Сценарии", options: scenarioOptions },
    { key: "strategies", label: "Стратегии", options: poolOptions("strategies") },
  ];
}

export function SearchConditionsBlock({
  conditions,
  dispatch,
}: {
  conditions: Conditions;
  dispatch: (action: StatisticsAction) => void;
}) {
  const { campaigns } = useAppState();
  const entities = useMemo(() => buildEntities(campaigns), [campaigns]);
  const [showExclude, setShowExclude] = useState(() =>
    Object.values(conditions.exclude).some((v) => v && v.length > 0),
  );

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3">
        <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          По значениям
        </div>
        {entities.map((ent) => (
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
          {entities.map((ent) => (
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
