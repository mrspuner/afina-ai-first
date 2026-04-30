export type SignalStatus =
  | "draft"
  | "awaiting_payment"
  | "processing"
  | "ready"
  | "expired"
  | "error";

export const SIGNAL_STATUS_LABEL: Record<SignalStatus, string> = {
  draft: "Черновик",
  awaiting_payment: "Ожидает оплаты",
  processing: "В обработке",
  ready: "Готов",
  expired: "Устарел",
  error: "Ошибка",
};

export const SIGNAL_STATUS_TONE: Record<SignalStatus, "neutral" | "warning" | "info" | "success" | "muted" | "danger"> = {
  draft: "neutral",
  awaiting_payment: "warning",
  processing: "info",
  ready: "success",
  expired: "muted",
  error: "danger",
};
