"use client";

import { RefreshCw } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { SettingsBlock, SettingsField } from "./settings-field";
import { useAppState, useAppDispatch } from "@/state/app-state-context";

export function SiteBlock() {
  const { accountSettings } = useAppState();
  const dispatch = useAppDispatch();

  return (
    <SettingsBlock
      title="Сайт компании"
      description="Корневой источник данных — по нему AI предзаполняет интересы и саммари."
    >
      <SettingsField
        id="settings-website"
        label="Адрес сайта"
        hint="Смена адреса не пересобирает интересы и саммари автоматически."
      >
        <Input
          id="settings-website"
          type="url"
          inputMode="url"
          autoComplete="url"
          placeholder="example.com"
          value={accountSettings.companyWebsite}
          onChange={(e) =>
            dispatch({
              type: "settings_updated",
              patch: { companyWebsite: e.target.value },
            })
          }
        />
      </SettingsField>
      <div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => console.log("rebuild interests + summary")}
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Пересобрать интересы и саммари с нового сайта
        </Button>
      </div>
    </SettingsBlock>
  );
}
