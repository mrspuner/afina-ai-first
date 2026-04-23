"use client";

import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface GhostCardProps {
  title?: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: ReactNode;
  className?: string;
}

export function GhostCard({
  title,
  description,
  actionLabel,
  onAction,
  icon,
  className,
}: GhostCardProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-border/60 bg-muted/30 p-10 text-center",
        className,
      )}
    >
      {icon && <div className="text-muted-foreground/70">{icon}</div>}
      {title && (
        <p className="text-base font-semibold text-foreground">{title}</p>
      )}
      <p className="max-w-sm text-sm text-muted-foreground">{description}</p>
      {actionLabel && onAction && (
        <Button onClick={onAction} className="mt-1">
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
