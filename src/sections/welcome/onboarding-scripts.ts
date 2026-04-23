export type OnboardingHint = {
  id: string;
  label: string;
};

export const HINTS: OnboardingHint[] = [
  { id: "placeholder-1", label: "Как начать работу" },
  { id: "placeholder-2", label: "Что такое сигнал" },
  { id: "placeholder-3", label: "Как запустить кампанию" },
];

export function scriptReply(_userText: string): string {
  return "Ответ появится здесь — скриптованный путь на замену LLM (placeholder).";
}

export const CAPTION = "Вот что вы можете сделать в Афине (placeholder):";
