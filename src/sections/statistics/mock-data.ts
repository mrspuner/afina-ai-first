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
  StatisticsFilters,
} from "./statistics-state";

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

const CURRENCY_SYMBOL: Record<Currency, string> = {
  usd: "$",
  eur: "€",
  rub: "₽",
};

const CURRENCY_RATE: Record<Currency, number> = {
  usd: 1,
  eur: 0.92,
  rub: 93,
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

function seededRand(seed: number): () => number {
  let s = seed || 1;
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = (h * 16777619) >>> 0;
  }
  return h >>> 0;
}

function formatMoney(value: number, currency: Currency): string {
  const fmt = new Intl.NumberFormat("ru-RU", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
  return `${fmt} ${CURRENCY_SYMBOL[currency]}`;
}

function generateRowData(seed: number, currency: Currency): RowData {
  const rand = seededRand(seed);
  const sends = 2500 + Math.floor(rand() * 35000);
  const clicks = Math.floor(sends * (0.35 + rand() * 0.35));
  const actions = Math.floor(sends * (0.04 + rand() * 0.08));
  const holds = Math.floor(actions * (0.2 + rand() * 0.25));
  const approves = Math.floor(actions * (0.45 + rand() * 0.25));
  const rejects = Math.max(0, actions - holds - approves);
  const expensesUsd = 300 + rand() * 5000;
  const incomeUsd = expensesUsd * (4 + rand() * 18);
  const rate = CURRENCY_RATE[currency];
  const ar = (approves / Math.max(sends, 1)) * 100;
  const rr = (rejects / Math.max(sends, 1)) * 100;
  return {
    expenses: formatMoney(expensesUsd * rate, currency),
    income: formatMoney(incomeUsd * rate, currency),
    sends,
    clicks,
    actions,
    holds,
    approves,
    rejects,
    ar: `${ar.toFixed(2)}%`,
    rr: `${rr.toFixed(2)}%`,
  };
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

export function generateRows(filters: StatisticsFilters): GeneratedRow[] {
  const period = resolvePeriod(filters.period);
  const topLabels = labelsForKind(filters.rows, period);

  const subLabels =
    filters.subRows !== "none"
      ? labelsForKind(filters.subRows, period).slice(0, 6)
      : [];

  const rows: GeneratedRow[] = topLabels.map((top, i) => {
    const seed = hashString(`${filters.rows}:${top.key}:${i}`);
    const data = generateRowData(seed, filters.currency);
    const subRows =
      subLabels.length > 0
        ? subLabels.map((sub, j) => ({
            key: `${top.key}__${sub.key}`,
            label: sub.label,
            data: generateRowData(
              hashString(`${top.key}:${sub.key}:${j}`),
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

  return rows.slice(0, Math.max(1, filters.rowCount));
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
