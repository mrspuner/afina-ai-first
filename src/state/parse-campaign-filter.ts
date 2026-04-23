import type { CampaignStatus } from "./app-state";

export type CampaignSort = "default" | "profit-desc" | "conversion-desc";

export interface CampaignQuery {
  statuses: CampaignStatus[];
  sort: CampaignSort;
}

const STATUS_ROOTS: Array<{ status: CampaignStatus; roots: string[] }> = [
  { status: "draft", roots: ["черновик", "драфт", "draft"] },
  { status: "scheduled", roots: ["запланиров", "расписани", "scheduled", "план"] },
  { status: "active", roots: ["активн", "запущен", "идёт", "идет", "active", "running"] },
  { status: "paused", roots: ["приостанов", "пауз", "paused", "останов"] },
  { status: "completed", roots: ["завершен", "завершён", "закончен", "completed", "готов"] },
];

const SORT_ROOTS: Array<{ sort: CampaignSort; roots: string[] }> = [
  { sort: "profit-desc", roots: ["прибыльн", "прибыл", "доходн", "profitable", "profit"] },
  { sort: "conversion-desc", roots: ["конверси", "conversion"] },
];

export function parseCampaignQuery(text: string): CampaignQuery {
  const normalized = text
    .toLowerCase()
    // The "draft" status label is "Не запущено" — collapse the negated phrase
    // to "черновик" before stem matching so that "запущ" doesn't latch onto
    // the "active" root. Note: JS `\b` is ASCII-only, so we anchor on string
    // start or whitespace explicitly to make this work for Cyrillic.
    .replace(/(^|\s)не\s+запущ[а-яё]*/g, "$1черновик")
    .replace(/[,;/]+/g, " ")
    .replace(/\s+и\s+/g, " ");
  const tokens = normalized.split(/\s+/).filter(Boolean);
  const statuses: CampaignStatus[] = [];
  let sort: CampaignSort = "default";
  for (const token of tokens) {
    let matched = false;
    for (const { status, roots } of STATUS_ROOTS) {
      if (roots.some((root) => token.startsWith(root))) {
        if (!statuses.includes(status)) statuses.push(status);
        matched = true;
        break;
      }
    }
    if (matched) continue;
    if (sort === "default") {
      for (const { sort: s, roots } of SORT_ROOTS) {
        if (roots.some((root) => token.startsWith(root))) {
          sort = s;
          break;
        }
      }
    }
  }
  return { statuses, sort };
}

/** Legacy alias kept for call sites that only need status filtering. */
export function parseCampaignFilter(text: string): CampaignStatus[] {
  return parseCampaignQuery(text).statuses;
}
