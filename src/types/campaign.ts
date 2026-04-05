export interface StepData {
  scenario: string | null;
  interests: string[];
  triggers: string[];
  segments: string[];
  budget: number | null;
  file: File | null;
}

export const initialStepData: StepData = {
  scenario: null,
  interests: [],
  triggers: [],
  segments: [],
  budget: null,
  file: null,
};

export interface StepProps {
  data: StepData;
  onNext: (partial: Partial<StepData>) => void;
  onGoToStep?: (step: number) => void;
}
