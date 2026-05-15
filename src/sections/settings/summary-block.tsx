"use client";

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
    <SettingsBlock title="Саммари о компании">
      <div className="flex flex-col gap-2">
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
