"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, Plus, Minus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StepContent } from "@/sections/signals/steps/step-content";
import { StepProps } from "@/types/campaign";
import { useAppState } from "@/state/app-state-context";
import { VERTICALS, getInterestById } from "@/data/triggers-by-vertical";
import { getInterestsForDirection } from "@/data/interests-by-direction";
import type { Interest, Trigger, Vertical } from "@/types/directions";
import {
  applyEditToDelta,
  EMPTY_DELTA,
  isDeltaEmpty,
  parseTriggerCommand,
  removeFromDelta,
  type ParsedTriggerCommand,
  type TriggerDelta,
} from "@/lib/trigger-edit-parser";
import {
  useTriggerEditHost,
  type TriggerEditSubmitResult,
} from "@/state/trigger-edit-context";
import {
  usePromptChips,
  type ChipSegment,
} from "@/state/prompt-chips-context";
import { cn } from "@/lib/utils";

/** Return a copy of `obj` without the given key. Avoids the
 *  `const { [k]: _, ...rest } = obj` pattern that triggers
 *  `no-unused-vars` in our ESLint config. */
function omitKey<T extends object, K extends keyof T>(
  obj: T,
  key: K
): Omit<T, K> {
  const next = { ...obj };
  delete next[key];
  return next;
}

/**
 * Map dev-panel `clientDirection` ids (legacy BUSINESS_DIRECTIONS) to vertical
 * ids in the spec-aligned data layer. Most match 1:1; "medicine" is renamed
 * to "health". Unknown ids fall through to a sensible default.
 */
function directionToVerticalId(direction: string): string {
  if (direction === "medicine") return "health";
  return direction;
}

function resolveVertical(direction: string): Vertical {
  const id = directionToVerticalId(direction);
  return VERTICALS.find((v) => v.id === id) ?? VERTICALS[0];
}

/**
 * Pick the relevant interests for the current direction.
 *   1. If `clientDirection` matches a key in INTERESTS_BY_DIRECTION, use that
 *      curated list (filtered to interests that exist in our data layer).
 *   2. Otherwise, fall back to all interests of the resolved vertical.
 */
function resolveInterests(direction: string, vertical: Vertical): Interest[] {
  const curated = getInterestsForDirection(direction)
    .map((id) => getInterestById(id))
    .filter((i): i is Interest => i !== undefined);
  if (curated.length > 0) return curated;
  return vertical.interests;
}

function InterestChip({
  label,
  selected,
  onToggle,
}: {
  label: string;
  selected: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        "rounded-lg border px-3 py-2 text-left text-sm transition-all",
        selected
          ? "border-primary bg-accent text-foreground ring-1 ring-primary"
          : "border-border bg-card text-muted-foreground hover:bg-accent hover:text-foreground"
      )}
    >
      {label}
    </button>
  );
}

function MascotIcon({ className }: { className?: string }) {
  return (
    <Image
      src="/mascot-icon.svg"
      alt=""
      width={20}
      height={20}
      aria-hidden
      className={cn("shrink-0", className)}
    />
  );
}

