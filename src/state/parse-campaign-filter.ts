import type { CampaignStatus } from "./app-state";

const STATUS_ROOTS: Array<{ status: CampaignStatus; roots: string[] }> = [
  { status: "draft", roots: ["черновик", "драфт", "draft"] },
  { status: "scheduled", roots: ["запланиров", "расписани", "scheduled", "план"] },
  { status: "active", roots: ["активн", "запущен", "идёт", "идет", "active", "running"] },
  { status: "paused", roots: ["приостанов", "пауз", "paused", "останов"] },
  { status: "completed", roots: ["завершен", "завершён", "закончен", "completed", "готов"] },
];

export function parseCampaignFilter(text: string): CampaignStatus[] {
  const normalized = text
    .toLowerCase()
    .replace(/[,;/]+/g, " ")
    .replace(/\s+и\s+/g, " ");
  const tokens = normalized.split(/\s+/).filter(Boolean);
  const out: CampaignStatus[] = [];
  for (const token of tokens) {
    for (const { status, roots } of STATUS_ROOTS) {
      if (roots.some((root) => token.startsWith(root))) {
        if (!out.includes(status)) out.push(status);
        break;
      }
    }
  }
  return out;
}
