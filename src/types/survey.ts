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