function DeltaChip({
  domain,
  variant,
  onRemove,
}: {
  domain: string;
  variant: "added" | "excluded";
  onRemove: () => void;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs",
        variant === "added"
          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
          : "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300"
      )}
    >
      {domain}
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Удалить ${domain}`}
        className="opacity-60 transition-opacity hover:opacity-100"
      >
        <X className="h-3 w-3" />
      </button>
    </span>
  );
}

interface TriggerCardProps {
  trigger: Trigger;
  selected: boolean;
  delta: TriggerDelta;
  isEditing: boolean;
  highlight: boolean;
  onToggle: () => void;
  onConfigureClick: () => void;
  onRemoveDelta: (bucket: "added" | "excluded", domain: string) => void;
}

function TriggerCard({
  trigger,
  selected,
  delta,
  isEditing,
  highlight,
  onToggle,
  onConfigureClick,
  onRemoveDelta,
}: TriggerCardProps) {
  const showDelta = selected && !isDeltaEmpty(delta);

  return (
    <div
      className={cn(
        "overflow-hidden rounded-lg border transition-colors",
        selected
          ? "border-primary bg-accent/40 ring-1 ring-primary"
          : "border-border bg-card hover:border-primary/50",
        isEditing && "ring-2 ring-primary/60",
        highlight && "ring-2 ring-amber-400/70 transition-shadow"
      )}
    >
      <div className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm">
        <button
          type="button"
          onClick={onToggle}
          className="flex flex-1 items-center gap-3 text-left"
        >
          <span
            className={cn(
              "flex h-4 w-4 shrink-0 items-center justify-center rounded-[4px] border transition-colors",
              selected
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-background"
            )}
          >
            {selected && <Check className="h-3 w-3" />}
          </span>
          <span
            className={cn(
              "flex-1 font-medium",
              selected ? "text-foreground" : "text-muted-foreground"
            )}
          >
            {trigger.label}
          </span>
        </button>

        {selected && (
          <button
            type="button"
            onClick={onConfigureClick}
            aria-pressed={isEditing}
            className={cn(
              "shrink-0 inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium transition-colors",
              isEditing
                ? "border-primary bg-primary/10 text-foreground"
                : "border-border bg-background text-muted-foreground hover:bg-accent hover:text-foreground"
            )}
          >
            <MascotIcon className="h-4 w-4" />
            Настроить
          </button>
        )}
      </div>

      {showDelta && (
        <div className="animate-in fade-in-0 slide-in-from-top-1 flex flex-col gap-2 border-t border-primary/20 bg-background/40 px-3 py-3">
          {delta.added.length > 0 && (
            <div className="flex items-start gap-2 text-xs">
              <span className="mt-0.5 inline-flex items-center gap-1 font-medium text-muted-foreground">
                <Plus className="h-3 w-3" /> Добавлено
              </span>
              <div className="flex flex-wrap gap-1.5">
                {delta.added.map((d) => (
                  <DeltaChip
                    key={`add-${d}`}
                    domain={d}
                    variant="added"
                    onRemove={() => onRemoveDelta("added", d)}
                  />
                ))}
              </div>
            </div>
          )}
          {delta.excluded.length > 0 && (
            <div className="flex items-start gap-2 text-xs">
              <span className="mt-0.5 inline-flex items-center gap-1 font-medium text-muted-foreground">
                <Minus className="h-3 w-3" /> Исключено
              </span>
              <div className="flex flex-wrap gap-1.5">
                {delta.excluded.map((d) => (
                  <DeltaChip
                    key={`exc-${d}`}
                    domain={d}
                    variant="excluded"
                    onRemove={() => onRemoveDelta("excluded", d)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function Step2Interests({ data, onNext }: StepProps) {
  const { clientDirection } = useAppState();
  const vertical = useMemo(
    () => resolveVertical(clientDirection),
    [clientDirection]
  );
  const interestsForDirection = useMemo(
    () => resolveInterests(clientDirection, vertical),
    [clientDirection, vertical]
  );

  const [selectedInterests, setSelectedInterests] = useState<string[]>(
    data.interests
  );
  const [selectedTriggers, setSelectedTriggers] = useState<string[]>(
    data.triggers
  );
  const [deltas, setDeltas] = useState<Record<string, TriggerDelta>>({});
  const [highlightedTriggerIds, setHighlightedTriggerIds] = useState<
    Set<string>
  >(() => new Set());

  const host = useTriggerEditHost();
  const chipsApi = usePromptChips();

  // Triggers currently in edit context = trigger ids of chips in the prompt
  // bar. Multiple triggers can be edited simultaneously; the next text submit
  // applies the parsed command to each.
  const editTargetIds = useMemo(() => {
    const set = new Set<string>();
    for (const c of chipsApi.chips) {
      if (c.kind === "trigger" && typeof c.payload === "string") {
        set.add(c.payload);
      }
    }
    return set;
  }, [chipsApi.chips]);

  // The list of trigger objects available — flattened from all interests
  // selected (so user can mix triggers across multiple interests).
  const availableTriggers = useMemo<Array<{
    interest: Interest;
    trigger: Trigger;
  }>>(() => {
    return interestsForDirection
      .filter((i) => selectedInterests.includes(i.id))
      .flatMap((interest) =>
        interest.triggers.map((trigger) => ({ interest, trigger }))
      );
  }, [interestsForDirection, selectedInterests]);

  // Lookup map for resolving label → trigger object (used by the submit
  // pipeline since the prompt-bar lives elsewhere).
  const triggerById = useMemo(() => {
    const m = new Map<string, Trigger>();
    for (const { trigger } of availableTriggers) m.set(trigger.id, trigger);
    return m;
  }, [availableTriggers]);

  function toggleInterest(id: string) {
    setSelectedInterests((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  }

  function toggleTrigger(triggerId: string) {
    setSelectedTriggers((prev) => {
      const next = prev.includes(triggerId)
        ? prev.filter((t) => t !== triggerId)
        : [...prev, triggerId];
      // Unchecking a trigger also drops its edit chip from the prompt-bar
      // — you can't edit a trigger you're no longer selecting.
      if (!next.includes(triggerId) && editTargetIds.has(triggerId)) {
        chipsApi.removeChip(`trigger_${triggerId}`);
      }
      return next;
    });
  }

  function handleConfigureClick(triggerId: string) {
    const chipId = `trigger_${triggerId}`;
    if (editTargetIds.has(triggerId)) {
      // Toggle off — remove this trigger from the edit context.
      chipsApi.removeChip(chipId);
      return;
    }
    const trigger = triggerById.get(triggerId);
    if (!trigger) return;
    chipsApi.pushChip({
      id: chipId,
      kind: "trigger",
      label: trigger.label,
      payload: triggerId,
      removable: true,
    });
  }

  function handleRemoveDelta(
    triggerId: string,
    bucket: "added" | "excluded",
    domain: string
  ) {
    setDeltas((prev) => {
      const current = prev[triggerId] ?? EMPTY_DELTA;
      const next = removeFromDelta(current, bucket, domain);
      if (isDeltaEmpty(next)) return omitKey(prev, triggerId);
      return { ...prev, [triggerId]: next };
    });
  }

  // Submit pipeline — receives one segment per chip (chip + its trailing
  // text). Each segment runs the parser independently so user can write
  //   "<chip A> добавь x.ru, <chip B> исключи y.ru"
  // and have x.ru land on A's delta, y.ru on B's.
  const submit = useCallback(
    async (segments: ChipSegment[]): Promise<TriggerEditSubmitResult> => {
      const triggerSegments = segments.filter(
        (s) => s.chip.kind === "trigger"
      );
      if (triggerSegments.length === 0) {
        return { ok: false, message: "Нет активных триггеров для правки." };
      }

      // Validate every segment up-front. If any segment fails the parser we
      // surface the first fallback message and abort the whole submit so the
      // user can fix their input — matches the prior single-target behavior.
      const parsedPerSegment: Array<{
        triggerId: string;
        parsed: Exclude<ParsedTriggerCommand, { kind: "fallback" }>;
      }> = [];
      for (const seg of triggerSegments) {
        const triggerId = seg.chip.payload as string;
        if (!triggerId) continue;
        // Empty text means the user dropped a chip without a command —
        // skip it silently.
        if (seg.text.length === 0) continue;
        const parsed = parseTriggerCommand(seg.text);
        if (parsed.kind === "fallback") {
          host.setHint(parsed.message);
          return { ok: false, message: parsed.message };
        }
        parsedPerSegment.push({ triggerId, parsed });
      }
      if (parsedPerSegment.length === 0) {
        return {
          ok: false,
          message:
            "Напишите команду после чипсы — например, «добавь auto1.ru».",
        };
      }

      host.setHint(null);
      host.setProcessing(true);
      setHighlightedTriggerIds(
        new Set(parsedPerSegment.map((s) => s.triggerId))
      );
      await new Promise((r) => setTimeout(r, 350));

      setDeltas((prev) => {
        const next = { ...prev };
        for (const { triggerId, parsed } of parsedPerSegment) {
          const current = next[triggerId] ?? EMPTY_DELTA;
          if (parsed.kind === "clear-added") {
            const updated: TriggerDelta = { ...current, added: [] };
            if (isDeltaEmpty(updated)) delete next[triggerId];
            else next[triggerId] = updated;
          } else if (parsed.kind === "clear-excluded") {
            const updated: TriggerDelta = { ...current, excluded: [] };
            if (isDeltaEmpty(updated)) delete next[triggerId];
            else next[triggerId] = updated;
          } else {
            next[triggerId] = applyEditToDelta(
              current,
              parsed.add,
              parsed.exclude
            );
          }
        }
        return next;
      });

      host.setProcessing(false);
      window.setTimeout(() => setHighlightedTriggerIds(new Set()), 600);
      return { ok: true };
    },
    [host]
  );

  // Register submit with the trigger-edit pipeline. The prompt-bar routes
  // submissions here whenever it sees trigger chips. Cleared on step unmount.
  useEffect(() => {
    host.registerSubmit(submit);
    return () => {
      host.setHint(null);
      host.setProcessing(false);
      host.registerSubmit(null);
    };
  }, [host, submit]);

  const hasInterest = selectedInterests.length > 0;
  const canContinue = hasInterest || selectedTriggers.length > 0;

  function handleContinue() {
    // Persist deltas back into the legacy StepData shape so downstream steps
    // (Summary, etc.) can render them. We serialize each delta into the
    // existing TriggerConfig { add, exclude } string format using the
    // trigger label as the key — that's what the legacy summary expects.
    const triggerConfig: Record<string, { add: string; exclude: string }> = {};
    const triggerLabels: string[] = [];
    for (const triggerId of selectedTriggers) {
      const t = triggerById.get(triggerId);
      if (!t) continue;
      triggerLabels.push(t.label);
      const d = deltas[triggerId];
      if (d) {
        triggerConfig[t.label] = {
          add: d.added.join(", "),
          exclude: d.excluded.join(", "),
        };
      }
    }
    const interestLabels = selectedInterests
      .map((id) => interestsForDirection.find((i) => i.id === id)?.label)
      .filter((l): l is string => Boolean(l));

    onNext({
      interests: interestLabels,
      triggers: triggerLabels,
      triggerConfig,
    });
  }

  return (
    <StepContent
      title="Какие интересы и триггеры вы ищете?"
      subtitle={`Направление: ${vertical.label}. Выберите интересы, затем уточните триггеры — у выбранного триггера можно настроить, что включать и что исключить через AI`}
    >
      <div className="flex flex-col gap-6">
        {/* Interests */}
        <div>
          <p className="mb-3 text-xs font-medium uppercase tracking-widest text-muted-foreground">
            Интересы
          </p>
          <div className="flex flex-wrap gap-2">
            {interestsForDirection.map((interest) => (
              <InterestChip
                key={interest.id}
                label={interest.label}
                selected={selectedInterests.includes(interest.id)}
                onToggle={() => toggleInterest(interest.id)}
              />
            ))}
          </div>
        </div>

        {/* Triggers */}
        <div>
          <p className="mb-3 text-xs font-medium uppercase tracking-widest text-muted-foreground">
            Триггеры
          </p>
          <div
            className={cn(
              "flex flex-col gap-2 transition-opacity",
              !hasInterest && "pointer-events-none opacity-50"
            )}
          >
            {availableTriggers.map(({ trigger }) => (
              <TriggerCard
                key={trigger.id}
                trigger={trigger}
                selected={selectedTriggers.includes(trigger.id)}
                delta={deltas[trigger.id] ?? EMPTY_DELTA}
                isEditing={editTargetIds.has(trigger.id)}
                highlight={highlightedTriggerIds.has(trigger.id)}
                onToggle={() => toggleTrigger(trigger.id)}
                onConfigureClick={() => handleConfigureClick(trigger.id)}
                onRemoveDelta={(bucket, domain) =>
                  handleRemoveDelta(trigger.id, bucket, domain)
                }
              />
            ))}
          </div>
          {!hasInterest && (
            <p className="mt-2 text-xs text-muted-foreground">
              Сначала выберите хотя бы один интерес — триггеры подстроятся под него
            </p>
          )}
          {hasInterest && editTargetIds.size > 0 && (
            <p className="mt-2 text-xs text-muted-foreground">
              Команды из промпт-бара применятся к {editTargetIds.size === 1
                ? "выбранному триггеру"
                : `${editTargetIds.size} выбранным триггерам`}
              .
            </p>
          )}
        </div>

        <div className="flex flex-col items-start gap-1.5">
          <Button disabled={!canContinue} onClick={handleContinue}>
            Продолжить
          </Button>
          <p className="text-xs text-muted-foreground">
            Если нужного нет в списке — напишите в поле чата
          </p>
        </div>
      </div>
    </StepContent>
  );
}
