import type { Period } from "./statistics-state";

export type DateRange = { from: Date; to: Date };

function startOfQuarter(d: Date): Date {
  const q = Math.floor(d.getMonth() / 3);
  return new Date(d.getFullYear(), q * 3, 1);
}

function endOfQuarter(d: Date): Date {
  const q = Math.floor(d.getMonth() / 3);
  return new Date(d.getFullYear(), q * 3 + 3, 0);
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function endOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}

function addMonths(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth() + n, 1);
}

export function resolvePeriod(
  period: Period,
  now: Date = new Date(),
): DateRange {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  switch (period.preset) {
    case "today":
      return { from: today, to: today };
    case "yesterday": {
      const y = new Date(today);
      y.setDate(y.getDate() - 1);
      return { from: y, to: y };
    }
    case "this-quarter":
      return { from: startOfQuarter(today), to: endOfQuarter(today) };
    case "last-quarter": {
      const prev = addMonths(today, -3);
      return { from: startOfQuarter(prev), to: endOfQuarter(prev) };
    }
    case "this-month":
      return { from: startOfMonth(today), to: endOfMonth(today) };
    case "last-month": {
      const prev = addMonths(today, -1);
      return { from: startOfMonth(prev), to: endOfMonth(prev) };
    }
    case "this-year":
      return {
        from: new Date(today.getFullYear(), 0, 1),
        to: new Date(today.getFullYear(), 11, 31),
      };
    case "last-year":
      return {
        from: new Date(today.getFullYear() - 1, 0, 1),
        to: new Date(today.getFullYear() - 1, 11, 31),
      };
    case "custom":
      return {
        from: period.from ? new Date(period.from) : today,
        to: period.to ? new Date(period.to) : today,
      };
  }
}

const DATE_FMT = new Intl.DateTimeFormat("ru-RU", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

export function formatDateRu(d: Date): string {
  return DATE_FMT.format(d);
}

export function formatDateRangeRu(range: DateRange): string {
  if (range.from.getTime() === range.to.getTime()) {
    return formatDateRu(range.from);
  }
  return `${formatDateRu(range.from)} — ${formatDateRu(range.to)}`;
}

export function daysBetween(range: DateRange): number {
  const ms = range.to.getTime() - range.from.getTime();
  return Math.max(1, Math.round(ms / 86400000) + 1);
}

export function eachDay(range: DateRange): Date[] {
  const result: Date[] = [];
  const cursor = new Date(range.from);
  while (cursor.getTime() <= range.to.getTime()) {
    result.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return result;
}

export function eachWeek(range: DateRange): DateRange[] {
  const result: DateRange[] = [];
  const cursor = new Date(range.from);
  while (cursor.getTime() <= range.to.getTime()) {
    const weekStart = new Date(cursor);
    const day = (weekStart.getDay() + 6) % 7;
    weekStart.setDate(weekStart.getDate() - day);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    const from = weekStart < range.from ? new Date(range.from) : weekStart;
    const to = weekEnd > range.to ? new Date(range.to) : weekEnd;
    result.push({ from, to });
    cursor.setTime(weekEnd.getTime());
    cursor.setDate(cursor.getDate() + 1);
  }
  return result;
}

export function eachMonth(range: DateRange): DateRange[] {
  const result: DateRange[] = [];
  const cursor = new Date(range.from.getFullYear(), range.from.getMonth(), 1);
  while (cursor.getTime() <= range.to.getTime()) {
    const mStart = new Date(cursor);
    const mEnd = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0);
    const from = mStart < range.from ? new Date(range.from) : mStart;
    const to = mEnd > range.to ? new Date(range.to) : mEnd;
    result.push({ from, to });
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return result;
}

const MONTH_NAMES = [
  "Январь",
  "Февраль",
  "Март",
  "Апрель",
  "Май",
  "Июнь",
  "Июль",
  "Август",
  "Сентябрь",
  "Октябрь",
  "Ноябрь",
  "Декабрь",
];

export function monthLabel(d: Date): string {
  return `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;
}

export function weekNumber(d: Date): number {
  const target = new Date(
    Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()),
  );
  const dayNum = (target.getUTCDay() + 6) % 7;
  target.setUTCDate(target.getUTCDate() - dayNum + 3);
  const firstThursday = new Date(Date.UTC(target.getUTCFullYear(), 0, 4));
  const diff = target.getTime() - firstThursday.getTime();
  return 1 + Math.round(diff / (7 * 86400000));
}
