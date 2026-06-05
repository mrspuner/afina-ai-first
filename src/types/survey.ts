import type { DirectionId } from "./directions";

export interface Survey {
  companyName: string;
  companyWebsite: string;
  directionId: DirectionId | null;
}

export type SurveyStatus = "not_started" | "completed";

export const EMPTY_SURVEY: Survey = {
  companyName: "",
  companyWebsite: "",
  directionId: null,
};

/**
 * Pre-filled demo survey, mirroring DEMO_ACCOUNT_SETTINGS. Applied when a
 * non-empty dev preset is selected so the survey gate is satisfied without
 * hand-filling the form.
 */
export const DEMO_SURVEY: Survey = {
  companyName: "Альфа-Банк",
  companyWebsite: "alfabank.ru",
  directionId: "banking",
};
