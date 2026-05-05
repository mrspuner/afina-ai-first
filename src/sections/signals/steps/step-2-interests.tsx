"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { Check, ChevronDown, Plus, Minus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StepContent } from "@/sections/signals/steps/step-content";
import { StepProps } from "@/types/campaign";
import { useAppState, useAppDispatch } from "@/state/app-state-context";
import { VERTICALS, getInterestById } from "@/data/triggers-by-vertical";
import { getInterestsForDirection } from "@/data/interests-by-direction";
import { getTriggerDomains } from "@/data/trigger-domains";
import type { Interest, Trigger, Vertical } from "@/types/directions";
import {
  applyEditToDelta,
  EMPTY_DELTA,
  isDeltaEmpty,
  removeFromDelta,
  type ParsedTriggerCommand,
  type TriggerDelta,
} from "@/lib/trigger-edit-parser";
import { usePromptChips } from "@/state/prompt-chips-context";
import { useRegisterTriggerEdit, type TriggerEditApi } from "@/state/trigger-edit-context";
import { computeRandomRemix } from "@/lib/random-remix";
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
          ? "border-brand/50 bg-brand-muted text-foreground"
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

function SectionHeader({
  label,
  sectionId,
  onClick,
}: {
  label: string;
  sectionId: "interests" | "triggers";
  onClick: () => void;
}) {
  return (
    <div className="mb-3 flex items-center gap-2">
      <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
        {label}
      </p>
      <button
        type="button"
        onClick={onClick}
        aria-label={`Спросить AI про ${label.toLowerCase()}`}
        className="inline-flex h-5 w-5 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        data-section-id={sectionId}
      >
        <Image src="/mascot-icon.svg" alt="" width={14} height={14} aria-hidden />
      </button>
    </div>
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
  domains: string[];
  selected: boolean;
  delta: TriggerDelta;
  highlight: boolean;
  expanded: boolean;
  onToggle: () => void;
  onToggleExpanded: () => void;
  onConfigureClick: () => void;
  onRemoveDelta: (bucket: "added" | "excluded", domain: string) => void;
}

function DeltaBlock({
  delta,
  onRemoveDelta,
}: {
  delta: TriggerDelta;
  onRemoveDelta: (bucket: "added" | "excluded", domain: string) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
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
  );
}

function TriggerCard({
  trigger,
  domains,
  selected,
  delta,
  highlight,
  expanded,
  onToggle,
  onToggleExpanded,
  onConfigureClick,
  onRemoveDelta,
}: TriggerCardProps) {
  const hasDelta = selected && !isDeltaEmpty(delta);
  const showDomainList = expanded && domains.length > 0;
  const showConfigureButton = expanded && selected;

  return (
    <div
      className={cn(
        "overflow-hidden rounded-lg border transition-colors",
        selected
          ? "border-brand/50 bg-brand-muted"
          : "border-border bg-card hover:border-brand/30",
        highlight && "ring-2 ring-brand transition-shadow"
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

        <button
          type="button"
          onClick={onToggleExpanded}
          aria-expanded={expanded}
          aria-label={expanded ? "Свернуть домены" : "Показать домены"}
          className="shrink-0 inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <ChevronDown
            className={cn(
              "h-4 w-4 transition-transform duration-200",
              expanded && "rotate-180"
            )}
          />
        </button>
      </div>

      {(showDomainList || hasDelta || showConfigureButton) && (
        <div className="animate-in fade-in-0 slide-in-from-top-1 flex flex-col gap-3 border-t border-primary/20 bg-background/40 px-3 py-3">
          {showDomainList && (
            <ul className="flex flex-wrap gap-x-3 gap-y-1 font-mono text-sm tracking-tight text-foreground/85">
              {domains.map((d) => (
                <li key={d}>{d}</li>
              ))}
            </ul>
          )}

          {hasDelta && <DeltaBlock delta={delta} onRemoveDelta={onRemoveDelta} />}

          {showConfigureButton && (
            <div className="flex">
              <button
                type="button"
                onClick={onConfigureClick}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium transition-colors",
                  "border-border bg-background text-muted-foreground hover:bg-accent hover:text-foreground"
                )}
              >
                <MascotIcon className="h-4 w-4" />
                Настроить
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function Step2Interests({ data, onNext }: StepProps) {
  const { clientDirection, wizardRemixToken } = useAppState();
  const dispatch = useAppDispatch();
  const { pushChip, clearChips } = usePromptChips();
  const vertical = useMemo(
    () => resolveVertical(clientDirection),
    [clientDirection]
  );
  const interestsForDirection = useMemo(
    () => resolveInterests(clientDirection, vertical),
    [clientDirection, vertical]
  );

  // Deterministic seeded RNG so the AI-fill prefill is stable for a given
  // direction across remounts within the same session, while still varying
  // between directions.
  function seededRandom(seed: number): () => number {
    let a = seed >>> 0 || 1;
    return () => {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function pickN<T>(items: readonly T[], n: number, rng: () => number): T[] {
    if (n >= items.length) return [...items];
    const copy = [...items];
    // Fisher-Yates shuffle, take first n.
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy.slice(0, n);
  }

  // Pre-fill on first mount when the wizard hasn't filled this step yet —
  // demonstrates the "AI already prepared this for you" behavior described in
  // the subtitle. We seed off the direction so finance vs auto pick different
  // suggestions, but the result is stable inside one direction.
  const initialPrefill = useMemo(() => {
    if (data.interests.length > 0 || data.triggers.length > 0) {
      return { interestIds: data.interests, triggerIds: data.triggers };
    }
    const rng = seededRandom(clientDirection.length || 1);
    const interestIds = pickN(
      interestsForDirection.map((i) => i.id),
      Math.min(3, interestsForDirection.length),
      rng
    );
    const availableTriggerIds = interestsForDirection
      .filter((i) => interestIds.includes(i.id))
      .flatMap((i) => i.triggers.map((t) => t.id));
    const triggerIds = pickN(availableTriggerIds, Math.min(5, availableTriggerIds.length), rng);
    return { interestIds, triggerIds };
    // We intentionally compute this once on mount — that's the AI-fill UX.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [selectedInterests, setSelectedInterests] = useState<string[]>(
    initialPrefill.interestIds
  );
  const [selectedTriggers, setSelectedTriggers] = useState<string[]>(
    initialPrefill.triggerIds
  );
  const [deltas, setDeltas] = useState<Record<string, TriggerDelta>>({});
  const [expandedTriggerIds, setExpandedTriggerIds] = useState<Set<string>>(
    () => new Set()
  );
  const [highlightedTriggerIds, setHighlightedTriggerIds] = useState<
    Set<string>
  >(() => new Set());

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

  // Lookup map for resolving label → trigger object (used by handleContinue).
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
    setSelectedTriggers((prev) =>
      prev.includes(triggerId)
        ? prev.filter((t) => t !== triggerId)
        : [...prev, triggerId]
    );
  }

  function toggleExpanded(triggerId: string) {
    setExpandedTriggerIds((prev) => {
      const next = new Set(prev);
      if (next.has(triggerId)) next.delete(triggerId);
      else next.add(triggerId);
      return next;
    });
  }

  function handleApplyParsed(
    triggerId: string,
    parsed: Exclude<ParsedTriggerCommand, { kind: "fallback" }>
  ) {
    setDeltas((prev) => {
      const current = prev[triggerId] ?? EMPTY_DELTA;
      let updated: TriggerDelta;
      if (parsed.kind === "clear-added") {
        updated = { ...current, added: [] };
      } else if (parsed.kind === "clear-excluded") {
        updated = { ...current, excluded: [] };
      } else {
        updated = applyEditToDelta(current, parsed.add, parsed.exclude);
      }
      const next = { ...prev };
      if (isDeltaEmpty(updated)) delete next[triggerId];
      else next[triggerId] = updated;
      return next;
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

  // ---- Chip helpers ----

  function pushSectionChip(section: "interests" | "triggers") {
    clearChips();
    pushChip({
      id: `section_${section}`,
      kind: "section",
      label: section === "interests" ? "Интересы" : "Триггеры",
      payload: section,
      removable: true,
    });
  }

  function pushTriggerChip(triggerId: string, triggerLabel: string) {
    clearChips();
    pushChip({
      id: `trigger_${triggerId}`,
      kind: "trigger",
      label: triggerLabel,
      payload: triggerId,
      removable: true,
    });
    const el = document.querySelector<HTMLDivElement>('[role="textbox"][contenteditable="true"]');
    el?.focus();
  }

  // ---- TriggerEditApi for the PromptBar bridge ----

  const triggerEditApi = useMemo<TriggerEditApi>(() => ({
    applyToTrigger: (triggerId, parsed) => {
      handleApplyParsed(triggerId, parsed);
    },
    highlightTrigger: (triggerId) => {
      setHighlightedTriggerIds(new Set([triggerId]));
      window.setTimeout(() => setHighlightedTriggerIds(new Set()), 600);
    },
    randomRemix: () => {
      dispatch({ type: "wizard_random_remix" });
    },
    resolveTriggerIdByLabel: (label) => {
      const found = availableTriggers.find(({ trigger }) => trigger.label === label);
      return found ? found.trigger.id : null;
    },
  }), [availableTriggers, dispatch]);

  // Публикуем api в registry — PromptBar (sibling этого компонента) читает его
  // через useTriggerEdit. На unmount api сбрасывается в NOOP.
  useRegisterTriggerEdit(triggerEditApi);

  // ---- Remix subscriber: re-roll selection when wizardRemixToken increments ----

  useEffect(() => {
    if (wizardRemixToken === 0) return;
    const vertical = {
      interestIds: interestsForDirection.map((i) => i.id),
      triggerIdsByInterest: Object.fromEntries(
        interestsForDirection.map((i) => [i.id, i.triggers.map((t) => t.id)])
      ),
      domainsByTrigger: Object.fromEntries(
        interestsForDirection.flatMap((i) =>
          i.triggers.map((t) => [t.id, getTriggerDomains(t.id)])
        )
      ),
    };
    const r = computeRandomRemix(vertical, wizardRemixToken * 31 + 7);
    setSelectedInterests(r.interestIds);
    setSelectedTriggers(r.triggerIds);
    setDeltas(r.deltas);
    setHighlightedTriggerIds(new Set(r.triggerIds));
    window.setTimeout(() => setHighlightedTriggerIds(new Set()), 800);
  }, [wizardRemixToken, interestsForDirection]);

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
        subtitle="Мы уже сгенерили настройки под вас — выберите интересы и триггеры в любом порядке."
      >
        <div className="flex flex-col gap-6">
          {/* Interests */}
          <div>
            <SectionHeader
              label="Интересы"
              sectionId="interests"
              onClick={() => pushSectionChip("interests")}
            />
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
            <SectionHeader
              label="Триггеры"
              sectionId="triggers"
              onClick={() => pushSectionChip("triggers")}
            />
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
                  domains={getTriggerDomains(trigger.id)}
                  selected={selectedTriggers.includes(trigger.id)}
                  delta={deltas[trigger.id] ?? EMPTY_DELTA}
                  highlight={highlightedTriggerIds.has(trigger.id)}
                  expanded={expandedTriggerIds.has(trigger.id)}
                  onToggle={() => toggleTrigger(trigger.id)}
                  onToggleExpanded={() => toggleExpanded(trigger.id)}
                  onConfigureClick={() => pushTriggerChip(trigger.id, trigger.label)}
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
