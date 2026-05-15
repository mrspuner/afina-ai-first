import type { NodeParams } from "@/types/workflow";

export type FieldEditability = "manual" | "ai" | "readonly";

export interface NodeFieldMeta {
  /** Способ редактирования поля. */
  editability: FieldEditability;
  /** Имя поля в NodeParams — нужно инлайн-редактору для manual-полей. */
  paramKey?: string;
}

/**
 * Каталог редактируемости полей нод (задача 7 спеки).
 * Ключи: kind ноды → label строки из PARAM_RENDERERS (node-card-content.tsx).
 *
 * manual   — карандаш, поле становится текстовым инпутом (все manual-поля строковые).
 * ai       — иконка-ассистент, тег поля улетает в промпт-бар.
 * readonly — вычисляемое/системное значение, только показ.
 */
export const NODE_FIELD_EDITABILITY: Record<
  NodeParams["kind"],
  Record<string, NodeFieldMeta>
> = {
  sms: {
    "Текст": { editability: "manual", paramKey: "text" },
    "Alpha-name": { editability: "ai", paramKey: "alphaName" },
    "Время": { editability: "ai", paramKey: "scheduledAt" },
    "Ссылка": { editability: "ai", paramKey: "link" },
  },
  email: {
    "Тема": { editability: "manual", paramKey: "subject" },
    "Текст": { editability: "manual", paramKey: "body" },
    "Отправитель": { editability: "ai", paramKey: "sender" },
    "Ссылка": { editability: "ai", paramKey: "link" },
  },
  push: {
    "Заголовок": { editability: "manual", paramKey: "title" },
    "Текст": { editability: "manual", paramKey: "body" },
    "Deeplink": { editability: "ai", paramKey: "deeplink" },
  },
  ivr: {
    "Сценарий": { editability: "manual", paramKey: "scenario" },
    "Голос": { editability: "ai", paramKey: "voiceType" },
  },
  wait: {
    "Режим": { editability: "ai", paramKey: "mode" },
    "Длительность": { editability: "ai", paramKey: "durationHours" },
    "Событие": { editability: "ai", paramKey: "untilEvent" },
  },
  condition: {
    "Триггер": { editability: "ai", paramKey: "trigger" },
  },
  split: {
    "По": { editability: "ai", paramKey: "by" },
    "Ветки": { editability: "ai", paramKey: "branches" },
  },
  merge: {},
  signal: {
    "Файл": { editability: "readonly", paramKey: "fileName" },
    "Сигналов": { editability: "readonly", paramKey: "count" },
    "Сегменты": { editability: "readonly", paramKey: "segments" },
  },
  success: {
    "Цель": { editability: "manual", paramKey: "goal" },
  },
  end: {
    "Причина": { editability: "manual", paramKey: "reason" },
  },
  storefront: {
    "Офферы": { editability: "ai", paramKey: "offers" },
  },
  landing: {
    "CTA": { editability: "manual", paramKey: "cta" },
    "Оффер": { editability: "manual", paramKey: "offerTitle" },
  },
};

/** Метаданные поля по kind ноды и label строки, либо undefined. */
export function getFieldMeta(
  kind: NodeParams["kind"],
  label: string
): NodeFieldMeta | undefined {
  return NODE_FIELD_EDITABILITY[kind]?.[label];
}
