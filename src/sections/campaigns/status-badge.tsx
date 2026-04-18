import type { CampaignStatus } from "@/state/app-state";
import { cn } from "@/lib/utils";

const LABELS: Record<CampaignStatus, string> = {
  active: "Активно",
  scheduled: "Запланированно",
  draft: "Не запущено",
  completed: "Завершено",
};

const DOT: Record<CampaignStatus, string> = {
  active: "bg-green-500",
  scheduled: "bg-blue-500",
  draft: "bg-muted-foreground",
  completed: "bg-muted-foreground/50",
};

export function StatusBadge({ status }: { status: CampaignStatus }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-0.5 text-xs font-medium text-foreground">
      <span className={cn("h-1.5 w-1.5 rounded-full", DOT[status])} aria-hidden />
      {LABELS[status]}
    </span>
  );
}
