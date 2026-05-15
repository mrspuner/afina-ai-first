"use client";

import { Input } from "@/components/ui/input";
import { DirectionCombobox } from "@/sections/survey/direction-combobox";
import { SettingsBlock, SettingsField } from "./settings-field";
import { useAppState, useAppDispatch } from "@/state/app-state-context";

export function BusinessBlock() {
  const { accountSettings } = useAppState();
  const dispatch = useAppDispatch();

  return (
    <SettingsBlock
      title="Название и направление бизнеса"
      description="Задаёт вертикаль и базовый набор интересов."
    >
      <SettingsField id="settings-name" label="Название компании">
        <Input
          id="settings-name"
          type="text"
          placeholder="Например, Альфа-Банк"
          value={accountSettings.companyName}
          onChange={(e) =>
            dispatch({
              type: "settings_updated",
              patch: { companyName: e.target.value },
            })
          }
        />
      </SettingsField>
      <SettingsField id="settings-direction" label="Направление">
        <DirectionCombobox
          id="settings-direction"
          value={accountSettings.directionId}
          onChange={(next) =>
            dispatch({
              type: "settings_updated",
              patch: { directionId: next },
            })
          }
        />
      </SettingsField>
    </SettingsBlock>
  );
}
