import type { ParsedTriggerCommand } from "./trigger-edit-parser";
import { pluralRu } from "./plural-ru";

const DOMAIN_FORMS: [string, string, string] = ["домен", "домена", "доменов"];

export function mockReplyFor(
  parsed: Exclude<ParsedTriggerCommand, { kind: "fallback" }>
): string {
  if (parsed.kind === "clear-added") return "Очистил список добавленных доменов.";
  if (parsed.kind === "clear-excluded") return "Очистил список исключённых.";

  const addN = parsed.add.length;
  const excN = parsed.exclude.length;

  if (addN > 0 && excN === 0) {
    return `Добавил ${addN} ${pluralRu(addN, DOMAIN_FORMS)} в триггер.`;
  }
  if (addN === 0 && excN > 0) {
    return `Исключил ${excN} ${pluralRu(excN, DOMAIN_FORMS)}.`;
  }
  return `Готово, добавил ${addN} ${pluralRu(addN, DOMAIN_FORMS)} и исключил ${excN} ${pluralRu(excN, DOMAIN_FORMS)}.`;
}

export function mockReplyForFreeText(): string {
  return "Принял, посмотрю и сообщу. (Это прототип — реального ответа не будет.)";
}
