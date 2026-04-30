"use client";

import Image from "next/image";
import { Plus, Minus } from "lucide-react";
import { usePromptChips, type PromptChip } from "@/state/prompt-chips-context";
import { cn } from "@/lib/utils";

function ChipGlyph({ chip }: { chip: PromptChip }) {
  switch (chip.kind) {
    case "trigger":
      return (
        <Image
          src="/mascot-icon.svg"
          alt=""
          width={14}
          height={14}
          className="shrink-0"
          aria-hidden
        />
      );
    case "mode":
      return chip.payload === "exclude" ? (
        <Minus className="h-3 w-3 shrink-0" />
      ) : (
        <Plus className="h-3 w-3 shrink-0" />
      );
    case "node":
      return (
        <span
          aria-hidden
          className="inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-primary"
        />
      );
  }
}

export function PromptChipsRow() {
  const { chips } = usePromptChips();
  if (chips.length === 0) return null;
  return (
    <>
      {chips.map((chip) => (
        <span
          key={chip.id}
          data-chip-id={chip.id}
          data-chip-kind={chip.kind}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs font-medium",
            "border-white/15 bg-white/10 text-white"
          )}
        >
          <ChipGlyph chip={chip} />
          <span className="leading-none">{chip.label}</span>
        </span>
      ))}
    </>
  );
}
