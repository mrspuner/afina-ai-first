"use client";

import Image from "next/image";
import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { SettingsBlock } from "./settings-field";
import { useAppState, useAppDispatch } from "@/state/app-state-context";

export function SummaryBlock() {
  const { accountSettings } = useAppState();
  const dispatch = useAppDispatch();

  const [draft, setDraft] = useState(accountSettings.aiSummary);
  const dirty = draft !== accountSettings.aiSummary;

  function handleSave() {
    dispatch({ type: "settings_updated", patch: { aiSummary: draft } });
  }

  return (
    <SettingsBlock
      title="AI-саммари о компании"
      description="Резюме, которое AI составил о вашей компании. Отредактируйте текст и сохраните."
    >
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-1.5">
          <Image
            src="/mascot-icon.svg"
            alt=""
            width={14}
            height={14}
            aria-hidden
          />
          <span className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
            Сгенерировано AI
          </span>
        </div>
        <Textarea
          id="settings-summary"
          rows={5}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Опишите компанию своими словами"
        />
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="default"
            size="sm"
            disabled={!dirty}
            onClick={handleSave}
          >
            Сохранить
          </Button>
          {dirty ? (
            <span className="text-xs text-muted-foreground">
              Есть несохранённые изменения
            </span>
          ) : null}
        </div>
      </div>
    </SettingsBlock>
  );
}
