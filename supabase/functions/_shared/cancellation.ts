// Политика штрафов за отмену смены.
//
// Зеркало этих правил живёт на фронте в src/lib/cancellation.ts — там оно нужно,
// чтобы показать пользователю размер штрафа ДО подтверждения отмены. Значения
// должны совпадать; источником истины считаем этот файл, потому что штраф
// начисляет сервер.

export type CancelRole = "freelancer" | "owner";

export interface Penalty {
  penalty: number;
  reason: string;
}

/** Фрилансер подводит сильнее: смену срочно некем закрыть. */
const FREELANCER_TIERS: Array<{ minHours: number; penalty: number; reason: string }> = [
  { minHours: 24, penalty: 0, reason: "Отмена за 24+ часов" },
  { minHours: 12, penalty: -0.5, reason: "Отмена за 12-24 часа" },
  { minHours: 2, penalty: -1.0, reason: "Отмена за 2-12 часов" },
  { minHours: -Infinity, penalty: -2.0, reason: "Отмена менее чем за 2 часа" },
];

const OWNER_TIERS: Array<{ minHours: number; penalty: number; reason: string }> = [
  { minHours: 12, penalty: 0, reason: "Отмена за 12+ часов" },
  { minHours: -Infinity, penalty: -0.5, reason: "Отмена менее чем за 12 часов" },
];

export function penaltyFor(role: CancelRole, hoursUntil: number): Penalty {
  const tiers = role === "freelancer" ? FREELANCER_TIERS : OWNER_TIERS;
  const tier = tiers.find((t) => hoursUntil >= t.minHours) ?? tiers[tiers.length - 1];
  return { penalty: tier.penalty, reason: tier.reason };
}

/**
 * Часов до начала смены. Время смены хранится без зоны и заведено в московском,
 * а сервер живёт в UTC — поэтому зону проставляем явно, иначе разница уезжает
 * на три часа и штраф считается не по той ступени.
 */
export function hoursUntilShift(date: string, startTime: string | null | undefined): number {
  // «09:00» и «09:00:00» оба приводим к HH:MM:SS.
  const [h = "00", m = "00", s = "00"] = (startTime || "00:00:00").split(":");
  const start = new Date(`${date}T${h.padStart(2, "0")}:${m}:${s.slice(0, 2) || "00"}+03:00`);

  if (Number.isNaN(start.getTime())) {
    // Время не разобралось — считаем, что смена далеко, чтобы не штрафовать зря.
    console.error(`Cannot parse shift start: ${date} ${startTime}`);
    return Number.POSITIVE_INFINITY;
  }

  return (start.getTime() - Date.now()) / 3_600_000;
}
