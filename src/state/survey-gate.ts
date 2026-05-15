import type { SurveyStatus } from "@/types/survey";

/**
 * Решение о показе экрана сайта перед шагом «Тип сигнала».
 * Сайт спрашивается один раз за сессию: после `survey_completed` гейт
 * закрыт. Resume существующего сигнала пропускает экран сайта — визард
 * открывается сразу на сохранённом шаге.
 */
export function shouldShowSurveyGate(input: {
  surveyStatus: SurveyStatus;
  isResuming: boolean;
}): boolean {
  if (input.isResuming) return false;
  return input.surveyStatus !== "completed";
}
