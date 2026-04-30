"use client";

import { useState } from "react";
import { motion } from "motion/react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAppDispatch, useAppState } from "@/state/app-state-context";
import {
  isCompanyNameValid,
  isWebsiteValid,
  normalizeWebsite,
} from "@/state/survey-validation";
import type { Survey } from "@/types/survey";

import { DirectionCombobox } from "./direction-combobox";

interface SurveyFormProps {
  // Whether to render the "пропустить" button (true on first visit only).
  skippable: boolean;
  onSubmit: (survey: Survey) => void;
  onSkip?: () => void;
  // Optional copy override — different entry points may want different titles.
  title?: string;
  subtitle?: string;
}

export function SurveyForm({
  skippable,
  onSubmit,
  onSkip,
  title = "Расскажите о компании",
  subtitle = "Это поможет настроить релевантные сигналы. Займёт минуту.",
}: SurveyFormProps) {
  const { survey } = useAppState();
  const dispatch = useAppDispatch();

  const [companyName, setCompanyName] = useState(survey.companyName);
  const [website, setWebsite] = useState(survey.companyWebsite);
  const [directionId, setDirectionId] = useState(survey.directionId);
  const [showErrors, setShowErrors] = useState(false);

  const nameOk = isCompanyNameValid(companyName);
  const websiteOk = isWebsiteValid(website);
  const directionOk = directionId !== null;
  const allOk = nameOk && websiteOk && directionOk;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!allOk) {
      setShowErrors(true);
      return;
    }
    const filled: Survey = {
      companyName: companyName.trim(),
      companyWebsite: normalizeWebsite(website),
      directionId,
    };
    // Persist the partial as we go so navigation away keeps draft state.
    dispatch({ type: "survey_updated", patch: filled });
    onSubmit(filled);
  }

  return (
    <motion.form
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      onSubmit={handleSubmit}
      className="w-full max-w-2xl"
      noValidate
    >
      <header className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          {title}
        </h1>
        <p className="mt-1.5 max-w-md text-sm text-muted-foreground">
          {subtitle}
        </p>
      </header>
      <div className="grid grid-cols-1 gap-x-6 gap-y-4 md:grid-cols-2">
        <Field
          id="survey-company-name"
          label="Название компании"
          error={showErrors && !nameOk ? "Введите название" : undefined}
        >
          <Input
            id="survey-company-name"
            type="text"
            autoComplete="organization"
            placeholder="Например, Acme"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            aria-invalid={showErrors && !nameOk ? true : undefined}
          />
        </Field>
        <Field
          id="survey-website"
          label="Сайт компании"
          hint="По нему мы предзаполним интересы"
          error={
            showErrors && !websiteOk
              ? "Введите адрес вида example.com"
              : undefined
          }
        >
          <Input
            id="survey-website"
            type="url"
            inputMode="url"
            autoComplete="url"
            placeholder="example.com"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            aria-invalid={showErrors && !websiteOk ? true : undefined}
          />
        </Field>
        <div className="md:col-span-2">
          <Field
            id="survey-direction"
            label="Чем занимается компания"
            error={
              showErrors && !directionOk
                ? "Выберите направление"
                : undefined
            }
          >
            <DirectionCombobox
              id="survey-direction"
              value={directionId}
              onChange={(next) => setDirectionId(next)}
            />
          </Field>
        </div>
      </div>
      <div className="mt-8 flex items-center justify-end gap-2">
        {skippable && onSkip ? (
          <Button type="button" variant="ghost" onClick={onSkip}>
            Пропустить
          </Button>
        ) : null}
        <Button type="submit" variant="default" size="lg">
          Продолжить
        </Button>
      </div>
    </motion.form>
  );
}

function Field({
  id,
  label,
  hint,
  error,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-foreground">
        {label}
      </label>
      {children}
      {error ? (
        <p className="text-xs text-destructive">{error}</p>
      ) : hint ? (
        <p className="text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}
