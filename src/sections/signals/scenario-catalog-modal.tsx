"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { SCENARIOS, type Scenario } from "@/data/scenarios";
import { ScenarioCard } from "./scenario-card";

interface ScenarioCatalogModalProps {
  open: boolean;
  onClose: () => void;
  onSelect: (scenarioId: string) => void;
}

function matchesQuery(scenario: Scenario, q: string): boolean {
  if (!q) return true;
  return scenario.name.toLocaleLowerCase("ru-RU").includes(q);
}

export function ScenarioCatalogModal({
  open,
  onClose,
  onSelect,
}: ScenarioCatalogModalProps) {
  const [query, setQuery] = useState("");

  const normalized = query.trim().toLocaleLowerCase("ru-RU");

  const filtered = useMemo(() => {
    return SCENARIOS.filter((s) => matchesQuery(s, normalized));
  }, [normalized]);

  function handleOpenChange(next: boolean) {
    if (!next) {
      setQuery("");
      onClose();
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-3xl gap-5 sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Каталог сценариев</DialogTitle>
        </DialogHeader>

        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Поиск по сценариям…"
            aria-label="Поиск по сценариям"
            className="pl-9"
          />
        </div>

        <div className="max-h-[60vh] overflow-y-auto">
          {filtered.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Ничего не найдено.
            </p>
          ) : (
            <div className="grid auto-rows-fr grid-cols-3 gap-3">
              {filtered.map((s) => (
                <ScenarioCard
                  key={s.id}
                  scenario={s}
                  onClick={onSelect}
                  variant="catalog"
                />
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
