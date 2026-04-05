# Welcome Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a centered welcome screen shown on first load with a heading, chat input, and three step badges — step 1 is clickable and navigates into the campaign wizard.

**Architecture:** New `WelcomeView` component rendered in `page.tsx` when `activeNav === null` (the new default). Clicking step 1 calls `setActiveNav("Кампании")` which swaps to `CampaignWorkspace`. No new routes or state machines needed.

**Tech Stack:** Next.js App Router, React, Tailwind CSS v4, `PromptInput` from `@/components/ai-elements/prompt-input`, Lucide icons.

---

### Task 1: Create WelcomeView component

**Files:**
- Create: `src/components/welcome-view.tsx`

- [ ] **Step 1: Create the file**

```tsx
"use client";

import {
  PromptInput,
  PromptInputBody,
  PromptInputFooter,
  PromptInputProvider,
  PromptInputSubmit,
  PromptInputTextarea,
} from "@/components/ai-elements/prompt-input";
import { cn } from "@/lib/utils";
import { ChevronRight } from "lucide-react";

interface WelcomeViewProps {
  onStep1Click: () => void;
}

const steps = [
  { n: 1, label: "Получение сигнала", active: true },
  { n: 2, label: "Запуск кампании", active: false },
  { n: 3, label: "Статистика кампании", active: false },
];

export function WelcomeView({ onStep1Click }: WelcomeViewProps) {
  return (
    <div className="flex flex-1 items-center justify-center">
      <div className="flex w-full max-w-[480px] flex-col items-center gap-8">
        {/* Heading */}
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground">
            Добро пожаловать
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Три шага до первой кампании —<br />
            начните с получения сигналов
          </p>
        </div>

        {/* Chat input */}
        <div className="w-full">
          <PromptInputProvider>
            <PromptInput>
              <PromptInputBody>
                <PromptInputTextarea placeholder="Выберите шаг или задайте вопрос…" />
              </PromptInputBody>
              <PromptInputFooter>
                <PromptInputSubmit />
              </PromptInputFooter>
            </PromptInput>
          </PromptInputProvider>
        </div>

        {/* Step badges */}
        <div className="flex w-full flex-col gap-1.5">
          {steps.map(({ n, label, active }) => (
            <button
              key={n}
              type="button"
              disabled={!active}
              onClick={active ? onStep1Click : undefined}
              className={cn(
                "flex items-center gap-2.5 rounded-lg border px-3 py-2 text-left transition-colors",
                active
                  ? "cursor-pointer border-border bg-card hover:bg-accent"
                  : "cursor-not-allowed border-border/40 bg-card/40 opacity-35"
              )}
            >
              <span className="shrink-0 text-[11px] font-semibold text-muted-foreground">
                Шаг {n}
              </span>
              <div className="h-3 w-px shrink-0 bg-border" />
              <span className="text-sm font-medium text-foreground">
                {label}
              </span>
              {active && (
                <ChevronRight className="ml-auto h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify the file compiles — check for TypeScript errors in the IDE or run:**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors related to `welcome-view.tsx`.

- [ ] **Step 3: Commit**

```bash
git add src/components/welcome-view.tsx
git commit -m "feat: add WelcomeView component with step badges and chat input"
```

---

### Task 2: Wire WelcomeView into page.tsx

**Files:**
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Replace page.tsx with the updated version**

```tsx
"use client";

import { useState } from "react";
import { AppSidebar } from "@/components/app-sidebar";
import { CampaignWorkspace } from "@/components/campaign-workspace";
import { StatisticsView } from "@/components/statistics-view";
import { LaunchFlyout } from "@/components/launch-flyout";
import { WelcomeView } from "@/components/welcome-view";

export default function Home() {
  const [activeNav, setActiveNav] = useState<string | null>(null);
  const [launchOpen, setLaunchOpen] = useState(false);

  function renderMain() {
    if (activeNav === null) {
      return <WelcomeView onStep1Click={() => setActiveNav("Кампании")} />;
    }
    if (activeNav === "Статистика") {
      return <StatisticsView />;
    }
    return <CampaignWorkspace />;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <AppSidebar
        activeNav={activeNav ?? undefined}
        onNavChange={setActiveNav}
        onLaunchOpen={() => setLaunchOpen(true)}
        flyoutOpen={launchOpen}
      />
      <LaunchFlyout open={launchOpen} onClose={() => setLaunchOpen(false)} />
      {renderMain()}
    </div>
  );
}
```

Note: `activeNav ?? undefined` converts `null` to `undefined` so the sidebar prop (`activeNav?: string`) stays type-safe. When `undefined` is passed, the sidebar's internal check `activeNav === label` is always false — no item is highlighted.

- [ ] **Step 2: Verify no TypeScript errors**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: no new errors.

- [ ] **Step 3: Open http://localhost:3000 and verify:**
  - On load: welcome screen is centered, no sidebar item is active
  - Clicking «Шаг 1 · Получение сигнала» → shows CampaignWorkspace with title «Выберите тип сигнала»
  - Шаг 2 and Шаг 3 badges are dimmed and not clickable
  - Clicking any sidebar nav item (Сигналы, Кампании, Статистика) navigates normally
  - Clicking sidebar nav item then navigating back resets correctly

- [ ] **Step 4: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat: wire WelcomeView as default screen, activeNav starts null"
```
