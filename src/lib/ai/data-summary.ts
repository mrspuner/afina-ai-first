import type { Campaign, Signal } from "@/state/app-state";
import type { FunnelNumbers } from "@/state/metrics";
import { buildFacts, aggregate } from "@/sections/statistics/fact-cube";

/**
 * Компактная текстовая сводка реального стейта для промпта оркестратора.
 * Только то, что нужно для ответов: имена/статусы/бюджеты кампаний,
 * сигналы с размерами сегментов. Без параметров нод, без ключей.
 * Формат — плоский текст: модель читает его лучше, чем JSON, и он дешевле.
 */
export function buildDataSummary(input: {
  campaigns: Campaign[];
  signals: Signal[];
  /** Готовые строки статистики — собирает вызывающий из fact-cube. */
  statsLines?: string[];
}): string {
  const lines: string[] = [];
  lines.push(`Кампаний: ${input.campaigns.length}`);
  for (const c of input.campaigns.slice(0, 20)) {
    lines.push(
      `- кампания "${c.name}" (id ${c.id}): статус ${c.status}` +
        (c.budget ? `, бюджет ${c.budget} ₽` : "") +
        (c.scenario ? `, сценарий «${c.scenario.name}»` : "")
    );
  }
  lines.push(`Сигналов: ${input.signals.length}`);
  for (const s of input.signals.slice(0, 20)) {
    lines.push(
      `- сигнал "${s.name ?? s.type}" (id ${s.id}): тип ${s.type}, ` +
        `аудитория ${s.count}, сегменты max ${s.segments.max} / high ${s.segments.high} / mid ${s.segments.mid} / low ${s.segments.low}`
    );
  }
  if (input.statsLines?.length) {
    lines.push("Статистика:");
    lines.push(...input.statsLines);
  }
  return lines.join("\n");
}

/** Строки агрегатов для сводки: общий доход/расход/отправки за всё время. */
export function statsLinesFromFunnel(total: FunnelNumbers): string[] {
  return [
    `- всего: отправок ${total.sends}, кликов ${total.clicks}, конверсий ${total.approves}`,
    `- деньги: доход $${Math.round(total.incomeUsd)}, расход $${Math.round(total.expensesUsd)}`,
  ];
}

/**
 * Строит строки статистики из fact-cube для заданных кампаний.
 * Период: с начала текущего года по now.
 * Используется в buildDataSummary чтобы не дублировать логику в потребителях.
 */
export function buildStatsLines(campaigns: Campaign[], now: Date): string[] {
  const signals = campaigns.map((c) => ({ id: c.signalId, count: 0 }));
  const period = {
    from: new Date(now.getFullYear(), 0, 1),
    to: new Date(now.getFullYear(), 11, 31),
  };
  const facts = buildFacts({ campaigns, signals }, period, { now });
  const total = aggregate(facts);
  return statsLinesFromFunnel(total);
}
