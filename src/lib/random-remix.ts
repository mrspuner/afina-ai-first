// src/lib/random-remix.ts
import type { TriggerDelta } from "./trigger-edit-parser";

export interface RemixVertical {
  interestIds: string[];
  triggerIdsByInterest: Record<string, string[]>;
  domainsByTrigger: Record<string, string[]>;
}

export interface RemixResult {
  interestIds: string[];
  triggerIds: string[];
  deltas: Record<string, TriggerDelta>;
}

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
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, n);
}

export function computeRandomRemix(vertical: RemixVertical, seed: number): RemixResult {
  const rng = seededRandom(seed);
  const interestCount = Math.max(1, Math.min(vertical.interestIds.length, 2 + Math.floor(rng() * 2)));
  const interestIds = pickN(vertical.interestIds, interestCount, rng);

  const availableTriggerIds = interestIds.flatMap((iid) => vertical.triggerIdsByInterest[iid] ?? []);
  const triggerCount = Math.max(1, Math.min(availableTriggerIds.length, 3 + Math.floor(rng() * 3)));
  const triggerIds = pickN(availableTriggerIds, triggerCount, rng);

  // Половине выбранных триггеров накидаем delta — добавление 1-2 доменов из соседнего пула.
  const deltas: Record<string, TriggerDelta> = {};
  const allDomains = Object.values(vertical.domainsByTrigger).flat();
  const deltaTargets = pickN(triggerIds, Math.ceil(triggerIds.length / 2), rng);
  for (const tid of deltaTargets) {
    const ownDomains = new Set(vertical.domainsByTrigger[tid] ?? []);
    const candidates = allDomains.filter((d) => !ownDomains.has(d));
    if (candidates.length === 0) continue;
    const added = pickN(candidates, Math.min(2, candidates.length), rng);
    deltas[tid] = { added, excluded: [] };
  }

  return { interestIds, triggerIds, deltas };
}
