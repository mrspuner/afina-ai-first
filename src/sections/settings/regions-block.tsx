"use client";

import { Textarea } from "@/components/ui/textarea";
import { SettingsBlock, SettingsField } from "./settings-field";
import { useAppState, useAppDispatch } from "@/state/app-state-context";

export function RegionsBlock() {
  const { accountSettings } = useAppState();
  const dispatch = useAppDispatch();

  return (
    <SettingsBlock title="Регионы и география">
      <SettingsField
        id="settings-regions"
        label="Регионы"
        hint="Перечислите города или регионы через запятую."
      >
        <Textarea
          id="settings-regions"
          rows={2}
          placeholder="Москва, Санкт-Петербург, города-миллионники РФ"
          value={accountSettings.regions}
          onChange={(e) =>
            dispatch({
              type: "settings_updated",
              patch: { regions: e.target.value },
            })
          }
        />
      </SettingsField>
    </SettingsBlock>
  );
}
