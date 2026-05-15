/**
 * Pure view-logic for trigger domains (Mechanic M2).
 *
 * System domains (TRIGGER_DOMAINS) are an indestructible layer. The user layer
 * (TriggerDelta) can *exclude* a system domain — a reversible operation that
 * never deletes the underlying system data. These helpers compute, from a
 * system-domain list + the current delta:
 *   - which system domains are still ACTIVE vs EXCLUDED;
 *   - a one-line preview ("show first N, then +M") for the collapsed card.
 *
 * Rendering lives in step-2-interests.tsx; this module is intentionally
 * pure + unit-tested so the +N math and exclusion math are not coupled to React.
 */

import type { TriggerDelta } from "./trigger-edit-parser";

/**
 * How many system domains the collapsed card shows inline before collapsing the
 * rest into a "+N" chip. A FIXED count is used on purpose: exact one-line fit
 * needs DOM measurement and is overkill for the prototype. 3 reads cleanly on
 * the step-2 column width with typical .ru domains.
 */
export const PREVIEW_VISIBLE_COUNT = 3;

export interface SystemDomainSplit {
  /** System domains NOT excluded by the user — shown as plain/✕ chips. */
  active: string[];
  /** System domains the user has excluded — shown struck-through, reversible. */
  excluded: string[];
}

/**
 * Partition `systemDomains` into active vs excluded using `delta.excluded`.
 * Comparison is case-insensitive. Order of the original system list is kept.
 * Excluded entries that are not actually system domains are ignored here
 * (those are user-added exclusions and belong to DeltaBlock, not this split).
 */
export function splitSystemDomains(
  systemDomains: string[],
  delta: TriggerDelta
): SystemDomainSplit {
  const excludedLower = new Set(delta.excluded.map((d) => d.toLowerCase()));
  const active: string[] = [];
  const excluded: string[] = [];
  for (const domain of systemDomains) {
    if (excludedLower.has(domain.toLowerCase())) excluded.push(domain);
    else active.push(domain);
  }
  return { active, excluded };
}

export interface DomainPreview {
  /** Domains rendered inline on the collapsed preview line. */
  visible: string[];
  /** How many domains are hidden behind the "+N" chip. 0 → no overflow chip. */
  overflowCount: number;
}

/**
 * Take the first `visibleCount` domains for the collapsed one-line preview and
 * report how many overflow into the "+N" chip.
 */
export function previewDomains(
  domains: string[],
  visibleCount: number
): DomainPreview {
  if (domains.length <= visibleCount) {
    return { visible: [...domains], overflowCount: 0 };
  }
  return {
    visible: domains.slice(0, visibleCount),
    overflowCount: domains.length - visibleCount,
  };
}
