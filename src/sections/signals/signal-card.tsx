"use client";

import { useState } from "react";
import { Download, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Signal } from "@/state/app-state";
import { SIGNAL_STATUS_LABEL } from "@/types/signal-status";
import { cn } from "@/lib/utils";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("ru-RU");
}

function formatNumber(n: number): string {
  return n.toLocaleString("ru-RU");
}

interface SignalCardProps {
  signal: Signal;
  onCreateCampaign: (signalId: string) => void;
  onDownload: (signalId: string) => void;
  onResumeAwaiting?: (signalId: string) => void;
  /**
   * Reopen the wizard for an awaiting-payment signal at the summary step
   * with all fields hydrated. Distinct from `onResumeAwaiting`, which
   * launches the payment modal directly.
   */
  onResumeEdit?: (signalId: string) => void;
  /**
   * Click on the card body opens the wizard at the latest available step
   * for this signal. Awaiting-payment → step 6, processing/error → step 7,
   * ready/expired → step 8. Action buttons inside stop propagation so they
   * keep their own behaviour.
   */
  onOpen?: (signalId: string) => void;
  onDelete?: (signalId: string) => void;
  /**
   * Page-entrance stagger position (0-based). Each step adds 40 ms of
   * animation-delay so a fresh list cascades in instead of popping at
   * once. A single newly-added card defaults to index 0 (no delay).
   */
  index?: number;
}

export function SignalCard({
  signal,
  onCreateCampaign,
  onDownload,
  onResumeAwaiting,
  onResumeEdit,
  onOpen,
  onDelete,
  index = 0,
}: SignalCardProps) {
  const { type, count, segments, updatedAt, id } = signal;
  const status = signal.status ?? "ready";
  const [confirmDelete, setConfirmDelete] = useState(false);

  const isReady = status === "ready";
  const isAwaiting = status === "awaiting_payment";
  const isProcessing = status === "processing";
  const isExpired = status === "expired";
  const isError = status === "error";

  return (
    <>
      <Card
        onClick={onOpen ? () => onOpen(id) : undefined}
        onKeyDown={
          onOpen
            ? (e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onOpen(id);
                }
              }
            : undefined
        }
        role={onOpen ? "button" : undefined}
        tabIndex={onOpen ? 0 : undefined}
        className={cn(
          "animate-in fade-in-0 slide-in-from-bottom-2 gap-2 px-5 py-4 [--tw-animation-duration:220ms] [--tw-ease:var(--ease-out)]",
          onOpen && "cursor-pointer transition-colors hover:bg-accent/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
        )}
        style={index > 0 ? { animationDelay: `${index * 40}ms` } : undefined}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold text-foreground">
              {type} · {formatNumber(count)}
            </p>
            {signal.isCustom && <Badge variant="secondary">Пользовательский</Badge>}
            {!isReady && (
              <Badge
                variant={isError ? "destructive" : "outline"}
                className={cn(
                  isAwaiting && "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300",
                  isProcessing && "border-sky-500/40 bg-sky-500/10 text-sky-700 dark:text-sky-300",
                  isExpired && "text-muted-foreground"
                )}
              >
                {SIGNAL_STATUS_LABEL[status]}
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground">{formatDate(updatedAt)}</p>
        </div>
        <p className="text-xs text-muted-foreground">
          Макс {formatNumber(segments.max)} · Выс {formatNumber(segments.high)} · Ср{" "}
          {formatNumber(segments.mid)} · Низ {formatNumber(segments.low)}
        </p>
        <div
          className="mt-2 flex items-center justify-between gap-2"
          onClick={(e) => e.stopPropagation()}
        >
          {isAwaiting ? (
            <Button onClick={() => onResumeAwaiting?.(id)}>
              Пополнить и запустить
            </Button>
          ) : isProcessing ? (
            <Button disabled variant="outline">
              Обрабатывается…
            </Button>
          ) : isError ? (
            <Button variant="outline" onClick={() => onResumeAwaiting?.(id)}>
              Попробовать снова
            </Button>
          ) : isExpired ? (
            <Button disabled variant="outline">
              Срок актуальности истёк
            </Button>
          ) : (
            <Button onClick={() => onCreateCampaign(id)}>Использовать в кампании</Button>
          )}

          <div className="flex items-center gap-1">
            {isReady && (
              <Button
                variant="outline"
                size="icon"
                aria-label="Скачать сигналы"
                onClick={() => onDownload(id)}
              >
                <Download className="h-4 w-4" />
              </Button>
            )}
            {isAwaiting && onDelete && (
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button
                      variant="outline"
                      size="icon"
                      aria-label="Действия с сигналом"
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  }
                />
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={() => (onResumeEdit ?? onResumeAwaiting)?.(id)}
                  >
                    <Pencil className="mr-2 h-4 w-4" />
                    Открыть и редактировать
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setConfirmDelete(true)}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Удалить
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </Card>

      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Удалить сигнал?</DialogTitle>
            <DialogDescription>
              Сигнал «{type}» будет удалён. Деньги не были списаны — удаление
              безопасно.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDelete(false)}>
              Отмена
            </Button>
            <Button
              variant="outline"
              className="text-destructive border-destructive/40 hover:bg-destructive/10"
              onClick={() => {
                setConfirmDelete(false);
                onDelete?.(id);
              }}
            >
              Удалить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
