import type { Vertical, Interest, Trigger } from "@/types/directions";

export const VERTICALS: Vertical[] = [
  {
    id: "finance",
    label: "Финансы и кредиты",
    interests: [
      {
        id: "credit",
        label: "Кредитование",
        verticalId: "finance",
        triggers: [
          { id: "credit-banks", label: "Посещение сайтов банков с предложениями кредитов" },
          { id: "credit-aggregators", label: "Посещение агрегаторов кредитов и сравнения ставок" },
          { id: "credit-mfo", label: "Посещение сайтов МФО" },
          { id: "credit-brokers", label: "Посещение сайтов кредитных брокеров" },
        ],
      },
      {
        id: "bnpl",
        label: "Рассрочка и BNPL",
        verticalId: "finance",
        triggers: [
          { id: "bnpl-services", label: "Посещение сайтов сервисов рассрочки" },
          { id: "bnpl-ecommerce", label: "Использование BNPL в e-commerce" },
        ],
      },
      {
        id: "mortgage",
        label: "Ипотека",
        verticalId: "finance",
        triggers: [
          { id: "mortgage-bank-programs", label: "Посещение сайтов ипотечных программ банков" },
          { id: "mortgage-calculators", label: "Посещение ипотечных калькуляторов и агрегаторов" },
          { id: "mortgage-developers", label: "Посещение сайтов застройщиков и риелторов" },
        ],
      },
      {
        id: "investments",
        label: "Инвестиции и накопления",
        verticalId: "finance",
        triggers: [
          { id: "investments-brokers", label: "Посещение сайтов брокеров и инвестплатформ" },
          { id: "investments-education", label: "Посещение сайтов с обучением инвестированию" },
          { id: "investments-deposits", label: "Посещение сайтов банков в разделах вкладов и накоплений" },
        ],
      },
      {
        id: "insurance",
        label: "Страхование",
        verticalId: "finance",
        triggers: [
          { id: "insurance-companies", label: "Посещение сайтов страховых компаний" },
          { id: "insurance-aggregators", label: "Посещение агрегаторов страховых продуктов" },
        ],
      },
    ],
  },
  {
    id: "auto",
    label: "Авто",
    interests: [
      {
        id: "buy-new-car",
        label: "Покупка нового авто",
        verticalId: "auto",
        triggers: [
          { id: "new-car-dealers", label: "Посещение сайтов автодилеров" },
          { id: "new-car-manufacturers", label: "Посещение официальных сайтов автопроизводителей" },
          { id: "new-car-marketplaces", label: "Посещение крупных автомаркетплейсов с фильтром на новые" },
        ],
      },
      {
        id: "buy-used-car",
        label: "Покупка б/у авто",
        verticalId: "auto",
        triggers: [
          { id: "used-car-listings", label: "Посещение сайтов с объявлениями о продаже авто" },
          { id: "used-car-history", label: "Посещение сайтов проверки истории авто" },
          { id: "used-car-tradein", label: "Посещение сайтов автосалонов с trade-in" },
        ],
      },
      {
        id: "auto-credit",
        label: "Автокредит и автолизинг",
        verticalId: "auto",
        triggers: [
          { id: "auto-credit-banks", label: "Посещение сайтов банков в разделах автокредитования" },
          { id: "auto-credit-leasing", label: "Посещение сайтов лизинговых компаний" },
        ],
      },
      {
        id: "auto-service",
        label: "Сервис и обслуживание",
        verticalId: "auto",
        triggers: [
          { id: "auto-service-shops", label: "Посещение сайтов автосервисов и СТО" },
          { id: "auto-service-parts", label: "Посещение сайтов запчастей и магазинов автотоваров" },
        ],
      },
      {
        id: "osago-kasko",
        label: "ОСАГО и КАСКО",
        verticalId: "auto",
        triggers: [
          { id: "osago-insurers", label: "Посещение сайтов страховых с автостраховыми продуктами" },
          { id: "osago-calculators", label: "Посещение калькуляторов и агрегаторов автостраховки" },
        ],
      },
    ],
  },
  {
    id: "telecom",
    label: "Телеком и интернет",
    interests: [
      {
        id: "mobile-operator",
        label: "Смена сотового оператора",
        verticalId: "telecom",
        triggers: [
          { id: "mobile-competitors", label: "Посещение сайтов конкурирующих операторов" },
          { id: "mobile-tariff-compare", label: "Посещение сайтов с тарифами и сравнением операторов" },
        ],
      },
      {
        id: "home-internet",
        label: "Домашний интернет и ТВ",
        verticalId: "telecom",
        triggers: [
          { id: "home-isp", label: "Посещение сайтов провайдеров домашнего интернета" },
          { id: "home-isp-reviews", label: "Посещение сайтов с обзорами тарифов и провайдеров" },
        ],
      },
      {
        id: "mobile-devices",
        label: "Мобильные устройства",
        verticalId: "telecom",
        triggers: [
          { id: "phone-manufacturers", label: "Посещение сайтов производителей смартфонов" },
          { id: "phone-electronics-shops", label: "Посещение сайтов магазинов электроники в разделах мобильной техники" },
        ],
      },
    ],
  },
  {
    id: "real-estate",
    label: "Недвижимость",
    interests: [
      {
        id: "buy-apartment",
        label: "Покупка квартиры",
        verticalId: "real-estate",
        triggers: [
          { id: "apartment-listings", label: "Посещение сайтов с объявлениями о продаже квартир" },
          { id: "apartment-developers", label: "Посещение сайтов застройщиков" },
          { id: "apartment-agencies", label: "Посещение сайтов агентств недвижимости" },
        ],
      },
      {
        id: "rent-apartment",
        label: "Аренда жилья",
        verticalId: "real-estate",
        triggers: [
          { id: "rent-listings", label: "Посещение сайтов аренды жилья" },
          { id: "rent-realtors", label: "Посещение сайтов риелторов с разделами аренды" },
        ],
      },
      {
        id: "country-real-estate",
        label: "Загородная недвижимость",
        verticalId: "real-estate",
        triggers: [
          { id: "country-listings", label: "Посещение сайтов с объявлениями о продаже домов и участков" },
          { id: "country-villages", label: "Посещение сайтов коттеджных посёлков" },
        ],
      },
      {
        id: "commercial-real-estate",
        label: "Коммерческая недвижимость",
        verticalId: "real-estate",
        triggers: [
          { id: "commercial-listings", label: "Посещение сайтов с коммерческой арендой и продажей" },
          { id: "commercial-brokers", label: "Посещение сайтов брокеров коммерческой недвижимости" },
        ],
      },
    ],
  },
  {
    id: "retail",
    label: "Ретейл и e-commerce",
    interests: [
      {
        id: "electronics",
        label: "Покупка электроники",
        verticalId: "retail",
        triggers: [
          { id: "electronics-marketplaces", label: "Посещение крупных маркетплейсов в разделах электроники" },
          { id: "electronics-brand-stores", label: "Посещение сайтов производителей и брендовых магазинов" },
        ],
      },
      {
        id: "fashion",
        label: "Покупка одежды и обуви",
        verticalId: "retail",
        triggers: [
          { id: "fashion-marketplaces", label: "Посещение сайтов фэшн-маркетплейсов" },
          { id: "fashion-brand-stores", label: "Посещение сайтов брендовых магазинов одежды" },
        ],
      },
      {
        id: "home-goods",
        label: "Товары для дома и ремонт",
        verticalId: "retail",
        triggers: [
          { id: "home-goods-furniture", label: "Посещение сайтов мебели и DIY" },
          { id: "home-goods-construction", label: "Посещение сайтов сантехники и стройматериалов" },
        ],
      },
      {
        id: "food-delivery",
        label: "Продукты и доставка еды",
        verticalId: "retail",
        triggers: [
          { id: "food-delivery-services", label: "Посещение сайтов сервисов доставки еды" },
          { id: "food-grocery", label: "Посещение сайтов продуктовых ретейлеров" },
        ],
      },
    ],
  },
  {
    id: "education",
    label: "Образование",
    interests: [
      {
        id: "higher-education",
        label: "Высшее образование",
        verticalId: "education",
        triggers: [
          { id: "higher-edu-universities", label: "Посещение сайтов вузов" },
          { id: "higher-edu-aggregators", label: "Посещение агрегаторов вузов и программ" },
        ],
      },
      {
        id: "online-courses",
        label: "Курсы и онлайн-обучение",
        verticalId: "education",
        triggers: [
          { id: "courses-edtech", label: "Посещение сайтов EdTech-платформ" },
          { id: "courses-professional", label: "Посещение сайтов профессиональных курсов" },
        ],
      },
      {
        id: "child-education",
        label: "Детское образование",
        verticalId: "education",
        triggers: [
          { id: "child-edu-centers", label: "Посещение сайтов детских развивающих центров" },
          { id: "child-edu-tutors", label: "Посещение сайтов школ и репетиторов" },
        ],
      },
    ],
  },
  {
    id: "health",
    label: "Медицина и здоровье",
    interests: [
      {
        id: "medical-services",
        label: "Медицинские услуги",
        verticalId: "health",
        triggers: [
          { id: "medical-private-clinics", label: "Посещение сайтов частных клиник" },
          { id: "medical-diagnostics", label: "Посещение сайтов диагностических центров и лабораторий" },
        ],
      },
      {
        id: "pharma",
        label: "Аптеки и фарма",
        verticalId: "health",
        triggers: [
          { id: "pharma-chains", label: "Посещение сайтов аптечных сетей" },
          { id: "pharma-online", label: "Посещение сайтов с покупкой лекарств онлайн" },
        ],
      },
      {
        id: "fitness",
        label: "Фитнес и спорт",
        verticalId: "health",
        triggers: [
          { id: "fitness-clubs", label: "Посещение сайтов фитнес-клубов" },
          { id: "fitness-equipment", label: "Посещение сайтов спортивных товаров" },
        ],
      },
    ],
  },
  {
    id: "b2b",
    label: "B2B и корпоративный сегмент",
    interests: [
      {
        id: "saas",
        label: "Корпоративный софт и SaaS",
        verticalId: "b2b",
        triggers: [
          { id: "saas-platforms", label: "Посещение сайтов SaaS-платформ" },
          { id: "saas-crm", label: "Посещение сайтов CRM и систем автоматизации" },
        ],
      },
      {
        id: "business-finance",
        label: "Бухгалтерия и финансы для бизнеса",
        verticalId: "b2b",
        triggers: [
          { id: "biz-accounting", label: "Посещение сайтов сервисов бухучёта" },
          { id: "biz-banks", label: "Посещение сайтов банков в разделах для бизнеса" },
        ],
      },
      {
        id: "hr",
        label: "HR и подбор персонала",
        verticalId: "b2b",
        triggers: [
          { id: "hr-job-boards", label: "Посещение сайтов джоб-сайтов и HR-платформ" },
          { id: "hr-candidate-search", label: "Посещение сайтов с поиском соискателей" },
        ],
      },
      {
        id: "procurement",
        label: "Закупки и поставщики",
        verticalId: "b2b",
        triggers: [
          { id: "procurement-marketplaces", label: "Посещение b2b-маркетплейсов" },
          { id: "procurement-suppliers", label: "Посещение сайтов отраслевых поставщиков" },
        ],
      },
    ],
  },
];

const INTEREST_INDEX: Map<string, Interest> = new Map(
  VERTICALS.flatMap((v) => v.interests.map((i) => [i.id, i] as const))
);

const TRIGGER_INDEX: Map<string, { trigger: Trigger; interest: Interest }> = new Map(
  VERTICALS.flatMap((v) =>
    v.interests.flatMap((i) =>
      i.triggers.map((t) => [t.id, { trigger: t, interest: i }] as const)
    )
  )
);

export function getInterestById(id: string): Interest | undefined {
  return INTEREST_INDEX.get(id);
}

export function getTriggerById(id: string): Trigger | undefined {
  return TRIGGER_INDEX.get(id)?.trigger;
}

export function getInterestForTrigger(triggerId: string): Interest | undefined {
  return TRIGGER_INDEX.get(triggerId)?.interest;
}

export const INTERESTS: Interest[] = VERTICALS.flatMap((v) => v.interests);
