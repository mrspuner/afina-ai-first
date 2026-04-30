import type { DirectionId, InterestId } from "@/types/directions";

/**
 * Карта 22 направлений анкеты → релевантные интересы из библиотеки
 * (см. docs/directions-interests-mapping.md).
 *
 * Используется для предзаполнения интересов в визарде создания первого сигнала.
 * Модель "намерение клиента": направление = чем занимается компания, интересы =
 * что ищут её потенциальные клиенты в момент готовности к покупке.
 *
 * Интерес "Туризм и путешествия" из спеки маппинга в прототипе временно
 * не включён — у него ещё нет триггеров в triggers-by-vertical.ts.
 */
export const INTERESTS_BY_DIRECTION: Record<DirectionId, InterestId[]> = {
  banking: [
    "credit",
    "mortgage",
    "investments",
    "buy-apartment",
    "country-real-estate",
    "buy-new-car",
    "buy-used-car",
    "higher-education",
    "online-courses",
    "medical-services",
  ],
  mfo: [
    "credit",
    "bnpl",
    "electronics",
    "fashion",
    "medical-services",
    "pharma",
  ],
  insurance: [
    "insurance",
    "osago-kasko",
    "buy-new-car",
    "buy-used-car",
    "buy-apartment",
    "country-real-estate",
    "medical-services",
  ],
  investments: [
    "investments",
    "online-courses",
  ],
  "auto-sales": [
    "buy-new-car",
    "buy-used-car",
    "auto-credit",
    "credit",
    "osago-kasko",
    "auto-service",
  ],
  "auto-service-aftermarket": [
    "auto-service",
    "buy-used-car",
    "buy-new-car",
  ],
  "telecom-isp": [
    "mobile-operator",
    "home-internet",
    "mobile-devices",
    "buy-apartment",
    "rent-apartment",
    "country-real-estate",
  ],
  "real-estate-residential": [
    "buy-apartment",
    "rent-apartment",
    "country-real-estate",
    "mortgage",
    "credit",
  ],
  "real-estate-commercial": [
    "commercial-real-estate",
    "saas",
    "procurement",
  ],
  marketplaces: [
    "electronics",
    "fashion",
    "home-goods",
    "food-delivery",
    "bnpl",
  ],
  "electronics-retail": [
    "electronics",
    "mobile-devices",
    "buy-apartment",
    "rent-apartment",
    "bnpl",
    "credit",
  ],
  "fashion-retail": [
    "fashion",
    "bnpl",
    "higher-education",
  ],
  "home-diy-retail": [
    "home-goods",
    "buy-apartment",
    "rent-apartment",
    "country-real-estate",
    "credit",
  ],
  "edu-academic": [
    "higher-education",
    "child-education",
    "credit",
  ],
  "edu-courses": [
    "online-courses",
    "higher-education",
    "hr",
    "credit",
  ],
  medicine: [
    "medical-services",
    "pharma",
    "fitness",
    "insurance",
  ],
  pharma: [
    "pharma",
    "medical-services",
    "fitness",
  ],
  fitness: [
    "fitness",
    "medical-services",
    "fashion",
  ],
  travel: [
    "insurance",
    "credit",
    "bnpl",
  ],
  hr: [
    "hr",
    "online-courses",
    "higher-education",
  ],
  "b2b-saas-software": [
    "saas",
    "business-finance",
    "hr",
    "procurement",
  ],
  "food-delivery": [
    "food-delivery",
    "buy-apartment",
    "rent-apartment",
  ],
};

export function getInterestsForDirection(directionId: string): InterestId[] {
  return INTERESTS_BY_DIRECTION[directionId] ?? [];
}
