"use client";

import { Textarea } from "@/components/ui/textarea";
import { SettingsBlock, SettingsField } from "./settings-field";
import { useAppState, useAppDispatch } from "@/state/app-state-context";

export function VoiceBlock() {
  const { accountSettings } = useAppState();
  const dispatch = useAppDispatch();

  return (
    <SettingsBlock
      title="Тон голоса бренда"
      description="Питает AI-генерацию текстов коммуникаций в кампаниях."
    >
      <SettingsField
        id="settings-tone"
        label="Тон"
        hint="Как звучит бренд — стиль, обращение, длина фраз."
      >
        <Textarea
          id="settings-tone"
          rows={3}
          placeholder="Уверенный, современный, без канцелярита…"
          value={accountSettings.brandTone}
          onChange={(e) =>
            dispatch({
              type: "settings_updated",
              patch: { brandTone: e.target.value },
            })
          }
        />
      </SettingsField>
      <SettingsField
        id="settings-messages"
        label="Ключевые сообщения"
        hint="Тезисы, которые бренд доносит до аудитории."
      >
        <Textarea
          id="settings-messages"
          rows={3}
          placeholder="Решение за 2 минуты. Без скрытых комиссий…"
          value={accountSettings.brandMessages}
          onChange={(e) =>
            dispatch({
              type: "settings_updated",
              patch: { brandMessages: e.target.value },
            })
          }
        />
      </SettingsField>
    </SettingsBlock>
  );
}
