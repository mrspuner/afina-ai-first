"use client";

import { ChevronDownIcon } from "lucide-react";
import { useState } from "react";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { DIRECTIONS } from "@/data/directions";
import type { DirectionId } from "@/types/directions";
import { cn } from "@/lib/utils";

export function DirectionCombobox({
  value,
  onChange,
  placeholder = "Выберите направление",
  emptyText = "Ничего не найдено",
  id,
  className,
}: {
  value: DirectionId | null;
  onChange: (next: DirectionId) => void;
  placeholder?: string;
  emptyText?: string;
  id?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);

  const selected = DIRECTIONS.find((d) => d.id === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        id={id}
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
          {selected?.label ?? placeholder}
        </span>
        <ChevronDownIcon className="size-4 shrink-0 text-muted-foreground" />
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-(--anchor-width) min-w-72 p-0"
      >
        <Command>
          <CommandInput placeholder="Поиск" />
          <CommandList>
            <CommandEmpty>{emptyText}</CommandEmpty>
            <CommandGroup>
              {DIRECTIONS.map((d) => (
                <CommandItem
                  key={d.id}
                  value={d.label}
                  data-checked={value === d.id}
                  onSelect={() => {
                    onChange(d.id);
                    setOpen(false);
                  }}
                >
                  {d.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
