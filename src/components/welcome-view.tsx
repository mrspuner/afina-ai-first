"use client";

interface WelcomeViewProps {
  onStep1Click: () => void;
}

export function WelcomeView({ onStep1Click: _ }: WelcomeViewProps) {
  return (
    <div className="flex flex-1 items-center justify-center pb-56">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-foreground">Добро пожаловать</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Три шага до первой кампании —<br />
          начните с получения сигналов
        </p>
      </div>
    </div>
  );
}
