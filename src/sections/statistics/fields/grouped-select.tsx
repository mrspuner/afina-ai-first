"use client";

import { ChevronDownIcon } from "lucide-react";
import { useState } from "react";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export type GroupedOption<T extends string> = {
  value: T;
  label: string;
};

export type OptionGroup<T extends string> = {
  heading: string;
  options: readonly GroupedOption<T>[];
};

export function GroupedSelect<T extends string>({
  value,
  onChange,
  groups,
  placeholder,
  className,
}: {
  value: T | null;
  onChange: (value: T) => void;
  groups: readonly OptionGroup<T>[];
  placeholder?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);

  const selected = groups
    .flatMap((g) => g.options)
    .find((o) => o.value === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        className={cn(
          "flex h-9 w-full items-center justify-between gap-2 rounded-lg border border-input bg-transparent px-3 text-left text-sm transition-colors outline-none hover:bg-muted/40 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30 data-[popup-open]:bg-muted/60",
          className,
        )}
      >
        <span
          className={cn(
            "truncate",
            selected ? "text-foreground" : "text-muted-foreground",
          )}
        >
          {selected?.label ?? placeholder ?? "Выберите"}
        </span>
        <ChevronDownIcon className="size-4 shrink-0 text-muted-foreground" />
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-(--anchor-width) min-w-64 max-h-80 overflow-y-auto p-1"
      >
        {groups.map((group, gi) => (
          <div key={group.heading} className={gi > 0 ? "mt-1" : ""}>
            <div className="px-2 py-1.5 text-xs text-muted-foreground">
              {group.heading}
            </div>
            {group.options.map((opt) => {
              const isActive = opt.value === value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    onChange(opt.value);
                    setOpen(false);
                  }}
                  className={cn(
                    "flex w-full items-center rounded-md px-2 py-2 text-left text-sm transition-colors",
                    isActive
                      ? "bg-primary/10 text-foreground"
                      : "text-foreground hover:bg-muted",
                  )}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        ))}
      </PopoverContent>
    </Popover>
  );
}
