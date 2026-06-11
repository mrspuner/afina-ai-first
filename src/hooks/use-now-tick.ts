import { useState, useEffect } from "react";

/**
 * Возвращает текущий момент времени, обновляемый каждые `intervalMs` мс.
 * Используется для подачи внутридневной доли в куб фактов статистики:
 * тик инвалидирует кэш куба и числа «сегодня» монотонно растут в течение
 * сессии. 15 с — компромисс между «живостью» демо и частотой пересчёта куба.
 */
export function useNowTick(intervalMs = 15_000): Date {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);

  return now;
}
