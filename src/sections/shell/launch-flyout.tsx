"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useAppDispatch, useAppState } from "@/state/app-state-context";
import type { Campaign, Signal } from "@/state/app-state";
import { STATUS_LABELS } from "@/sections/campaigns/status-badge";
import { SIGNAL_STATUS_LABEL } from "@/types/signal-status";
import { cn } from "@/lib/utils";

interface LaunchFlyoutProps {
  open: boolean;
  onClose: () => void;
}

type RecentItem =
  | { kind: "signal"; date: string; signal: Signal }
  | { kind: "campaign"; date: string; campaign: Campaign };

const RECENT_LIMIT_PER_KIND = 10;

function campaignDate(c: Campaign): string {
  return c.launchedAt ?? c.scheduledFor ?? c.completedAt ?? c.createdAt;
}

const CAMPAIGN_DOT: Record<Campaign["status"], string> = {
  active: "bg-green-500",
  scheduled: "bg-blue-500",
  draft: "bg-muted-foreground",
  paused: "bg-amber-500",
  completed: "bg-muted-foreground/50",
};

const SIGNAL_DOT: Record<NonNullable<Signal["status"]>, string> = {
  draft: "bg-muted-foreground",
  awaiting_payment: "bg-amber-500",
  processing: "bg-sky-500",
  ready: "bg-green-500",
  expired: "bg-muted-foreground/50",
  error: "bg-red-500",
};

export function LaunchFlyout({ open, onClose }: LaunchFlyoutProps) {
  const { signals, campaigns } = useAppState();
  const dispatch = useAppDispatch();
  const [query, setQuery] = useState("");
  const dialogRef = useRef<HTMLElement>(null);

  const normalized = query.trim().toLocaleLowerCase("ru-RU");

  const recentItems = useMemo<RecentItem[]>(() => {
    const sigItems: RecentItem[] = [...signals]
      .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1))
      .slice(0, RECENT_LIMIT_PER_KIND)
      .map((s) => ({ kind: "signal", date: s.updatedAt, signal: s }));
    const cmpItems: RecentItem[] = [...campaigns]
      .sort((a, b) => (campaignDate(a) < campaignDate(b) ? 1 : -1))
      .slice(0, RECENT_LIMIT_PER_KIND)
      .map((c) => ({ kind: "campaign", date: campaignDate(c), campaign: c }));
    return [...sigItems, ...cmpItems].sort((a, b) => (a.date < b.date ? 1 : -1));
  }, [signals, campaigns]);

  const filteredItems = useMemo(() => {
    if (!normalized) return recentItems;
    return recentItems.filter((it) => {
      const name = it.kind === "signal" ? it.signal.type : it.campaign.name;
      return name.toLocaleLowerCase("ru-RU").includes(normalized);
    });
  }, [normalized, recentItems]);

  const searchPool = useMemo<RecentItem[]>(() => {
    if (!normalized) return [];
    const sigItems: RecentItem[] = signals.map((s) => ({
      kind: "signal",
      date: s.updatedAt,
      signal: s,
    }));
    const cmpItems: RecentItem[] = campaigns.map((c) => ({
      kind: "campaign",
      date: campaignDate(c),
      campaign: c,
    }));
    return [...sigItems, ...cmpItems]
      .filter((it) => {
        const name = it.kind === "signal" ? it.signal.type : it.campaign.name;
        return name.toLocaleLowerCase("ru-RU").includes(normalized);
      })
      .sort((a, b) => (a.date < b.date ? 1 : -1));
  }, [normalized, signals, campaigns]);

  const listToRender = normalized ? searchPool : filteredItems;
  const nothingFound = Boolean(normalized) && searchPool.length === 0;
  const recentEmpty = !normalized && recentItems.length === 0;

  useEffect(() => {
    if (!open) return;
    const root = dialogRef.current;
    if (!root) return;
    const firstInput = root.querySelector<HTMLInputElement>("input");
    firstInput?.focus();

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key !== "Tab") return;
      if (!root) return;
      const focusables = Array.from(
        root.querySelectorAll<HTMLElement>(
          'a,button,input,textarea,select,[tabindex]:not([tabindex="-1"])'
        )
      ).filter((el) => !el.hasAttribute("disabled"));
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  function openSignal() {
    dispatch({ type: "sidebar_nav", section: "Сигналы" });
    onClose();
  }

  function openCampaign(id: string) {
    dispatch({ type: "campaign_opened", id });
    onClose();
  }

  return (
    <>
      <div
        className="fixed inset-0 z-40"
        onClick={onClose}
        aria-hidden="true"
      />
      <aside
        ref={dialogRef}
        role="dialog"
        aria-label="Последнее"
        className="fixed inset-y-0 left-[120px] z-50 flex w-[360px] flex-col bg-card shadow-xl"
      >
        <header className="flex items-center justify-between px-5 py-4">
          <h2 className="text-sm font-semibold text-foreground">Последнее</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Закрыть"
            className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="px-5 py-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Поиск по сигналам и кампаниям"
              aria-label="Поиск по сигналам и кампаниям"
              className="pl-9"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {nothingFound ? (
            <p className="mt-8 text-center text-sm text-muted-foreground">
              Ничего не нашлось. Измените запрос.
            </p>
          ) : recentEmpty ? (
            <p className="mt-8 text-center text-sm text-muted-foreground">
              Здесь появятся ваши сигналы и кампании.
            </p>
          ) : (
            <section>
              <div className="flex flex-col gap-2">
                {listToRender.map((it) =>
                  it.kind === "signal" ? (
                    <RecentRow
                      key={`s-${it.signal.id}`}
                      kindLabel="Сигнал"
                      name={it.signal.type}
                      statusLabel={SIGNAL_STATUS_LABEL[it.signal.status ?? "ready"]}
                      statusDot={SIGNAL_DOT[it.signal.status ?? "ready"]}
                      onClick={openSignal}
                    />
                  ) : (
                    <RecentRow
                      key={`c-${it.campaign.id}`}
                      kindLabel="Кампания"
                      name={it.campaign.name}
                      statusLabel={STATUS_LABELS[it.campaign.status]}
                      statusDot={CAMPAIGN_DOT[it.campaign.status]}
                      onClick={() => openCampaign(it.campaign.id)}
                    />
                  )
                )}
              </div>
            </section>
          )}
        </div>
      </aside>
    </>
  );
}

interface RecentRowProps {
  /** Тип сущности — «Сигнал» или «Кампания», показывается над именем. */
  kindLabel: string;
  name: string;
  statusLabel: string;
  statusDot: string;
  onClick: () => void;
}

function RecentRow({ kindLabel, name, statusLabel, statusDot, onClick }: RecentRowProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center justify-between gap-3 rounded-lg border border-border px-3 py-2 text-left transition-colors hover:bg-accent"
    >
      <div className="flex min-w-0 flex-col">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {kindLabel}
        </span>
        <p className="truncate text-sm font-medium text-foreground">{name}</p>
      </div>
      <span className="inline-flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground">
        <span className={cn("h-1.5 w-1.5 rounded-full", statusDot)} aria-hidden />
        {statusLabel}
      </span>
    </button>
  );
}
