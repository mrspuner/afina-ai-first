import type { Campaign, Signal } from "@/state/app-state";

export interface CampaignStats {
  reach: number;
  conversionPct: number;
  profit: number;
}

function hash(id: string): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = (h * 16777619) >>> 0;
  }
  return h;
}

/**
 * Deterministic mock stats for a campaign — derived from campaign id + signal
 * size. Prototype data only; re-renders always produce the same numbers.
 */
export function getCampaignStats(
  campaign: Campaign,
  signal: Signal | undefined,
): CampaignStats {
  const base = signal?.count ?? 1000;
  const seed = hash(campaign.id);
  const reach = Math.round(base * (0.6 + ((seed % 400) / 1000))); // 60–100% of signal
  const conversionPct = Math.round(((seed >> 3) % 180) / 10) / 10 + 0.8; // 0.8–18.7
  const revenuePerConvertedRub = 800 + ((seed >> 7) % 2400); // 800–3200 ₽
  const costPerMsgRub = 1.2 + (((seed >> 11) % 30) / 10); // 1.2–4.2 ₽
  const converted = Math.round((reach * conversionPct) / 100);
  const profit = Math.round(
    converted * revenuePerConvertedRub - reach * costPerMsgRub,
  );
  return { reach, conversionPct, profit };
}

export function formatCompactRub(value: number): string {
  const sign = value < 0 ? "−" : "";
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `${sign}${(abs / 1_000_000).toFixed(1)} млн ₽`;
  if (abs >= 1_000) return `${sign}${Math.round(abs / 1_000)} тыс ₽`;
  return `${sign}${abs} ₽`;
}

export function formatCount(n: number): string {
  return n.toLocaleString("ru-RU");
}
