"use client";

import { Input } from "@/components/ui/input";
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
      <SettingsField id="settings-website">
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
    </SettingsBlock>
  );
}
