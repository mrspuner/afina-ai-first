import {
  eachDay,
  eachMonth,
  eachWeek,
  formatDateRangeRu,
  formatDateRu,
  monthLabel,
  resolvePeriod,
  weekNumber,
  type DateRange,
} from "./period-utils";
import type {
  ColumnKey,
  Currency,
  RowKind,
  SortState,
  StatisticsFilters,
} from "./statistics-state";
import {
  deriveCampaignFunnel,
  deriveFunnel,
  hashSeed,
  makeRng,
} from "@/state/metrics";

export type RowData = {
  expenses: string;
  income: string;
  sends: number;
  actions: number;
  holds: number;
  approves: number;
  ar: string;
  rejects: number;
  rr: string;
  clicks: number;
};

export type GeneratedRow = {
  key: string;
  label: string;
  caption?: string;
  data: RowData;
  subRows: { key: string; label: string; data: RowData }[];
};

const WEEKDAY_NAMES = [
  "Понедельник",
  "Вторник",
  "Среда",
  "Четверг",
  "Пятница",
  "Суббота",
  "Воскресенье",
];

const STATIC_LABELS: Record<
  Exclude<
    RowKind,
    "days" | "weeks" | "months" | "weekdays"
  >,
  string[]
> = {
  offers: [
    "Кредит наличными",
    "Депозит «Гибкий»",
    "Карта Cashback+",
    "Ипотека «Семейная»",
    "Автокредит Light",
    "Страхование жизни",
    "Премиум-пакет",
    "Подписка Pro",
    "Инвест-счёт",
    "Накопительный вклад",
  ],
  subscribers: [
    "Активные держатели карт",
    "Премиум-сегмент",
    "Новые клиенты 0–30 дней",
    "Отток-риск",
    "Молодая аудитория 18–25",
    "VIP-клиенты",
    "Зарплатный проект",
    "Неактивные 90+ дней",
    "Digital-only",
    "Региональные",
  ],
  channels: [
    "SMS",
    "Push",
    "Email",
    "Viber",
    "WhatsApp",
    "Звонок",
    "Личный кабинет",
    "Мобильное приложение",
  ],
  creatives: [
    "Баннер «Весна»",
    "Видео 15s",
    "Текст A/B #1",
    "Карусель «Преимущества»",
    "Лендинг v2",
    "Персональное письмо",
    "Статичный креатив",
    "Интерактивная форма",
  ],
  triggers: [
    "Покупка > 5000",
    "Забытая корзина",
    "Смена сегмента",
    "Реактивация 60 дней",
    "Приветственная серия",
    "Пост-покупка",
    "День рождения",
    "Геолокация: отделение",
  ],
  landings: [
    "Главная /offer-2026",
    "Лендинг кредита",
    "Лендинг депозита",
    "Страница акции",
    "Форма заявки",
    "Посадочная для push",
  ],
  campaigns: [
    "Весна 2026",
    "Летний cashback",
    "Реактивация Q2",
    "Премиум-серия",
    "Ипотечная волна",
    "Welcome-серия",
    "Кросс-продажи",
    "Удержание VIP",
    "Региональная кампания",
    "День клиента",
  ],
  scenarios: [
    "SMS → Витрина → Лендинг",
    "Push → ЛК → Заявка",
    "Email → Лендинг",
    "Звонок → ЛК",
    "Viber → Заявка",
  ],
  strategies: [
    "Первичная витрина",
    "Каскадное сообщение",
    "A/B бандл",
    "Retention-треугольник",
    "Upsell-цепочка",
  ],
  advertisers: [
    "ООО «Вектор»",
    "АО «Северная звезда»",
    "ГК «Меридиан»",
    "ТД «Радуга»",
    "АО «Прогресс»",
  ],
  "traffic-suppliers": [
    "Yandex Ads",
    "VK Реклама",
    "MyTarget",
    "Google Ads",
    "Telegram Ads",
    "Ozon Ads",
  ],
};

// Funnel-математика, форматирование денег и PRNG живут в едином движке чисел
// (src/state/metrics.ts). Здесь — только сборка строк отчёта.
function generateRowData(
  seed: number,
  currency: Currency,
  baseSends?: number,
): RowData {
  return deriveFunnel(makeRng(seed), currency, baseSends);
}

type LabeledKey = { key: string; label: string; caption?: string };

function labelsForKind(kind: RowKind, period: DateRange): LabeledKey[] {
  if (kind === "days") {
    return eachDay(period)
      .reverse()
      .map((d) => ({
        key: `d-${d.toISOString().slice(0, 10)}`,
        label: formatDateRu(d),
      }));
  }
  if (kind === "weekdays") {
    return WEEKDAY_NAMES.map((name, i) => ({
      key: `wd-${i}`,
      label: name,
    }));
  }
  if (kind === "weeks") {
    return eachWeek(period)
      .reverse()
      .map((w) => ({
        key: `w-${w.from.toISOString().slice(0, 10)}`,
        label: `Неделя ${weekNumber(w.from)}`,
        caption: formatDateRangeRu(w),
      }));
  }
  if (kind === "months") {
    return eachMonth(period)
      .reverse()
      .map((m) => ({
        key: `m-${m.from.toISOString().slice(0, 7)}`,
        label: monthLabel(m.from),
        caption: formatDateRangeRu(m),
      }));
  }
  return STATIC_LABELS[kind].map((label, i) => ({
    key: `${kind}-${i}`,
    label,
  }));
}

