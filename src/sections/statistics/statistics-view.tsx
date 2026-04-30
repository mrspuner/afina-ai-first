"use client";

import {
  ChevronDown,
  ChevronRight,
  ChevronsUpDown,
  Download,
  RefreshCw,
  Settings2,
} from "lucide-react";
import { Fragment, useMemo, useReducer, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { useAppState } from "@/state/app-state-context";

import { PeriodField } from "./fields/period-field";
import {
  COLUMN_HEADERS,
  cellValue,
  generateRows,
  type GeneratedRow,
  type RowData,
} from "./mock-data";
import {
  formatDateRangeRu,
  resolvePeriod,
} from "./period-utils";
import {
  BUILTIN_TEMPLATES,
  type ReportTemplate,
} from "./report-templates";
import { StatisticsSettingsDrawer } from "./statistics-settings-drawer";
import {
  filtersEqual,
  statisticsReducer,
  type ColumnKey,
  type StatisticsFilters,
} from "./statistics-state";

function DataCells({
  data,
  columns,
}: {
  data: RowData;
  columns: ColumnKey[];
}) {
  return (
    <>
      {columns.map((col) => (
        <td
          key={col}
          className="px-4 py-3 text-right text-sm tabular-nums text-foreground"
        >
          {cellValue(data, col)}
        </td>
      ))}
    </>
  );
}

function csvCell(value: string | number): string {
  const s = String(value);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function buildCsv(
  rows: GeneratedRow[],
  columns: ColumnKey[],
  expandedKeys: Set<string>,
): string {
  const header = ["Название", ...columns.map((c) => COLUMN_HEADERS[c])].join(
    ",",
  );
  const lines: string[] = [header];
  for (const row of rows) {
    lines.push(
      [csvCell(row.label), ...columns.map((c) => csvCell(row.data[c]))].join(
        ",",
      ),
    );
    if (expandedKeys.has(row.key)) {
      for (const sub of row.subRows) {
        lines.push(
          [
            csvCell(`    ${sub.label}`),
            ...columns.map((col) => csvCell(sub.data[col])),
          ].join(","),
        );
      }
    }
  }
  return lines.join("\n");
}

export function StatisticsView({ campaignId }: { campaignId?: string } = {}) {
  const filterByCampaign = Boolean(campaignId);
  const { campaigns } = useAppState();

  // Stats only become meaningful once a campaign has actually been
  // launched — having signals or draft/scheduled campaigns isn't enough to
  // produce numbers. We render a soft empty state until at least one
  // campaign has reached active/paused/completed. The unconditional hook
  // calls below stay so the early return doesn't break rules of hooks.
  const hasLaunchedCampaign = campaigns.some(
    (c) => c.status === "active" || c.status === "paused" || c.status === "completed"
  );
  const noData = !hasLaunchedCampaign;

  const [templates, setTemplates] = useState<ReportTemplate[]>(
    () => BUILTIN_TEMPLATES,
  );
  const [activeTemplateId, setActiveTemplateId] = useState<string>(
    BUILTIN_TEMPLATES[0].id,
  );
  const activeTemplate =
    templates.find((t) => t.id === activeTemplateId) ?? templates[0];

  const [applied, setApplied] = useState<StatisticsFilters>(
    activeTemplate.filters,
  );
  const [draft, dispatch] = useReducer(
    statisticsReducer,
    activeTemplate.filters,
  );

  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set());
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [templatePickerOpen, setTemplatePickerOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const dirty = useMemo(
    () => !filtersEqual(draft, applied),
    [draft, applied],
  );
  const divergedFromTemplate = useMemo(
    () => !filtersEqual(applied, activeTemplate.filters),
    [applied, activeTemplate.filters],
  );

  const rows = useMemo(() => generateRows(applied), [applied]);
  const resolvedRange = useMemo(
    () => resolvePeriod(applied.period),
    [applied.period],
  );
  const rangeLabel = useMemo(
    () => formatDateRangeRu(resolvedRange),
    [resolvedRange],
  );

  const hasSubRows = applied.subRows !== "none";

  const toggleRow = (key: string) => {
    setExpandedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  function handleTemplateSelect(id: string) {
    const tpl = templates.find((t) => t.id === id);
    if (!tpl) return;
    setActiveTemplateId(id);
    setApplied(tpl.filters);
    dispatch({ type: "RESET", filters: tpl.filters });
    setExpandedKeys(new Set());
    setTemplatePickerOpen(false);
  }

  function handleApply() {
    setApplied(draft);
    setExpandedKeys(new Set());
    setDrawerOpen(false);
  }

  function handleSaveTemplate(name: string) {
    const id = `user-${Date.now()}`;
    const now = new Date().toLocaleDateString("ru-RU");
    const tpl: ReportTemplate = {
      id,
      name,
      kind: "user",
      author: "Вы",
      createdAt: now,
      updatedAt: now,
      filters: draft,
    };
    setTemplates((prev) => [...prev, tpl]);
    setActiveTemplateId(id);
    setApplied(draft);
    setExpandedKeys(new Set());
    setDrawerOpen(false);
  }

  function handleRefresh() {
    if (refreshing) return;
    setRefreshing(true);
    window.setTimeout(() => setRefreshing(false), 650);
  }

  function handleDownload() {
    const csv = buildCsv(rows, applied.columns, expandedKeys);
    const blob = new Blob([`﻿${csv}`], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const safe = rangeLabel.replace(/[^0-9]+/g, "-").replace(/^-|-$/g, "");
    a.download = `afina-stats-${safe || "current"}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  const titleText = filterByCampaign
    ? "Статистика кампании"
    : activeTemplate.name;

  const baseSubtitle = divergedFromTemplate
    ? "Пользовательский отчёт"
    : activeTemplate.kind === "builtin"
      ? "Шаблонный отчёт"
      : "Пользовательский отчёт";

  // Show the empty state only on the global statistics view. Per-campaign
  // statistics (when `campaignId` is set) always belong to a real campaign
  // and never hit this empty branch.
  if (noData && !filterByCampaign) {
    return <StatisticsEmptyState />;
  }

  return (
    <main className="flex flex-1 flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-start justify-between px-8 pt-8 pb-3 shrink-0">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <Popover
              open={templatePickerOpen}
              onOpenChange={setTemplatePickerOpen}
            >
              <PopoverTrigger className="group/title inline-flex items-center gap-2 rounded-md px-1 py-0.5 -ml-1 text-left outline-none transition-colors hover:bg-muted/40 focus-visible:ring-3 focus-visible:ring-ring/50">
                <h1 className="text-[38px] font-semibold leading-[46px] tracking-tight">
                  {titleText}
                </h1>
                <ChevronDown className="h-5 w-5 text-muted-foreground mt-1 shrink-0 transition-transform group-data-[popup-open]/title:rotate-180" />
              </PopoverTrigger>
              <PopoverContent align="start" className="w-80 p-1">
                <div className="px-2 py-1.5 text-xs text-muted-foreground">
                  Шаблоны
                </div>
                {templates
                  .filter((t) => t.kind === "builtin")
                  .map((t) => (
                    <TemplateItem
                      key={t.id}
                      template={t}
                      active={t.id === activeTemplateId}
                      onSelect={handleTemplateSelect}
                    />
                  ))}
                {templates.some((t) => t.kind === "user") && (
                  <>
                    <Separator className="my-1" />
                    <div className="px-2 py-1.5 text-xs text-muted-foreground">
                      Мои отчёты
                    </div>
                    {templates
                      .filter((t) => t.kind === "user")
                      .map((t) => (
                        <TemplateItem
                          key={t.id}
                          template={t}
                          active={t.id === activeTemplateId}
                          onSelect={handleTemplateSelect}
                        />
                      ))}
                  </>
                )}
              </PopoverContent>
            </Popover>
          </div>
          <p className="text-sm text-muted-foreground">
            {baseSubtitle}
            <span className="mx-1.5 text-border">·</span>
            <span className="tabular-nums">{rangeLabel}</span>
          </p>
        </div>
        <Button
          variant="outline"
          size="icon"
          className="mt-1 shrink-0"
          onClick={handleDownload}
          aria-label="Скачать CSV"
        >
          <Download className="h-4 w-4" />
        </Button>
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between px-8 py-3 shrink-0">
        <PeriodField
          value={applied.period}
          onChange={(period) => {
            const next = { ...applied, period };
            setApplied(next);
            dispatch({ type: "SET_PERIOD", period });
            setExpandedKeys(new Set());
          }}
          triggerVariant="chip"
        />

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={handleRefresh}
            aria-label="Обновить"
          >
            <RefreshCw
              className={cn("h-4 w-4", refreshing && "animate-spin")}
            />
          </Button>
          <Separator orientation="vertical" className="h-5" />
          <Button
            variant="default"
            size="icon"
            onClick={() => setDrawerOpen(true)}
            aria-label="Настройки отчёта"
          >
            <Settings2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto px-8 pb-8">
        <table
          className={cn(
            "w-full border-collapse transition-opacity",
            refreshing && "opacity-60",
          )}
        >
          <thead className="sticky top-0 z-10">
            <tr className="border-b border-border bg-background">
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground whitespace-nowrap">
                <div className="flex items-center gap-1.5">
                  Название
                  <ChevronsUpDown className="h-3 w-3 opacity-60" />
                </div>
              </th>
              {applied.columns.map((col) => (
                <th
                  key={col}
                  className="px-4 py-3 text-right text-xs font-medium text-muted-foreground whitespace-nowrap"
                >
                  {COLUMN_HEADERS[col]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const isExpanded = expandedKeys.has(row.key);
              const canExpand = hasSubRows && row.subRows.length > 0;

              return (
                <Fragment key={row.key}>
                  <tr
                    className={cn(
                      "border-b border-border transition-colors",
                      canExpand && "cursor-pointer hover:bg-muted/30",
                    )}
                    onClick={() => canExpand && toggleRow(row.key)}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            "text-muted-foreground transition-transform",
                            !canExpand && "invisible",
                          )}
                        >
                          {isExpanded ? (
                            <ChevronDown className="h-3.5 w-3.5" />
                          ) : (
                            <ChevronRight className="h-3.5 w-3.5" />
                          )}
                        </span>
                        <span className="flex flex-col">
                          <span className="text-sm font-medium">
                            {row.label}
                          </span>
                          {row.caption && (
                            <span className="text-xs text-muted-foreground tabular-nums">
                              {row.caption}
                            </span>
                          )}
                        </span>
                      </div>
                    </td>
                    <DataCells data={row.data} columns={applied.columns} />
                  </tr>
                  {isExpanded &&
                    row.subRows.map((sub) => (
                      <tr
                        key={sub.key}
                        className="border-b border-border bg-muted/15 hover:bg-muted/25 transition-colors"
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2 pl-6">
                            <span className="text-sm text-muted-foreground">
                              {sub.label}
                            </span>
                          </div>
                        </td>
                        <DataCells
                          data={sub.data}
                          columns={applied.columns}
                        />
                      </tr>
                    ))}
                </Fragment>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td
                  colSpan={applied.columns.length + 1}
                  className="px-4 py-10 text-center text-sm text-muted-foreground"
                >
                  Нет данных для выбранных фильтров
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <StatisticsSettingsDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        template={activeTemplate}
        draft={draft}
        dispatch={dispatch}
        dirty={dirty}
        onApply={handleApply}
        onSave={handleSaveTemplate}
      />
    </main>
  );
}

function TemplateItem({
  template,
  active,
  onSelect,
}: {
  template: ReportTemplate;
  active: boolean;
  onSelect: (id: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(template.id)}
      className={cn(
        "flex w-full items-center justify-between rounded-md px-2 py-2 text-left text-sm transition-colors",
        active
          ? "bg-primary/10 text-foreground"
          : "text-foreground hover:bg-muted",
      )}
    >
      <span>{template.name}</span>
      {active && <span className="text-xs text-muted-foreground">текущий</span>}
    </button>
  );
}

function StatisticsEmptyState() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-8 py-16 text-center">
      <div className="flex max-w-sm flex-col items-center gap-2">
        <h1 className="text-base font-medium text-foreground">
          Пока нет статистики
        </h1>
        <p className="text-sm text-muted-foreground">
          Запустите кампании, чтобы увидеть результаты.
        </p>
      </div>
    </main>
  );
}
