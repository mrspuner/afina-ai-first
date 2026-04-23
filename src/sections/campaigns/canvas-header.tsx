"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Campaign, Signal } from "@/state/app-state";
import { ScheduleCampaignDialog } from "./schedule-campaign-dialog";
import { StatusBadge } from "./status-badge";

export interface CanvasHeaderToast {
  kind: "error" | "info";
  text: string;
}

type ConfirmKind = "pause" | "duplicate" | "cancel-schedule";

interface CanvasHeaderProps {
  campaign: Campaign;
  signal: Signal | null;
  onRename: (name: string) => void;
  onSaveDraft: () => void;
  onLaunch: () => void;
  onSchedule: (iso: string) => void;
  onPause: () => void;
  onResume: () => void;
  onDuplicate: () => void;
  onGoToStats: () => void;
  onCancelSchedule: () => void;
  toast?: CanvasHeaderToast | null;
  onDismissToast?: () => void;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
  });
}

function formatLongDate(iso: string): string {
  return new Date(iso).toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  const date = d.toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  const time = d.toLocaleTimeString("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${date} в ${time}`;
}

function statusDescription(c: Campaign): string {
  if (c.status === "scheduled" && c.scheduledFor)
    return `Запуск запланирован на ${formatDateTime(c.scheduledFor)}`;
  if (c.status === "active" && c.launchedAt)
    return `Запущена ${formatDateTime(c.launchedAt)}`;
  if (c.status === "paused" && c.pausedAt)
    return `Приостановлена ${formatDateTime(c.pausedAt)}`;
  if (c.status === "completed" && c.completedAt)
    return `Завершена ${formatLongDate(c.completedAt)}`;
  return `Создана ${formatLongDate(c.createdAt)}`;
}

function formatNumber(n: number): string {
  return n.toLocaleString("ru-RU");
}

export function CanvasHeader({
  campaign,
  signal,
  onRename,
  onSaveDraft,
  onLaunch,
  onSchedule,
  onPause,
  onResume,
  onDuplicate,
  onGoToStats,
  onCancelSchedule,
  toast,
  onDismissToast,
}: CanvasHeaderProps) {
  const [editing, setEditing] = useState(false);
  const [draftName, setDraftName] = useState(campaign.name);
  const [confirm, setConfirm] = useState<ConfirmKind | null>(null);
  const [schedulerOpen, setSchedulerOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Resync draft name when the campaign is renamed externally (e.g.,
  // reducer-driven rename from another surface). eslint-disable is used
  // so the rule react-hooks/set-state-in-effect doesn't flag the intentional
  // external→internal state sync.
  useEffect(() => {
    if (!editing) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDraftName(campaign.name);
    }
  }, [campaign.name, editing]);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  function startEdit() {
    setDraftName(campaign.name);
    setEditing(true);
  }

  function commit() {
    const next = draftName.trim();
    setEditing(false);
    if (!next || next === campaign.name) return;
    onRename(next);
  }

  function cancel() {
    setEditing(false);
  }

  const signalLine = signal
    ? `${signal.type} · ${formatNumber(signal.count)} · от ${formatDate(signal.updatedAt)}`
    : "Сигнал не привязан";

  return (
    <div className="sticky top-0 z-20 border-b border-border bg-background/90 px-6 py-3 backdrop-blur">
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          {editing ? (
            <Input
              ref={inputRef}
              value={draftName}
              onChange={(e) => setDraftName(e.target.value)}
              onBlur={commit}
              onKeyDown={(e) => {
                if (e.key === "Enter") commit();
                if (e.key === "Escape") cancel();
              }}
              aria-label="Название кампании"
              className="h-9 max-w-sm text-xl font-semibold"
            />
          ) : (
            <button
              type="button"
              onClick={startEdit}
              aria-label="Переименовать кампанию"
              className="group flex items-center gap-2 self-start rounded-md text-left text-xl font-semibold text-foreground hover:text-foreground/80"
            >
              <span className="truncate">{campaign.name}</span>
              <Pencil className="h-3.5 w-3.5 opacity-0 transition-opacity group-hover:opacity-60" />
            </button>
          )}
          <p
            className={
              signal
                ? "text-xs text-muted-foreground"
                : "text-xs font-medium text-destructive"
            }
          >
            {signalLine}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <StatusBadge status={campaign.status} />
            <span className="text-xs text-muted-foreground">
              {statusDescription(campaign)}
            </span>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {campaign.status === "draft" && (
            <>
              <Button variant="outline" onClick={onSaveDraft}>
                Сохранить черновик
              </Button>
              <ButtonGroup>
                <Button onClick={onLaunch}>Запустить</Button>
                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={
                      <Button
                        size="icon"
                        aria-label="Дополнительные действия запуска"
                      >
                        <ChevronDown className="h-4 w-4" />
                      </Button>
                    }
                  />
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setSchedulerOpen(true)}>
                      Запланировать…
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </ButtonGroup>
            </>
          )}
          {campaign.status === "active" && (
            <>
              <Button variant="outline" onClick={onGoToStats}>
                Посмотреть статистику
              </Button>
              <Button
                variant="outline"
                className="text-amber-600 border-amber-500/40 hover:bg-amber-500/10"
                onClick={() => setConfirm("pause")}
              >
                Приостановить
              </Button>
              <Button onClick={() => setConfirm("duplicate")}>Дублировать</Button>
            </>
          )}
          {campaign.status === "paused" && (
            <>
              <Button variant="outline" onClick={onGoToStats}>
                Посмотреть статистику
              </Button>
              <Button variant="outline" onClick={() => setConfirm("duplicate")}>
                Дублировать
              </Button>
              <Button onClick={onResume}>Возобновить</Button>
            </>
          )}
          {campaign.status === "completed" && (
            <>
              <Button variant="outline" onClick={onGoToStats}>
                Посмотреть статистику
              </Button>
              <Button onClick={() => setConfirm("duplicate")}>Дублировать</Button>
            </>
          )}
          {campaign.status === "scheduled" && (
            <>
              <Button
                variant="outline"
                className="text-destructive border-destructive/40 hover:bg-destructive/10"
                onClick={() => setConfirm("cancel-schedule")}
              >
                Отменить расписание
              </Button>
              <Button variant="outline" onClick={() => setSchedulerOpen(true)}>
                Изменить расписание
              </Button>
              <Button onClick={() => setConfirm("duplicate")}>Дублировать</Button>
            </>
          )}
        </div>
      </div>

      {toast && (
        <div
          role={toast.kind === "error" ? "alert" : "status"}
          className={
            toast.kind === "error"
              ? "mt-2 flex items-center justify-between gap-3 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-1.5 text-xs text-destructive"
              : "mt-2 flex items-center justify-between gap-3 rounded-md border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground"
          }
        >
          <span>{toast.text}</span>
          {onDismissToast && (
            <button
              type="button"
              aria-label="Закрыть"
              onClick={onDismissToast}
              className="opacity-60 hover:opacity-100"
            >
              ×
            </button>
          )}
        </div>
      )}

      <Dialog
        open={confirm !== null}
        onOpenChange={(open) => {
          if (!open) setConfirm(null);
        }}
      >
        <DialogContent>
          {confirm === "pause" && (
            <>
              <DialogHeader>
                <DialogTitle>Приостановить кампанию?</DialogTitle>
                <DialogDescription>
                  Кампания перестанет выполнять шаги сценария. Возобновить
                  можно в любой момент.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="outline" onClick={() => setConfirm(null)}>
                  Отмена
                </Button>
                <Button
                  onClick={() => {
                    setConfirm(null);
                    onPause();
                  }}
                >
                  Приостановить
                </Button>
              </DialogFooter>
            </>
          )}
          {confirm === "duplicate" && (
            <>
              <DialogHeader>
                <DialogTitle>Дублировать кампанию?</DialogTitle>
                <DialogDescription>
                  Будет создана черновая копия «Копия — {campaign.name}» и
                  открыта в Canvas.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="outline" onClick={() => setConfirm(null)}>
                  Отмена
                </Button>
                <Button
                  onClick={() => {
                    setConfirm(null);
                    onDuplicate();
                  }}
                >
                  Дублировать
                </Button>
              </DialogFooter>
            </>
          )}
          {confirm === "cancel-schedule" && (
            <>
              <DialogHeader>
                <DialogTitle>Отменить расписание?</DialogTitle>
                <DialogDescription>
                  Кампания вернётся в состояние черновика. Вам потребуется
                  заново её запланировать.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="outline" onClick={() => setConfirm(null)}>
                  Отмена
                </Button>
                <Button
                  onClick={() => {
                    setConfirm(null);
                    onCancelSchedule();
                  }}
                >
                  Отменить расписание
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <ScheduleCampaignDialog
        open={schedulerOpen}
        onOpenChange={setSchedulerOpen}
        onConfirm={onSchedule}
        campaignName={campaign.name}
        initialIso={campaign.scheduledFor}
      />
    </div>
  );
}