/**
 * Превращает значение ячейки (число или денежная/процентная строка вида
 * "1 200,50 ₽" / "3.50%") в число для сравнения. Нечисловые остатки
 * отбрасываются, запятая трактуется как десятичный разделитель.
 */
function numericCellValue(data: RowData, column: ColumnKey): number {
  const raw = data[column];
  if (typeof raw === "number") return raw;
  const cleaned = raw
    .replace(/\s/g, "")
    .replace(/[^\d,.-]/g, "")
    .replace(",", ".");
  const n = Number.parseFloat(cleaned);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Сортирует топ-уровневые строки отчёта по выбранной колонке.
 * sort: null оставляет исходный порядок. Не мутирует вход.
 */
export function sortRows(
  rows: GeneratedRow[],
  sort: SortState | null,
): GeneratedRow[] {
  if (!sort) return rows;
  const factor = sort.direction === "asc" ? 1 : -1;
  return [...rows].sort((a, b) => {
    const av = numericCellValue(a.data, sort.column);
    const bv = numericCellValue(b.data, sort.column);
    return (av - bv) * factor;
  });
}

/**
 * Сущности, из которых выводится статистика. Передаётся из StatisticsView
 * (реальные кампании и сигналы из глобального стейта). Опционально — без него
 * отчёт строится по абстрактным меткам как раньше.
 */
export type StatsContext = {
  campaigns?: readonly {
    id: string;
    name: string;
    signalId: string;
    status: string;
  }[];
  signals?: readonly { id: string; count: number }[];
};

function isLaunched(status: string): boolean {
  return status === "active" || status === "paused" || status === "completed";
}

export function generateRows(
  filters: StatisticsFilters,
  ctx?: StatsContext,
): GeneratedRow[] {
  const period = resolvePeriod(filters.period);

  const subLabels =
    filters.subRows !== "none"
      ? labelsForKind(filters.subRows, period).slice(0, 6)
      : [];

  // Строки «Кампании» — это реальные запущенные кампании, а их цифры выводятся
  // из count связанного сигнала (sends ≤ числу найденных сигналов). Так
  // статистика перестаёт быть оторванной от сущностей: цифры сходятся сквозь
  // карточку сигнала → кампанию → отчёт.
  if (filters.rows === "campaigns" && ctx?.campaigns?.length) {
    const countById = new Map(
      (ctx.signals ?? []).map((s) => [s.id, s.count] as const),
    );
    const rows: GeneratedRow[] = ctx.campaigns
      .filter((c) => isLaunched(c.status))
      .map((c) => ({
        key: `cmp-${c.id}`,
        label: c.name,
        data: deriveCampaignFunnel(
          c.id,
          countById.get(c.signalId),
          filters.currency,
        ),
        subRows: subLabels.map((sub, j) => ({
          key: `cmp-${c.id}__${sub.key}`,
          label: sub.label,
          data: generateRowData(
            hashSeed("cmp", c.id, sub.key, j),
            filters.currency,
          ),
        })),
      }));
    return sortRows(rows.slice(0, Math.max(1, filters.rowCount)), filters.sort);
  }

  const topLabels = labelsForKind(filters.rows, period);

  const rows: GeneratedRow[] = topLabels.map((top, i) => {
    const seed = hashSeed(filters.rows, top.key, i);
    const data = generateRowData(seed, filters.currency);
    const subRows =
      subLabels.length > 0
        ? subLabels.map((sub, j) => ({
            key: `${top.key}__${sub.key}`,
            label: sub.label,
            data: generateRowData(
              hashSeed(top.key, sub.key, j),
              filters.currency,
            ),
          }))
        : [];
    return {
      key: top.key,
      label: top.label,
      caption: top.caption,
      data,
      subRows,
    };
  });

  return sortRows(rows.slice(0, Math.max(1, filters.rowCount)), filters.sort);
}

export const COLUMN_HEADERS: Record<ColumnKey, string> = {
  expenses: "Expenses",
  income: "Income",
  sends: "Sends",
  actions: "Actions",
  holds: "Holds",
  approves: "Approves",
  rejects: "Rejects",
  clicks: "Clicks",
  ar: "AR, %",
  rr: "RR, %",
};

export function cellValue(data: RowData, key: ColumnKey): string {
  const v = data[key];
  return typeof v === "number" ? v.toLocaleString("ru-RU") : v;
}
