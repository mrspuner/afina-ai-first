"use client";

import { useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  Search,
  RefreshCw,
  Settings2,
  Download,
  ChevronsUpDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

interface RowData {
  expenses: string;
  income: string;
  sends: number;
  actions: number;
  holds: number;
  approves: number;
  ar: string;
  rejects: number;
  rr: string;
}

interface DateGroup {
  date: string;
  data: RowData;
  campaigns: { name: string; data: RowData }[];
}

const DEFAULT_ROW: RowData = {
  expenses: "1\u00a0509,00\u20bd",
  income: "20\u00a0084,50\u20bd",
  sends: 19872,
  actions: 1512,
  holds: 582,
  approves: 876,
  ar: "0,58%",
  rejects: 54,
  rr: "0,03%",
};

const CAMPAIGNS = [
  { name: "Кампания", data: DEFAULT_ROW },
  { name: "Кампания", data: DEFAULT_ROW },
  { name: "Кампания", data: DEFAULT_ROW },
];

const TABLE_DATA: DateGroup[] = [
  { date: "15.05.2024", data: DEFAULT_ROW, campaigns: [] },
  { date: "14.05.2024", data: DEFAULT_ROW, campaigns: CAMPAIGNS },
  { date: "13.05.2024", data: DEFAULT_ROW, campaigns: CAMPAIGNS },
  { date: "12.05.2024", data: DEFAULT_ROW, campaigns: [] },
  { date: "11.05.2024", data: DEFAULT_ROW, campaigns: [] },
  { date: "10.05.2024", data: DEFAULT_ROW, campaigns: [] },
  { date: "09.05.2024", data: DEFAULT_ROW, campaigns: [] },
];

function DataCells({ data }: { data: RowData }) {
  return (
    <>
      <td className="px-4 py-3 text-right text-sm tabular-nums text-foreground">
        {data.expenses}
      </td>
      <td className="px-4 py-3 text-right text-sm tabular-nums text-foreground">
        {data.income}
      </td>
      <td className="px-4 py-3 text-right text-sm tabular-nums text-foreground">
        {data.sends.toLocaleString("ru-RU")}
      </td>
      <td className="px-4 py-3 text-right text-sm tabular-nums text-foreground">
        {data.actions.toLocaleString("ru-RU")}
      </td>
      <td className="px-4 py-3 text-right text-sm tabular-nums text-foreground">
        {data.holds}
      </td>
      <td className="px-4 py-3 text-right text-sm tabular-nums text-foreground">
        {data.approves}
      </td>
      <td className="px-4 py-3 text-right text-sm tabular-nums text-foreground">
        {data.ar}
      </td>
      <td className="px-4 py-3 text-right text-sm tabular-nums text-foreground">
        {data.rejects}
      </td>
      <td className="px-4 py-3 text-right text-sm tabular-nums text-foreground">
        {data.rr}
      </td>
    </>
  );
}

export function StatisticsView({ campaignId }: { campaignId?: string } = {}) {
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(
    new Set(["14.05.2024", "13.05.2024"])
  );
  const [searchQuery, setSearchQuery] = useState("");
  const filterByCampaign = Boolean(campaignId);

  const toggleGroup = (date: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(date)) {
        next.delete(date);
      } else {
        next.add(date);
      }
      return next;
    });
  };

  // When a campaignId is provided, filter down to days that have nested
  // campaign rows. The mocks don't carry real IDs, so this is a minimal
  // MVP reduction: just keep groups that actually expand into children.
  const campaignScoped = filterByCampaign
    ? TABLE_DATA.filter((g) => g.campaigns.length > 0)
    : TABLE_DATA;

  const filteredData = campaignScoped.filter(
    (group) =>
      searchQuery === "" ||
      group.date.includes(searchQuery) ||
      group.campaigns.some((c) =>
        c.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
  );

  return (
    <main className="flex flex-1 flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-start justify-between px-8 pt-8 pb-3 shrink-0">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <h1 className="text-[38px] font-semibold leading-[46px] tracking-tight">
              {filterByCampaign ? "Статистика кампании" : "Сводный за период"}
            </h1>
            <ChevronDown className="h-5 w-5 text-muted-foreground mt-1 shrink-0" />
          </div>
          <p className="text-sm text-muted-foreground">Шаблонный отчет</p>
        </div>
        <Button variant="outline" size="icon" className="mt-1 shrink-0">
          <Download className="h-4 w-4" />
        </Button>
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between px-8 py-3 shrink-0">
        <button
          type="button"
          className="rounded-full border border-border bg-muted/40 px-4 h-8 text-sm text-foreground transition-colors hover:bg-muted"
        >
          Этот квартал
        </button>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Search className="h-4 w-4 shrink-0" />
            <input
              type="text"
              placeholder="Поиск по названию"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-44 bg-transparent text-sm outline-none placeholder:text-muted-foreground text-foreground"
            />
          </div>
          <Separator orientation="vertical" className="h-5" />
          <Button variant="outline" size="icon">
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button variant="default" size="icon">
            <Settings2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full border-collapse">
          <thead className="sticky top-0 z-10">
            <tr className="border-b border-border bg-background">
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground whitespace-nowrap">
                <div className="flex items-center gap-1.5">
                  Название
                  <ChevronsUpDown className="h-3 w-3 opacity-60" />
                </div>
              </th>
              {(
                [
                  "Expenses",
                  "Income",
                  "Sends",
                  "Actions",
                  "Holds",
                  "Approves",
                  "AR, %",
                  "Rejects",
                  "RR, %",
                ] as const
              ).map((label) => (
                <th
                  key={label}
                  className="px-4 py-3 text-right text-xs font-medium text-muted-foreground whitespace-nowrap"
                >
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredData.map((group) => {
              const isExpanded = expandedGroups.has(group.date);
              const hasChildren = group.campaigns.length > 0;

              return (
                <>
                  <tr
                    key={group.date}
                    className={cn(
                      "border-b border-border transition-colors",
                      hasChildren && "cursor-pointer hover:bg-muted/30"
                    )}
                    onClick={() => hasChildren && toggleGroup(group.date)}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            "text-muted-foreground transition-transform",
                            !hasChildren && "invisible"
                          )}
                        >
                          {isExpanded ? (
                            <ChevronDown className="h-3.5 w-3.5" />
                          ) : (
                            <ChevronRight className="h-3.5 w-3.5" />
                          )}
                        </span>
                        <span className="text-sm font-medium">{group.date}</span>
                      </div>
                    </td>
                    <DataCells data={group.data} />
                  </tr>
                  {isExpanded &&
                    group.campaigns.map((campaign, idx) => (
                      <tr
                        key={`${group.date}-${idx}`}
                        className="border-b border-border hover:bg-muted/20 transition-colors"
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2 pl-6">
                            <span className="text-sm text-muted-foreground">
                              {campaign.name}
                            </span>
                          </div>
                        </td>
                        <DataCells data={campaign.data} />
                      </tr>
                    ))}
                </>
              );
            })}
          </tbody>
        </table>
      </div>
    </main>
  );
}
