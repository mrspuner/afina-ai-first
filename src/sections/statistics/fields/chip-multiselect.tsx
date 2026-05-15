"use client";

import { ChevronDownIcon, XIcon } from "lucide-react";
import { useLayoutEffect, useRef, useState } from "react";

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
import { cn } from "@/lib/utils";

export type ChipOption = {
  value: string;
  label: string;
};

/**
 * Pill for one selected option. The ✕ removes it (stops propagation so the
 * surrounding multiselect trigger does not toggle its popover). Omit `onRemove`
 * for the inert copies used by the hidden measurement layer.
 */
function Chip({ label, onRemove }: { label: string; onRemove?: () => void }) {
  return (
    <span
      data-measure-chip
      className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-xs text-foreground"
    >
      {label}
      <span
        role="button"
        tabIndex={onRemove ? 0 : -1}
        aria-label={`Убрать ${label}`}
        onClick={
          onRemove
            ? (e) => {
                e.stopPropagation();
                onRemove();
              }
            : undefined
        }
        onKeyDown={
          onRemove
            ? (e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onRemove();
                }
              }
            : undefined
        }
        className="inline-flex size-3.5 cursor-pointer items-center justify-center rounded-sm text-muted-foreground transition-colors hover:bg-foreground/10 hover:text-foreground"
      >
        <XIcon className="size-3" />
      </span>
    </span>
  );
}

/**
 * Selected-options row capped at TWO lines. A hidden measurement layer lays out
 * every chip at the real trigger width; whichever chips spill past the second
 * line are folded into one "+N" pill (N = number of hidden chips). One extra
 * chip is dropped to leave room for the pill — it is always narrower than a
 * label chip, so the freed slot is guaranteed to hold it.
 */
function SelectedChips({
  selected,
  onRemove,
}: {
  selected: ChipOption[];
  onRemove: (value: string) => void;
}) {
  const measureRef = useRef<HTMLDivElement>(null);
  const [visibleCount, setVisibleCount] = useState(selected.length);
  // Stable key — re-measure only when the selection set actually changes.
  const selectionKey = selected.map((o) => o.value).join("|");

  useLayoutEffect(() => {
    const node = measureRef.current;
    if (!node) return;

    function recompute() {
      const host = measureRef.current;
      if (!host) return;
      const chips = Array.from(
        host.querySelectorAll<HTMLElement>("[data-measure-chip]"),
      );
      if (chips.length === 0) {
        setVisibleCount(0);
        return;
      }
      // Distinct row offsets, in document order — rows 1 and 2 are kept.
      const rowTops: number[] = [];
      for (const chip of chips) {
        if (!rowTops.includes(chip.offsetTop)) rowTops.push(chip.offsetTop);
      }
      const secondRowTop = rowTops.length > 1 ? rowTops[1] : rowTops[0];
      let fits = 0;
      for (const chip of chips) {
        if (chip.offsetTop <= secondRowTop) fits += 1;
        else break;
      }
      // Everything fits → show all. Otherwise drop one chip to host the "+N".
      setVisibleCount(
        fits >= chips.length ? chips.length : Math.max(fits - 1, 0),
      );
    }

    recompute();
    const observer = new ResizeObserver(recompute);
    observer.observe(node);
    return () => observer.disconnect();
  }, [selectionKey]);

  const overflow = selected.length - visibleCount;

  return (
    <div className="relative flex flex-1 flex-wrap items-center gap-1">
      {/* Hidden measurement layer — every chip, real width, never clipped. */}
      <div
        ref={measureRef}
        aria-hidden
        className="pointer-events-none invisible absolute inset-x-0 top-0 flex flex-wrap items-center gap-1"
      >
        {selected.map((opt) => (
          <Chip key={opt.value} label={opt.label} />
        ))}
      </div>

      {/* Visible row — capped to two lines, overflow folded into "+N". */}
      {selected.slice(0, visibleCount).map((opt) => (
        <Chip
          key={opt.value}
          label={opt.label}
          onRemove={() => onRemove(opt.value)}
        />
      ))}
      {overflow > 0 && (
        <span className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground">
          +{overflow}
        </span>
      )}
    </div>
  );
}

export function ChipMultiselect({
  value,
  onChange,
  options,
  placeholder = "Выберите значения",
  emptyText = "Ничего не найдено",
  className,
}: {
  value: string[];
  onChange: (next: string[]) => void;
  options: readonly ChipOption[];
  placeholder?: string;
  emptyText?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);

  function toggle(opt: string) {
    if (value.includes(opt)) {
      onChange(value.filter((v) => v !== opt));
    } else {
      onChange([...value, opt]);
    }
  }

  const selectedOptions = options.filter((o) => value.includes(o.value));

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        className={cn(
          "flex min-h-9 w-full items-center justify-between gap-2 rounded-lg border border-input bg-transparent px-2 py-1 text-left text-sm transition-colors outline-none hover:bg-muted/40 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30 data-[popup-open]:bg-muted/60",
          className,
        )}
      >
        {selectedOptions.length === 0 ? (
          <span className="flex-1 px-1 text-muted-foreground">
            {placeholder}
          </span>
        ) : (
          <SelectedChips
            selected={selectedOptions}
            onRemove={(v) => onChange(value.filter((x) => x !== v))}
          />
        )}
        <ChevronDownIcon className="size-4 shrink-0 text-muted-foreground" />
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-(--anchor-width) min-w-64 p-0"
      >
        <Command>
          <CommandInput placeholder="Поиск" />
          <CommandList>
            <CommandEmpty>{emptyText}</CommandEmpty>
            <CommandGroup>
              {options.map((opt) => (
                <CommandItem
                  key={opt.value}
                  value={opt.label}
                  data-checked={value.includes(opt.value)}
                  onSelect={() => toggle(opt.value)}
                >
                  {opt.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
