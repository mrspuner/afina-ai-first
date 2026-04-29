import type { Direction } from "@/types/directions";

export const DIRECTIONS: Direction[] = [
  { id: "banking", label: "Банки и кредитование" },
  { id: "mfo", label: "МФО и микрозаймы" },
  { id: "insurance", label: "Страхование" },
  { id: "investments", label: "Инвестиции и брокеры" },
  { id: "auto-sales", label: "Авто: продажа" },
  { id: "auto-service-aftermarket", label: "Авто: сервис и аксессуары" },
  { id: "telecom-isp", label: "Телеком и интернет-провайдеры" },
  { id: "real-estate-residential", label: "Недвижимость: жилая" },
  { id: "real-estate-commercial", label: "Недвижимость: коммерческая" },
  { id: "marketplaces", label: "Маркетплейсы и крупный e-commerce" },
  { id: "electronics-retail", label: "Электроника и техника" },
  { id: "fashion-retail", label: "Одежда, обувь, аксессуары" },
  { id: "home-diy-retail", label: "Товары для дома и DIY" },
  { id: "edu-academic", label: "Образование: вузы и школы" },
  { id: "edu-courses", label: "Образование: курсы и EdTech" },
  { id: "medicine", label: "Медицина и клиники" },
  { id: "pharma", label: "Аптеки и фарма" },
  { id: "fitness", label: "Фитнес и спорт" },
  { id: "travel", label: "Туризм и путешествия" },
  { id: "hr", label: "HR и рекрутинг" },
  { id: "b2b-saas-software", label: "B2B SaaS и софт" },
  { id: "food-delivery", label: "Доставка еды и продукты" },
];

export function getDirectionById(id: string): Direction | undefined {
  return DIRECTIONS.find((d) => d.id === id);
}
