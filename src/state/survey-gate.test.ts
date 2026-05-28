import { describe, expect, it } from "vitest";
import { shouldShowSurveyGate } from "@/state/survey-gate";

describe("shouldShowSurveyGate", () => {
  it("shows the site screen on a fresh flow when survey not completed", () => {
    expect(
      shouldShowSurveyGate({ surveyStatus: "not_started", isResuming: false })
    ).toBe(true);
  });

  it("skips the site screen once the survey is completed (once per session)", () => {
    expect(
      shouldShowSurveyGate({ surveyStatus: "completed", isResuming: false })
    ).toBe(false);
  });

  it("skips the site screen when resuming an existing signal", () => {
    expect(
      shouldShowSurveyGate({ surveyStatus: "not_started", isResuming: true })
    ).toBe(false);
  });
});
