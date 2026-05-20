"use client";

import { useMemo, useState } from "react";
import { motion } from "motion/react";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAppState } from "@/state/app-state-context";
import { VERTICALS } from "@/data/triggers-by-vertical";
import { cn } from "@/lib/utils";

interface OnboardingInterestsScreenProps {
  onContinue: () => void;
}

function defaultInterestLabels(direction: string): string[] {
  const vertical = VERTICALS.find((v) => v.id === direction) ?? VERTICALS[0];
  // Take up to 4 interest names from the matched vertical — the screen is a
  // chip picker, not a serious data step.
  return vertical?.interests.slice(0, 4).map((i) => i.name) ?? [];
}

export function OnboardingInterestsScreen({ onContinue }: OnboardingInterestsScreenProps) {
  const { clientDirection } = useAppState();
  const initial = useMemo(() => defaultInterestLabels(clientDirection), [clientDirection]);
  const [labels, setLabels] = useState<string[]>(initial);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState("");

  function remove(label: string) {
    setLabels((prev) => prev.filter((l) => l !== label));
  }

  function commitDraft() {
    const trimmed = draft.trim();
    if (!trimmed) {
      setAdding(false);
      setDraft("");
      return;
    }
    if (!labels.includes(trimmed)) {
      setLabels((prev) => [...prev, trimmed]);
    }
    setDraft("");
    setAdding(false);
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.23, 1, 0.32, 1] }}
      className="mx-auto flex w-full max-w-xl flex-col gap-6"
    >
      <header className="flex flex-col gap-2">
        <h1 className="text-[28px] font-semibold leading-tight tracking-tight">Уточним детали</h1>
        <p className="text-sm text-muted-foreground">
          Это направления, которые мы определили. Поправьте, если что-то не так.
        </p>
      </header>

      <div className="flex flex-wrap gap-2">
        {labels.map((label) => (
          <span
            key={label}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-sm text-foreground",
            )}
          >
            {label}
            <button
              type="button"
              onClick={() => remove(label)}
              aria-label={`Убрать ${label}`}
              className="text-muted-foreground transition-colors hover:text-foreground"
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
        {adding ? (
          <span className="inline-flex items-center rounded-full border border-brand/50 bg-brand-muted px-2 py-0.5">
            <Input
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={commitDraft}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  commitDraft();
                }
                if (e.key === "Escape") {
                  setDraft("");
                  setAdding(false);
                }
              }}
              placeholder="Своё направление"
              className="h-7 w-44 border-0 bg-transparent px-1 text-sm focus-visible:ring-0"
            />
          </span>
        ) : (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="inline-flex items-center gap-1 rounded-full border border-dashed border-border px-3 py-1 text-sm text-muted-foreground transition-colors hover:border-brand/50 hover:text-foreground"
          >
            <Plus className="h-3 w-3" />
            добавить
          </button>
        )}
      </div>

      <div className="mt-2 flex justify-start">
        <Button onClick={onContinue} disabled={labels.length === 0}>
          Продолжить →
        </Button>
      </div>
    </motion.div>
  );
}
