import type { SignalType } from "@/state/app-state";

export const SCENARIO_CATEGORIES = [
  "Привлечение", "Онбординг", "Апсейл", "Удержание", "Возврат", "Реактивация",
] as const;
export type ScenarioCategory = (typeof SCENARIO_CATEGORIES)[number];

export interface Scenario {
  id: string;
  name: string;
  description: string;
  category: ScenarioCategory;
  signalType: SignalType;
  isBase: boolean;
  isCurated: boolean;
}

export const SCENARIOS: Scenario[] = [
  // 6 базовых (isBase: true)
  { id: "base-registration", name: "Регистрация", description: "Довести до конца брошенную регистрацию или оформление.", category: "Онбординг", signalType: "Регистрация", isBase: true, isCurated: false },
  { id: "base-first-deal", name: "Первая сделка", description: "Подтолкнуть нового клиента к первой покупке.", category: "Привлечение", signalType: "Первая сделка", isBase: true, isCurated: false },
  { id: "base-upsell", name: "Апсейл", description: "Поднять чек активного клиента релевантным предложением.", category: "Апсейл", signalType: "Апсейл", isBase: true, isCurated: false },
  { id: "base-retention", name: "Удержание", description: "Удержать клиента, поймав ранние признаки оттока.", category: "Удержание", signalType: "Удержание", isBase: true, isCurated: false },
  { id: "base-return", name: "Возврат", description: "Вернуть клиента в оптимальный момент повторного контакта.", category: "Возврат", signalType: "Возврат", isBase: true, isCurated: false },
  { id: "base-reactivation", name: "Реактивация", description: "Разбудить давно неактивного клиента.", category: "Реактивация", signalType: "Реактивация", isBase: true, isCurated: false },
  // 4 подобранных (isCurated: true)
  { id: "cur-abandoned-cart", name: "Брошенная корзина", description: "Вернуть тех, кто не завершил оформление заказа.", category: "Привлечение", signalType: "Регистрация", isBase: false, isCurated: true },
  { id: "cur-sleeping", name: "Спящий клиент", description: "Реактивировать клиентов без активности 90+ дней.", category: "Реактивация", signalType: "Реактивация", isBase: false, isCurated: true },
  { id: "cur-churn-signal", name: "Отток-сигнал", description: "Поймать интерес к конкурентам до того, как клиент уйдёт.", category: "Удержание", signalType: "Удержание", isBase: false, isCurated: true },
  { id: "cur-expired", name: "Истёк продукт", description: "Предложить продление к дате окончания продукта.", category: "Возврат", signalType: "Возврат", isBase: false, isCurated: true },
  // 14 каталожных
  { id: "cat-avg-check", name: "Рост чека", description: "Апсейл по росту активности и среднего чека клиента.", category: "Апсейл", signalType: "Апсейл", isBase: false, isCurated: false },
  { id: "cat-cross-sell", name: "Кросс-продажа", description: "Предложить смежный продукт под текущую потребность.", category: "Апсейл", signalType: "Апсейл", isBase: false, isCurated: false },
  { id: "cat-premium", name: "Премиум-апгрейд", description: "Перевести клиента на старший тариф или пакет.", category: "Апсейл", signalType: "Апсейл", isBase: false, isCurated: false },
  { id: "cat-incomplete-app", name: "Незавершённая заявка", description: "Дожать клиента, бросившего заявку на полпути.", category: "Онбординг", signalType: "Регистрация", isBase: false, isCurated: false },
  { id: "cat-first-login", name: "Первый вход", description: "Помочь новому клиенту пройти первый ценный сценарий.", category: "Онбординг", signalType: "Регистрация", isBase: false, isCurated: false },
  { id: "cat-cold-base", name: "Холодная база", description: "Прогреть давно собранную, но не активированную базу.", category: "Привлечение", signalType: "Первая сделка", isBase: false, isCurated: false },
  { id: "cat-seasonal", name: "Сезонный спрос", description: "Поймать клиента в пик сезонного интереса.", category: "Привлечение", signalType: "Первая сделка", isBase: false, isCurated: false },
  { id: "cat-competitor", name: "Конкурентный интерес", description: "Реакция на сравнение с конкурентами на сайте.", category: "Удержание", signalType: "Удержание", isBase: false, isCurated: false },
  { id: "cat-activity-drop", name: "Падение активности", description: "Удержать клиента при спаде вовлечённости.", category: "Удержание", signalType: "Удержание", isBase: false, isCurated: false },
  { id: "cat-subscription-end", name: "Окончание подписки", description: "Вернуть клиента к дате окончания подписки.", category: "Возврат", signalType: "Возврат", isBase: false, isCurated: false },
  { id: "cat-post-purchase", name: "Постпокупочный возврат", description: "Вернуть за повторной покупкой после первой сделки.", category: "Возврат", signalType: "Возврат", isBase: false, isCurated: false },
  { id: "cat-dormant", name: "Брошенный после оплаты", description: "Разбудить клиента, переставшего пользоваться продуктом.", category: "Реактивация", signalType: "Реактивация", isBase: false, isCurated: false },
  { id: "cat-anniversary", name: "Годовщина клиента", description: "Контакт к значимой дате отношений с клиентом.", category: "Реактивация", signalType: "Реактивация", isBase: false, isCurated: false },
  { id: "cat-referral", name: "Реферальный момент", description: "Поймать момент, когда клиент готов рекомендовать.", category: "Привлечение", signalType: "Первая сделка", isBase: false, isCurated: false },
];

export const scenarioCount = SCENARIOS.length;
export const getScenario = (id: string): Scenario | undefined => SCENARIOS.find((s) => s.id === id);
export const baseScenarios = (): Scenario[] => SCENARIOS.filter((s) => s.isBase);
export const curatedScenarios = (): Scenario[] => SCENARIOS.filter((s) => s.isCurated);
