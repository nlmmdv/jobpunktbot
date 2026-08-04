// Зеркало политики штрафов из supabase/functions/_shared/cancellation.ts.
// Нужно, чтобы показать размер штрафа ДО подтверждения отмены. Начисляет штраф
// сервер — здесь только предупреждение, значения обязаны совпадать.

export type CancelRole = 'freelancer' | 'owner';

export interface Penalty {
  penalty: number;
  reason: string;
}

const FREELANCER_TIERS = [
  { minHours: 24, penalty: 0, reason: 'Отмена за 24+ часов' },
  { minHours: 12, penalty: -0.5, reason: 'Отмена за 12-24 часа' },
  { minHours: 2, penalty: -1.0, reason: 'Отмена за 2-12 часов' },
  { minHours: -Infinity, penalty: -2.0, reason: 'Отмена менее чем за 2 часа' },
];

const OWNER_TIERS = [
  { minHours: 12, penalty: 0, reason: 'Отмена за 12+ часов' },
  { minHours: -Infinity, penalty: -0.5, reason: 'Отмена менее чем за 12 часов' },
];

export function penaltyFor(role: CancelRole, hoursUntil: number): Penalty {
  const tiers = role === 'freelancer' ? FREELANCER_TIERS : OWNER_TIERS;
  const tier = tiers.find((t) => hoursUntil >= t.minHours) ?? tiers[tiers.length - 1];
  return { penalty: tier.penalty, reason: tier.reason };
}

/**
 * Часов до начала смены. Время смены хранится без зоны и заведено в московском,
 * поэтому зону проставляем явно — иначе у пользователя в другом поясе
 * предупреждение о штрафе разойдётся с тем, что начислит сервер.
 */
export function hoursUntilShift(date: string, startTime?: string | null): number {
  const [h = '00', m = '00', s = '00'] = (startTime || '00:00:00').split(':');
  const start = new Date(`${date}T${h.padStart(2, '0')}:${m}:${s.slice(0, 2) || '00'}+03:00`);
  if (Number.isNaN(start.getTime())) return Number.POSITIVE_INFINITY;
  return (start.getTime() - Date.now()) / 3_600_000;
}

/** «2026-07-20» + «10:00:00» → «20 июля, 10:00 — 22:00» */
export function formatShiftWhen(date?: string | null, start?: string | null, end?: string | null): string {
  if (!date) return '';
  const parsed = new Date(`${date}T00:00:00Z`);
  const day = Number.isNaN(parsed.getTime())
    ? date
    : parsed.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', timeZone: 'UTC' });
  const time = start ? `, ${start.slice(0, 5)} — ${(end || '').slice(0, 5)}` : '';
  return `${day}${time}`;
}
