import {
  DEFAULT_FILTERS,
  type StatisticsFilters,
} from "./statistics-state";

export type ReportTemplate = {
  id: string;
  name: string;
  kind: "builtin" | "user";
  author: string;
  createdAt: string;
  updatedAt: string;
  filters: StatisticsFilters;
};

export const BUILTIN_TEMPLATES: ReportTemplate[] = [
  {
    id: "summary-by-period",
    name: "Сводный за период",
    kind: "builtin",
    author: "afina",
    createdAt: "21.02.2024",
    updatedAt: "22.02.2024",
    filters: DEFAULT_FILTERS,
  },
  {
    id: "by-campaign",
    name: "По кампаниям",
    kind: "builtin",
    author: "afina",
    createdAt: "21.02.2024",
    updatedAt: "22.02.2024",
    filters: {
      ...DEFAULT_FILTERS,
      rows: "campaigns",
      subRows: "days",
    },
  },
  {
    id: "by-channel",
    name: "По каналам",
    kind: "builtin",
    author: "afina",
    createdAt: "21.02.2024",
    updatedAt: "22.02.2024",
    filters: {
      ...DEFAULT_FILTERS,
      rows: "channels",
      subRows: "campaigns",
    },
  },
];
