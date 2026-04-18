import { nanoid } from "nanoid";
import type {
  Campaign,
  CampaignStatus,
  Preset,
  Signal,
  SignalType,
} from "./app-state";

const SIGNAL_TYPES: SignalType[] = [
  "Регистрация",
  "Первая сделка",
  "Апсейл",
  "Реактивация",
  "Возврат",
  "Удержание",
];

const PRETTY_NAMES = [
  "Летний апсейл премиум",
  "Возврат Q2",
  "Реактивация спящих",
  "Первая сделка — старт",
  "Регистрация онбординг",
  "Удержание VIP",
  "Апсейл флагман",
  "Возврат после месяца тишины",
];

const DAY_MS = 24 * 60 * 60 * 1000;

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function rndInt(rng: () => number, min: number, max: number): number {
  return Math.floor(rng() * (max - min + 1)) + min;
}

function rndPick<T>(rng: () => number, arr: readonly T[]): T {
  return arr[Math.floor(rng() * arr.length)];
}

function rndPastDate(rng: () => number, spanDays: number, now: number): string {
  const offset = Math.floor(rng() * spanDays * DAY_MS);
  return new Date(now - offset).toISOString();
}

function rndFutureDate(rng: () => number, spanDays: number, now: number): string {
  const offset = Math.floor(rng() * spanDays * DAY_MS);
  return new Date(now + offset).toISOString();
}

function splitSegments(count: number, rng: () => number): Signal["segments"] {
  const weights = [rng(), rng(), rng(), rng()];
  const total = weights.reduce((a, b) => a + b, 0) || 1;
  const max = Math.floor((count * weights[0]) / total);
  const high = Math.floor((count * weights[1]) / total);
  const mid = Math.floor((count * weights[2]) / total);
  const low = count - max - high - mid;
  return { max, high, mid, low };
}

export type PresetKey = "empty" | "mid" | "full";

type GenerateSignalsOpts = {
  count: number;
  seed: number;
  countRange: [number, number];
  dateSpanDays: number;
  now: number;
};

export function generateSignals(opts: GenerateSignalsOpts): Signal[] {
  const rng = mulberry32(opts.seed);
  const out: Signal[] = [];
  for (let i = 0; i < opts.count; i++) {
    const type = SIGNAL_TYPES[i % SIGNAL_TYPES.length];
    const count = rndInt(rng, opts.countRange[0], opts.countRange[1]);
    const createdAt = rndPastDate(rng, opts.dateSpanDays, opts.now);
    const updatedAt = rndPastDate(rng, opts.dateSpanDays, opts.now);
    out.push({
      id: `sig_${nanoid(6)}_${i}`,
      type,
      count,
      segments: splitSegments(count, rng),
      createdAt,
      updatedAt,
    });
  }
  return out;
}

type GenerateCampaignsOpts = {
  seed: number;
  signals: Signal[];
  distribution: Record<CampaignStatus, number>;
  dateSpanDays: number;
  now: number;
};

export function generateCampaigns(opts: GenerateCampaignsOpts): Campaign[] {
  const rng = mulberry32(opts.seed);
  const statuses: CampaignStatus[] = [];
  (Object.keys(opts.distribution) as CampaignStatus[]).forEach((status) => {
    for (let i = 0; i < opts.distribution[status]; i++) statuses.push(status);
  });
  // shuffle deterministically
  for (let i = statuses.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [statuses[i], statuses[j]] = [statuses[j], statuses[i]];
  }

  const out: Campaign[] = [];
  let prettyUsed = 0;
  statuses.forEach((status, idx) => {
    const signal = rndPick(rng, opts.signals);
    const usePretty = rng() < 0.2 && prettyUsed < PRETTY_NAMES.length;
    const name = usePretty
      ? PRETTY_NAMES[prettyUsed++]
      : `${signal.type} #${idx + 1}`;
    const createdAt = rndPastDate(rng, opts.dateSpanDays, opts.now);
    const campaign: Campaign = {
      id: `cmp_${nanoid(6)}_${idx}`,
      name,
      signalId: signal.id,
      status,
      createdAt,
    };
    if (status === "active") {
      campaign.launchedAt = rndPastDate(rng, 30, opts.now);
    }
    if (status === "completed") {
      campaign.launchedAt = rndPastDate(rng, opts.dateSpanDays, opts.now);
      campaign.completedAt = rndPastDate(rng, 30, opts.now);
    }
    if (status === "scheduled") {
      campaign.scheduledFor = rndFutureDate(rng, 30, opts.now);
    }
    out.push(campaign);
  });
  return out;
}

function buildPresets(): Record<PresetKey, Preset> {
  const now = Date.now();

  const midSignals = generateSignals({
    count: 5,
    seed: 0x5eed,
    countRange: [500, 8000],
    dateSpanDays: 30,
    now,
  });
  const midCampaigns = generateCampaigns({
    seed: 0xcafe,
    signals: midSignals,
    distribution: { active: 3, completed: 3, scheduled: 2, draft: 2 },
    dateSpanDays: 30,
    now,
  });

  const fullSignals = generateSignals({
    count: 30,
    seed: 0xb16b00b5,
    countRange: [500, 50000],
    dateSpanDays: 90,
    now,
  });
  const fullCampaigns = generateCampaigns({
    seed: 0xf00d,
    signals: fullSignals,
    distribution: { active: 10, completed: 10, scheduled: 6, draft: 6 },
    dateSpanDays: 90,
    now,
  });

  return {
    empty: { key: "empty", label: "Empty", signals: [], campaigns: [] },
    mid: { key: "mid", label: "Mid", signals: midSignals, campaigns: midCampaigns },
    full: { key: "full", label: "Full", signals: fullSignals, campaigns: fullCampaigns },
  };
}

export const PRESETS: Record<PresetKey, Preset> = buildPresets();
