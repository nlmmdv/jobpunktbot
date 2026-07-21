// Рейтинг пользователя: средняя оценка из ratings минус накопленные штрафы за
// отмены смен из cancellation_penalties.
//
// Считаем двумя запросами на весь набор id и агрегируем в JS — PostgREST не
// умеет GROUP BY AVG без RPC, а строк мало.

export interface RatingSummary {
  avg_rating: number | null;
  rating_count: number;
}

export const EMPTY_RATING: RatingSummary = { avg_rating: null, rating_count: 0 };

/** База, от которой считаем, пока оценок нет: новый пользователь не «плохой». */
const DEFAULT_RATING = 5;
/** Ниже этого рейтинг не опускается, сколько бы ни было отмен. */
const MIN_RATING = 1;

const round1 = (n: number) => Math.round(n * 10) / 10;

// deno-lint-ignore no-explicit-any
export async function ratingsFor(supabase: any, telegramIds: Array<number | null | undefined>) {
  const ids = [...new Set(telegramIds.filter((x): x is number => Boolean(x)))];
  const result = new Map<number, RatingSummary>();
  if (ids.length === 0) return result;

  const [ratingsRes, penaltiesRes] = await Promise.all([
    supabase.from("ratings").select("to_telegram_id, rating").in("to_telegram_id", ids),
    supabase.from("cancellation_penalties").select("telegram_id, penalty").in("telegram_id", ids),
  ]);

  if (ratingsRes.error) throw ratingsRes.error;
  if (penaltiesRes.error) throw penaltiesRes.error;

  const scores = new Map<number, { sum: number; count: number }>();
  for (const row of ratingsRes.data || []) {
    const cur = scores.get(row.to_telegram_id) || { sum: 0, count: 0 };
    cur.sum += row.rating;
    cur.count += 1;
    scores.set(row.to_telegram_id, cur);
  }

  const penalties = new Map<number, number>();
  for (const row of penaltiesRes.data || []) {
    penalties.set(row.telegram_id, (penalties.get(row.telegram_id) || 0) + Number(row.penalty));
  }

  for (const id of ids) {
    const s = scores.get(id);
    const penalty = penalties.get(id) || 0;

    // Ни оценок, ни штрафов — показываем «нет оценок», а не выдуманную пятёрку.
    if (!s && penalty === 0) {
      result.set(id, { ...EMPTY_RATING });
      continue;
    }

    const base = s ? s.sum / s.count : DEFAULT_RATING;
    result.set(id, {
      avg_rating: round1(Math.max(MIN_RATING, base + penalty)),
      rating_count: s?.count ?? 0,
    });
  }

  return result;
}

/** Рейтинг для одного получателя. */
// deno-lint-ignore no-explicit-any
export async function ratingFor(supabase: any, telegramId: number | null | undefined): Promise<RatingSummary> {
  if (!telegramId) return { ...EMPTY_RATING };
  const map = await ratingsFor(supabase, [telegramId]);
  return map.get(telegramId) || { ...EMPTY_RATING };
}
